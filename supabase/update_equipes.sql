-- ============================================================================
-- MISE À JOUR — équipes & chefs d'équipe (migrations 0007 + 0008).
-- À exécuter si vous avez DÉJÀ appliqué 0001→0006.
-- Idempotent : ré-exécutable sans erreur.
-- ============================================================================

-- >>>>> 0007_equipes.sql <<<<<
-- ============================================================================
-- Équipes & rôle "chef d'équipe" (manager d'équipe).
-- - manager      : manager général (voit toute l'entreprise) — inchangé.
-- - chef_equipe  : voit UNIQUEMENT son équipe (membres, rapports, perfs).
-- ============================================================================

-- Nouveau rôle système : on élargit la contrainte.
alter table public.utilisateurs drop constraint if exists utilisateurs_role_systeme_check;
alter table public.utilisateurs
  add constraint utilisateurs_role_systeme_check
  check (role_systeme in ('super_admin', 'manager', 'chef_equipe', 'employe'));

-- Cohérence entreprise/rôle : chef_equipe appartient à une entreprise.
alter table public.utilisateurs drop constraint if exists chk_entreprise_selon_role;
alter table public.utilisateurs
  add constraint chk_entreprise_selon_role check (
    (role_systeme = 'super_admin' and entreprise_id is null)
    or (role_systeme in ('manager', 'chef_equipe', 'employe') and entreprise_id is not null)
  );

-- Table des équipes.
create table if not exists public.equipes (
  id            uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  nom           text not null,
  chef_id       uuid references public.utilisateurs(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (entreprise_id, nom)
);
create index if not exists idx_equipes_entreprise on public.equipes(entreprise_id);

create or replace trigger trg_equipes_updated_at
  before update on public.equipes
  for each row execute function public.set_updated_at();

-- Rattachement d'un utilisateur à une équipe (employés ET chefs).
alter table public.utilisateurs
  add column if not exists equipe_id uuid references public.equipes(id) on delete set null;
create index if not exists idx_utilisateurs_equipe on public.utilisateurs(equipe_id);

-- ---------------------------------------------------------------------------
-- Fonctions utilitaires (SECURITY DEFINER) pour la RLS scopée par équipe.
-- ---------------------------------------------------------------------------
create or replace function public.current_equipe_id()
returns uuid language sql stable security definer set search_path = public as $$
  select equipe_id from public.utilisateurs where id = auth.uid();
$$;

-- Vrai si `emp` appartient à la même équipe que l'utilisateur courant.
create or replace function public.employe_dans_mon_equipe(emp uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.utilisateurs u
    where u.id = emp
      and u.equipe_id is not null
      and u.equipe_id = (select equipe_id from public.utilisateurs where id = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Mise à jour du garde-fou : les opérations serveur (service_role, auth.uid()
-- NULL) et le super_admin peuvent modifier rôle/entreprise ; les autres non.
-- Permet au manager général de promouvoir un employé en chef via le serveur.
-- ---------------------------------------------------------------------------
create or replace function public.guard_utilisateur_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_super_admin() then
    return new;
  end if;
  if new.role_systeme is distinct from old.role_systeme
     or new.entreprise_id is distinct from old.entreprise_id then
    raise exception 'Modification non autorisée du rôle système ou de l''entreprise';
  end if;
  return new;
end;
$$;

-- >>>>> 0008_equipes_rls.sql <<<<<
-- ============================================================================
-- RLS des équipes + accès scopé "chef d'équipe".
-- Le chef d'équipe voit uniquement les membres et données de SON équipe.
-- ============================================================================

alter table public.equipes enable row level security;
grant select, insert, update, delete on public.equipes to authenticated;

-- Équipes : lecture par les membres de l'entreprise, écriture par le manager général.
drop policy if exists "eq_select_membres" on public.equipes;
create policy "eq_select_membres" on public.equipes
  for select using (entreprise_id = public.current_entreprise_id());
drop policy if exists "eq_write_manager" on public.equipes;
create policy "eq_write_manager" on public.equipes
  for all
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id())
  with check (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());

-- Utilisateurs : le chef d'équipe voit les membres de SON équipe.
drop policy if exists "util_select_chef" on public.utilisateurs;
create policy "util_select_chef" on public.utilisateurs
  for select using (
    public.current_user_role() = 'chef_equipe'
    and equipe_id is not null
    and equipe_id = public.current_equipe_id()
  );

-- Rapports : le chef d'équipe voit ceux des membres de son équipe.
drop policy if exists "rap_select_chef" on public.rapports;
create policy "rap_select_chef" on public.rapports
  for select using (
    public.current_user_role() = 'chef_equipe'
    and public.employe_dans_mon_equipe(employe_id)
  );

-- Notes de performance : idem, scopées à l'équipe.
drop policy if exists "note_select_chef" on public.notes_performance;
create policy "note_select_chef" on public.notes_performance
  for select using (
    public.current_user_role() = 'chef_equipe'
    and public.employe_dans_mon_equipe(employe_id)
  );

-- Les tables de configuration (templates, champs, rôles métier, objectifs) sont
-- déjà lisibles par tous les membres de l'entreprise via leurs policies
-- "..._select_membres" (entreprise_id = current_entreprise_id()), ce qui couvre
-- le chef d'équipe en lecture seule. L'écriture reste réservée au manager général.

-- >>>>> 0009_objectifs_equipe.sql <<<<<
-- ============================================================================
-- Objectifs ciblables par ÉQUIPE (en plus de : rôle métier, ou toute l'entreprise).
-- equipe_id NULL + role_metier_id NULL = objectif pour toute l'entreprise.
-- ============================================================================
alter table public.objectifs
  add column if not exists equipe_id uuid references public.equipes(id) on delete cascade;

create index if not exists idx_objectifs_equipe on public.objectifs(equipe_id);

