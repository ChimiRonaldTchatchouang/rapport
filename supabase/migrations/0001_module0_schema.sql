-- ============================================================================
-- MODULE 0 — Fondations & Architecture Multi-Tenant
-- Migration 0001 : Schéma de base + fonctions utilitaires
-- ----------------------------------------------------------------------------
-- Stratégie multi-tenant : "shared database, tenant_id + Row Level Security".
-- Chaque table métier porte une colonne `entreprise_id`. L'isolation stricte
-- entre entreprises clientes est garantie au niveau du moteur Postgres par la
-- RLS (voir migration 0002), et non par le seul code applicatif.
-- ============================================================================

-- Extension pour gen_random_uuid() (présente par défaut sur Supabase)
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Fonction utilitaire : mise à jour automatique de updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- TABLE : entreprises
-- Une ligne = une entreprise cliente (un "tenant").
-- ============================================================================
create table if not exists public.entreprises (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null,
  logo_url      text,                 -- utilisé dans les PDF (Module 7)
  contact_email text,
  contact_tel   text,
  adresse       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace trigger trg_entreprises_updated_at
  before update on public.entreprises
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TABLE : roles_metier
-- Rôles internes propres à CHAQUE entreprise (Commercial, Technicien, ...).
-- ============================================================================
create table if not exists public.roles_metier (
  id            uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  nom           text not null,
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Deux rôles métier ne peuvent pas porter le même nom dans une même entreprise
  unique (entreprise_id, nom)
);

create index if not exists idx_roles_metier_entreprise on public.roles_metier(entreprise_id);

create or replace trigger trg_roles_metier_updated_at
  before update on public.roles_metier
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TABLE : utilisateurs (profil applicatif lié à auth.users de Supabase)
-- role_systeme : super_admin | manager | employe
--   - super_admin : équipe Nextiaa, entreprise_id = NULL (n'appartient à aucun tenant)
--   - manager     : administre SON entreprise
--   - employe     : saisit ses propres rapports
-- ============================================================================
create table if not exists public.utilisateurs (
  id             uuid primary key references auth.users(id) on delete cascade,
  entreprise_id  uuid references public.entreprises(id) on delete cascade,
  role_systeme   text not null check (role_systeme in ('super_admin', 'manager', 'employe')),
  nom            text not null,
  email          text not null,
  role_metier_id uuid references public.roles_metier(id) on delete set null,
  manager_id     uuid references public.utilisateurs(id) on delete set null, -- hiérarchie d'équipe
  actif          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Cohérence : un super_admin n'appartient à aucune entreprise,
  -- un manager/employé DOIT appartenir à une entreprise.
  constraint chk_entreprise_selon_role check (
    (role_systeme = 'super_admin' and entreprise_id is null)
    or (role_systeme in ('manager', 'employe') and entreprise_id is not null)
  )
);

create index if not exists idx_utilisateurs_entreprise on public.utilisateurs(entreprise_id);
create index if not exists idx_utilisateurs_role_metier on public.utilisateurs(role_metier_id);
create index if not exists idx_utilisateurs_manager on public.utilisateurs(manager_id);

create or replace trigger trg_utilisateurs_updated_at
  before update on public.utilisateurs
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TABLE : licences
-- Générées par le Super Admin (Module 1). Une licence est activée par une
-- entreprise cliente lors de la création de son compte, ce qui fixe la date
-- d'expiration à 1 an après activation.
-- Statuts : active | expiree | suspendue | revoquee
-- ============================================================================
create table if not exists public.licences (
  id              uuid primary key default gen_random_uuid(),
  cle_unique      text not null unique,
  entreprise_id   uuid references public.entreprises(id) on delete set null, -- NULL tant que non activée
  statut          text not null default 'active'
                    check (statut in ('active', 'expiree', 'suspendue', 'revoquee')),
  date_creation   timestamptz not null default now(),
  date_activation timestamptz,          -- NULL tant que non activée
  date_expiration timestamptz,          -- = date_activation + 1 an
  created_by      uuid references public.utilisateurs(id) on delete set null, -- super admin émetteur
  notes           text,                 -- motif de suspension/révocation, etc.
  updated_at      timestamptz not null default now()
);

create index if not exists idx_licences_entreprise on public.licences(entreprise_id);
create index if not exists idx_licences_statut on public.licences(statut);

create or replace trigger trg_licences_updated_at
  before update on public.licences
  for each row execute function public.set_updated_at();

-- ============================================================================
-- FONCTIONS UTILITAIRES DE SÉCURITÉ (utilisées par les politiques RLS)
-- ----------------------------------------------------------------------------
-- Déclarées SECURITY DEFINER : elles lisent la table `utilisateurs` en
-- contournant la RLS, ce qui évite toute récursion infinie dans les
-- politiques définies SUR la table `utilisateurs` elle-même.
-- ============================================================================

-- Rôle système de l'utilisateur courant (ou NULL si non connecté / inconnu).
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role_systeme from public.utilisateurs where id = auth.uid();
$$;

-- Entreprise (tenant) de l'utilisateur courant.
create or replace function public.current_entreprise_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select entreprise_id from public.utilisateurs where id = auth.uid();
$$;

-- Vrai si l'utilisateur courant est super_admin.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role_systeme = 'super_admin' from public.utilisateurs where id = auth.uid()),
    false
  );
$$;

-- ============================================================================
-- GARDE-FOU : empêche l'élévation de privilèges via l'API cliente.
-- Un utilisateur non-super-admin ne peut PAS modifier son propre rôle système
-- ni changer d'entreprise (protège contre un employé qui se déclarerait admin).
-- ============================================================================
create or replace function public.guard_utilisateur_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Les opérations serveur (clé service_role) et le super_admin ne sont pas bridés.
  if public.is_super_admin() then
    return new;
  end if;

  if new.role_systeme is distinct from old.role_systeme
     or new.entreprise_id is distinct from old.entreprise_id then
    raise exception 'Modification non autorisée du rôle système ou de l''entreprise';
  end if;

  return new;
end;
$$;

create or replace trigger trg_utilisateurs_guard_update
  before update on public.utilisateurs
  for each row execute function public.guard_utilisateur_update();
