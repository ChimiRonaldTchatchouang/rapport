-- ============================================================================
-- Analyse IA par rapport (Module 5 — granularité journalière).
-- Chaque rapport peut être analysé individuellement par Gemini : note /100,
-- avis rédigé et observations. Écrit côté serveur (service_role).
-- ============================================================================
alter table public.rapports
  add column if not exists note          integer check (note between 0 and 100),
  add column if not exists avis          text,
  add column if not exists observations  jsonb not null default '[]',
  add column if not exists analyse_at     timestamptz;
