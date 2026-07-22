-- ============================================================================
-- SETUP COMPLET — à coller en une fois dans Supabase > SQL Editor.
-- Concaténation des migrations 0001 → 0004 (source de vérité : dossier migrations/).
-- Idempotent au niveau des tables (IF NOT EXISTS) ; à exécuter sur une base neuve.
-- ============================================================================

-- >>>>> 0001_module0_schema.sql <<<<<
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

create trigger trg_entreprises_updated_at
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

create trigger trg_roles_metier_updated_at
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

create trigger trg_utilisateurs_updated_at
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

create trigger trg_licences_updated_at
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

create trigger trg_utilisateurs_guard_update
  before update on public.utilisateurs
  for each row execute function public.guard_utilisateur_update();

-- >>>>> 0002_module0_rls.sql <<<<<
-- ============================================================================
-- MODULE 0 — Migration 0002 : Row Level Security (isolation multi-tenant)
-- ----------------------------------------------------------------------------
-- Règles générales :
--   * super_admin : gestion des licences et des entreprises. Il NE VOIT PAS le
--     contenu des rapports (décision de confidentialité — tables ajoutées aux
--     modules suivants ne lui donneront aucun accès en lecture au contenu).
--   * manager     : accès aux données de SON entreprise uniquement.
--   * employe     : accès à SES propres données uniquement.
--
-- La clé `service_role` (utilisée côté serveur pour l'onboarding/activation)
-- contourne la RLS : les opérations privilégiées passent par là.
-- ============================================================================

-- Activation de la RLS sur toutes les tables
alter table public.entreprises   enable row level security;
alter table public.roles_metier  enable row level security;
alter table public.utilisateurs  enable row level security;
alter table public.licences      enable row level security;

-- Privilèges de base pour le rôle `authenticated` (la RLS filtre ensuite les lignes)
grant select, insert, update, delete on public.entreprises  to authenticated;
grant select, insert, update, delete on public.roles_metier to authenticated;
grant select, insert, update, delete on public.utilisateurs to authenticated;
grant select, insert, update, delete on public.licences     to authenticated;

-- ============================================================================
-- ENTREPRISES
-- ============================================================================
-- Lecture : membres de l'entreprise + super_admin
create policy "ent_select_membres" on public.entreprises
  for select using (id = public.current_entreprise_id());

create policy "ent_select_super_admin" on public.entreprises
  for select using (public.is_super_admin());

-- Création : super_admin (l'onboarding entreprise se fait aussi via service_role)
create policy "ent_insert_super_admin" on public.entreprises
  for insert with check (public.is_super_admin());

-- Mise à jour : le manager peut éditer les infos de SON entreprise (Module 2)
create policy "ent_update_manager" on public.entreprises
  for update
  using (public.current_user_role() = 'manager' and id = public.current_entreprise_id())
  with check (id = public.current_entreprise_id());

create policy "ent_update_super_admin" on public.entreprises
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================================
-- ROLES_METIER (configuration interne d'une entreprise)
-- ============================================================================
create policy "rm_select_membres" on public.roles_metier
  for select using (entreprise_id = public.current_entreprise_id());

create policy "rm_select_super_admin" on public.roles_metier
  for select using (public.is_super_admin());

-- Le manager gère les rôles métier de son entreprise (Module 2)
create policy "rm_insert_manager" on public.roles_metier
  for insert
  with check (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());

create policy "rm_update_manager" on public.roles_metier
  for update
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id())
  with check (entreprise_id = public.current_entreprise_id());

create policy "rm_delete_manager" on public.roles_metier
  for delete
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());

-- ============================================================================
-- UTILISATEURS
-- ----------------------------------------------------------------------------
-- Plusieurs politiques permissives sont combinées par un OU logique.
-- ============================================================================
-- Lecture : soi-même, OU manager de la même entreprise, OU super_admin
create policy "util_select_self" on public.utilisateurs
  for select using (id = auth.uid());

create policy "util_select_manager" on public.utilisateurs
  for select using (
    public.current_user_role() = 'manager'
    and entreprise_id = public.current_entreprise_id()
  );

create policy "util_select_super_admin" on public.utilisateurs
  for select using (public.is_super_admin());

-- Création : le manager peut créer des employés dans SON entreprise (Module 3)
-- (la création du compte auth associé se fait côté serveur via service_role)
create policy "util_insert_manager" on public.utilisateurs
  for insert with check (
    public.current_user_role() = 'manager'
    and entreprise_id = public.current_entreprise_id()
  );

create policy "util_insert_super_admin" on public.utilisateurs
  for insert with check (public.is_super_admin());

-- Mise à jour : soi-même (le garde-fou empêche l'auto-élévation de privilèges),
-- OU manager sur les utilisateurs de son entreprise, OU super_admin.
create policy "util_update_self" on public.utilisateurs
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "util_update_manager" on public.utilisateurs
  for update
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id())
  with check (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());

create policy "util_update_super_admin" on public.utilisateurs
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- Suppression : super_admin uniquement (les managers désactivent via actif=false)
create policy "util_delete_super_admin" on public.utilisateurs
  for delete using (public.is_super_admin());

-- ============================================================================
-- LICENCES
-- ----------------------------------------------------------------------------
-- Gérées par le super_admin. Les membres d'une entreprise peuvent seulement
-- CONSULTER la licence de leur entreprise (indicateur d'expiration, statut).
-- L'activation est une opération privilégiée réalisée côté serveur (service_role).
-- ============================================================================
create policy "lic_select_super_admin" on public.licences
  for select using (public.is_super_admin());

create policy "lic_select_membres" on public.licences
  for select using (entreprise_id = public.current_entreprise_id());

create policy "lic_insert_super_admin" on public.licences
  for insert with check (public.is_super_admin());

create policy "lic_update_super_admin" on public.licences
  for update using (public.is_super_admin()) with check (public.is_super_admin());

create policy "lic_delete_super_admin" on public.licences
  for delete using (public.is_super_admin());

-- >>>>> 0003_modules_1_to_5_schema.sql <<<<<
-- ============================================================================
-- Schéma des Modules 1 → 5
--   M1 : licences (colonnes d'entreprise cible)
--   M2 : templates de rapport, champs, association rôle <-> template
--   M4 : rapports soumis (contenu JSONB)
--   M5 : notes de performance (analyse IA agrégée)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MODULE 1 — enrichissement des licences
-- Le Super Admin renseigne l'entreprise cible à la génération ; l'entreprise
-- réelle est créée à l'activation.
-- ---------------------------------------------------------------------------
alter table public.licences
  add column if not exists entreprise_cible_nom text,
  add column if not exists contact_prevu_email  text;

-- ---------------------------------------------------------------------------
-- MODULE 2 — Templates de rapport & champs
-- ---------------------------------------------------------------------------
create table if not exists public.templates_rapport (
  id            uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  nom           text not null,
  description   text,
  actif         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_templates_entreprise on public.templates_rapport(entreprise_id);
create trigger trg_templates_updated_at
  before update on public.templates_rapport
  for each row execute function public.set_updated_at();

-- Champs appartenant à un template (le champ est propre au template).
create table if not exists public.champs_template (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.templates_rapport(id) on delete cascade,
  entreprise_id uuid not null references public.entreprises(id) on delete cascade, -- dénormalisé (RLS)
  label         text not null,
  type          text not null check (type in
                  ('texte_court','texte_long','case_a_cocher','choix_multiple','nombre','date')),
  options       jsonb,                         -- pour 'choix_multiple' : ["A","B",...]
  obligatoire   boolean not null default false,
  ordre         integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_champs_template on public.champs_template(template_id);
create index if not exists idx_champs_entreprise on public.champs_template(entreprise_id);

-- Association rôle métier <-> template (un rôle peut avoir plusieurs templates).
create table if not exists public.role_templates (
  id             uuid primary key default gen_random_uuid(),
  entreprise_id  uuid not null references public.entreprises(id) on delete cascade,
  role_metier_id uuid not null references public.roles_metier(id) on delete cascade,
  template_id    uuid not null references public.templates_rapport(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (role_metier_id, template_id)
);
create index if not exists idx_role_templates_role on public.role_templates(role_metier_id);
create index if not exists idx_role_templates_entreprise on public.role_templates(entreprise_id);

-- ---------------------------------------------------------------------------
-- MODULE 4 — Rapports soumis
-- Le contenu est un instantané JSONB : [{ champ_id, label, type, valeur }].
-- L'heure de soumission est fixée côté serveur (jamais par l'employé).
-- ---------------------------------------------------------------------------
create table if not exists public.rapports (
  id                  uuid primary key default gen_random_uuid(),
  entreprise_id       uuid not null references public.entreprises(id) on delete cascade,
  employe_id          uuid not null references public.utilisateurs(id) on delete cascade,
  template_id         uuid references public.templates_rapport(id) on delete set null,
  template_nom        text,                       -- snapshot du nom au moment de la soumission
  contenu             jsonb not null default '[]', -- [{champ_id,label,type,valeur}]
  source              text not null default 'app' check (source in ('app','email')),
  similaire_precedent boolean not null default false, -- détection copier-coller (Module 4)
  soumis_at           timestamptz not null default now(),
  created_at          timestamptz not null default now()
);
create index if not exists idx_rapports_employe on public.rapports(employe_id);
create index if not exists idx_rapports_entreprise on public.rapports(entreprise_id);
create index if not exists idx_rapports_soumis_at on public.rapports(soumis_at);

-- ---------------------------------------------------------------------------
-- MODULE 5 — Notes de performance (analyse IA agrégée)
-- ---------------------------------------------------------------------------
create table if not exists public.notes_performance (
  id            uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  employe_id    uuid not null references public.utilisateurs(id) on delete cascade,
  periode_type  text not null check (periode_type in ('hebdomadaire','mensuel')),
  periode_debut date not null,
  periode_fin   date not null,
  note          integer not null check (note between 0 and 100),
  observations  jsonb not null default '[]',  -- string[]
  initiatives   jsonb not null default '[]',  -- string[]
  nb_rapports   integer not null default 0,
  genere_at     timestamptz not null default now(),
  unique (employe_id, periode_type, periode_debut)
);
create index if not exists idx_notes_employe on public.notes_performance(employe_id);
create index if not exists idx_notes_entreprise on public.notes_performance(entreprise_id);
create index if not exists idx_notes_periode on public.notes_performance(periode_type, periode_debut);

-- >>>>> 0004_modules_1_to_5_rls.sql <<<<<
-- ============================================================================
-- Row Level Security — Modules 2 → 5
-- Rappel confidentialité : le super_admin n'a AUCUN accès au contenu des
-- rapports (`rapports`) ni aux notes (`notes_performance`).
-- ============================================================================

alter table public.templates_rapport enable row level security;
alter table public.champs_template    enable row level security;
alter table public.role_templates     enable row level security;
alter table public.rapports           enable row level security;
alter table public.notes_performance  enable row level security;

grant select, insert, update, delete on public.templates_rapport to authenticated;
grant select, insert, update, delete on public.champs_template    to authenticated;
grant select, insert, update, delete on public.role_templates     to authenticated;
grant select, insert, update, delete on public.rapports           to authenticated;
grant select, insert, update, delete on public.notes_performance  to authenticated;

-- ---------------------------------------------------------------------------
-- TEMPLATES / CHAMPS / ASSOCIATIONS — lecture par les membres, écriture manager
-- ---------------------------------------------------------------------------
-- templates_rapport
create policy "tpl_select_membres" on public.templates_rapport
  for select using (entreprise_id = public.current_entreprise_id());
create policy "tpl_write_manager" on public.templates_rapport
  for all
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id())
  with check (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());

-- champs_template
create policy "champ_select_membres" on public.champs_template
  for select using (entreprise_id = public.current_entreprise_id());
create policy "champ_write_manager" on public.champs_template
  for all
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id())
  with check (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());

-- role_templates
create policy "rt_select_membres" on public.role_templates
  for select using (entreprise_id = public.current_entreprise_id());
create policy "rt_write_manager" on public.role_templates
  for all
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id())
  with check (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());

-- ---------------------------------------------------------------------------
-- RAPPORTS — employé : ses propres rapports ; manager : ceux de son entreprise.
-- Aucun accès super_admin (confidentialité). Rapports immuables après soumission.
-- ---------------------------------------------------------------------------
create policy "rap_select_self" on public.rapports
  for select using (employe_id = auth.uid());

create policy "rap_select_manager" on public.rapports
  for select using (
    public.current_user_role() = 'manager'
    and entreprise_id = public.current_entreprise_id()
  );

-- L'employé ne peut créer QUE ses propres rapports, dans SON entreprise.
create policy "rap_insert_self" on public.rapports
  for insert with check (
    employe_id = auth.uid()
    and entreprise_id = public.current_entreprise_id()
  );

-- ---------------------------------------------------------------------------
-- NOTES DE PERFORMANCE — employé : ses notes ; manager : celles de l'entreprise.
-- L'insertion se fait côté serveur (job d'analyse via service_role).
-- ---------------------------------------------------------------------------
create policy "note_select_self" on public.notes_performance
  for select using (employe_id = auth.uid());

create policy "note_select_manager" on public.notes_performance
  for select using (
    public.current_user_role() = 'manager'
    and entreprise_id = public.current_entreprise_id()
  );

