-- ============================================================================
-- Champs : sections + nouveaux types (cases à cocher multiples, échelle 1-5).
-- Permet de reproduire des rapports structurés en sections (ex. rapport Coach).
-- ============================================================================

-- Regroupement des champs par section (ex. « 1 — Qui es-tu ? »).
alter table public.champs_template
  add column if not exists section text;

-- Nouveaux types de champ.
alter table public.champs_template drop constraint if exists champs_template_type_check;
alter table public.champs_template
  add constraint champs_template_type_check check (type in (
    'texte_court', 'texte_long', 'case_a_cocher', 'choix_multiple',
    'cases_multiples', 'nombre', 'date', 'echelle'
  ));
