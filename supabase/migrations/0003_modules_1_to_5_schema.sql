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
create or replace trigger trg_templates_updated_at
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
