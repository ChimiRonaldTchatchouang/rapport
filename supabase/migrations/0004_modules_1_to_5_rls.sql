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
drop policy if exists "tpl_select_membres" on public.templates_rapport;
create policy "tpl_select_membres" on public.templates_rapport
  for select using (entreprise_id = public.current_entreprise_id());
drop policy if exists "tpl_write_manager" on public.templates_rapport;
create policy "tpl_write_manager" on public.templates_rapport
  for all
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id())
  with check (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());

-- champs_template
drop policy if exists "champ_select_membres" on public.champs_template;
create policy "champ_select_membres" on public.champs_template
  for select using (entreprise_id = public.current_entreprise_id());
drop policy if exists "champ_write_manager" on public.champs_template;
create policy "champ_write_manager" on public.champs_template
  for all
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id())
  with check (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());

-- role_templates
drop policy if exists "rt_select_membres" on public.role_templates;
create policy "rt_select_membres" on public.role_templates
  for select using (entreprise_id = public.current_entreprise_id());
drop policy if exists "rt_write_manager" on public.role_templates;
create policy "rt_write_manager" on public.role_templates
  for all
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id())
  with check (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());

-- ---------------------------------------------------------------------------
-- RAPPORTS — employé : ses propres rapports ; manager : ceux de son entreprise.
-- Aucun accès super_admin (confidentialité). Rapports immuables après soumission.
-- ---------------------------------------------------------------------------
drop policy if exists "rap_select_self" on public.rapports;
create policy "rap_select_self" on public.rapports
  for select using (employe_id = auth.uid());

drop policy if exists "rap_select_manager" on public.rapports;
create policy "rap_select_manager" on public.rapports
  for select using (
    public.current_user_role() = 'manager'
    and entreprise_id = public.current_entreprise_id()
  );

-- L'employé ne peut créer QUE ses propres rapports, dans SON entreprise.
drop policy if exists "rap_insert_self" on public.rapports;
create policy "rap_insert_self" on public.rapports
  for insert with check (
    employe_id = auth.uid()
    and entreprise_id = public.current_entreprise_id()
  );

-- ---------------------------------------------------------------------------
-- NOTES DE PERFORMANCE — employé : ses notes ; manager : celles de l'entreprise.
-- L'insertion se fait côté serveur (job d'analyse via service_role).
-- ---------------------------------------------------------------------------
drop policy if exists "note_select_self" on public.notes_performance;
create policy "note_select_self" on public.notes_performance
  for select using (employe_id = auth.uid());

drop policy if exists "note_select_manager" on public.notes_performance;
create policy "note_select_manager" on public.notes_performance
  for select using (
    public.current_user_role() = 'manager'
    and entreprise_id = public.current_entreprise_id()
  );
