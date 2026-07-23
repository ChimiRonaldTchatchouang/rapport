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

create trigger trg_equipes_updated_at
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
