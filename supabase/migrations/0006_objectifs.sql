-- ============================================================================
-- Objectifs hebdomadaires définis par le manager (pour mieux évaluer l'équipe).
-- Injectés dans l'analyse Gemini (critère « résultats vs objectifs »).
-- role_metier_id NULL = objectif pour toute l'entreprise.
-- ============================================================================
create table if not exists public.objectifs (
  id             uuid primary key default gen_random_uuid(),
  entreprise_id  uuid not null references public.entreprises(id) on delete cascade,
  role_metier_id uuid references public.roles_metier(id) on delete cascade,
  periode_debut  date not null,                 -- lundi de la semaine concernée
  contenu        text not null,
  created_by     uuid references public.utilisateurs(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_objectifs_entreprise on public.objectifs(entreprise_id);
create index if not exists idx_objectifs_periode on public.objectifs(periode_debut);

create trigger trg_objectifs_updated_at
  before update on public.objectifs
  for each row execute function public.set_updated_at();

alter table public.objectifs enable row level security;
grant select, insert, update, delete on public.objectifs to authenticated;

-- Lecture : tous les membres de l'entreprise (l'employé voit les objectifs).
create policy "obj_select_membres" on public.objectifs
  for select using (entreprise_id = public.current_entreprise_id());

-- Écriture : manager de l'entreprise uniquement.
create policy "obj_write_manager" on public.objectifs
  for all
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id())
  with check (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());
