-- ============================================================================
-- Objectifs ciblables par ÉQUIPE (en plus de : rôle métier, ou toute l'entreprise).
-- equipe_id NULL + role_metier_id NULL = objectif pour toute l'entreprise.
-- ============================================================================
alter table public.objectifs
  add column if not exists equipe_id uuid references public.equipes(id) on delete cascade;

create index if not exists idx_objectifs_equipe on public.objectifs(equipe_id);
