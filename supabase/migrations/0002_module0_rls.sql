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
drop policy if exists "ent_select_membres" on public.entreprises;
create policy "ent_select_membres" on public.entreprises
  for select using (id = public.current_entreprise_id());

drop policy if exists "ent_select_super_admin" on public.entreprises;
create policy "ent_select_super_admin" on public.entreprises
  for select using (public.is_super_admin());

-- Création : super_admin (l'onboarding entreprise se fait aussi via service_role)
drop policy if exists "ent_insert_super_admin" on public.entreprises;
create policy "ent_insert_super_admin" on public.entreprises
  for insert with check (public.is_super_admin());

-- Mise à jour : le manager peut éditer les infos de SON entreprise (Module 2)
drop policy if exists "ent_update_manager" on public.entreprises;
create policy "ent_update_manager" on public.entreprises
  for update
  using (public.current_user_role() = 'manager' and id = public.current_entreprise_id())
  with check (id = public.current_entreprise_id());

drop policy if exists "ent_update_super_admin" on public.entreprises;
create policy "ent_update_super_admin" on public.entreprises
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================================
-- ROLES_METIER (configuration interne d'une entreprise)
-- ============================================================================
drop policy if exists "rm_select_membres" on public.roles_metier;
create policy "rm_select_membres" on public.roles_metier
  for select using (entreprise_id = public.current_entreprise_id());

drop policy if exists "rm_select_super_admin" on public.roles_metier;
create policy "rm_select_super_admin" on public.roles_metier
  for select using (public.is_super_admin());

-- Le manager gère les rôles métier de son entreprise (Module 2)
drop policy if exists "rm_insert_manager" on public.roles_metier;
create policy "rm_insert_manager" on public.roles_metier
  for insert
  with check (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());

drop policy if exists "rm_update_manager" on public.roles_metier;
create policy "rm_update_manager" on public.roles_metier
  for update
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id())
  with check (entreprise_id = public.current_entreprise_id());

drop policy if exists "rm_delete_manager" on public.roles_metier;
create policy "rm_delete_manager" on public.roles_metier
  for delete
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());

-- ============================================================================
-- UTILISATEURS
-- ----------------------------------------------------------------------------
-- Plusieurs politiques permissives sont combinées par un OU logique.
-- ============================================================================
-- Lecture : soi-même, OU manager de la même entreprise, OU super_admin
drop policy if exists "util_select_self" on public.utilisateurs;
create policy "util_select_self" on public.utilisateurs
  for select using (id = auth.uid());

drop policy if exists "util_select_manager" on public.utilisateurs;
create policy "util_select_manager" on public.utilisateurs
  for select using (
    public.current_user_role() = 'manager'
    and entreprise_id = public.current_entreprise_id()
  );

drop policy if exists "util_select_super_admin" on public.utilisateurs;
create policy "util_select_super_admin" on public.utilisateurs
  for select using (public.is_super_admin());

-- Création : le manager peut créer des employés dans SON entreprise (Module 3)
-- (la création du compte auth associé se fait côté serveur via service_role)
drop policy if exists "util_insert_manager" on public.utilisateurs;
create policy "util_insert_manager" on public.utilisateurs
  for insert with check (
    public.current_user_role() = 'manager'
    and entreprise_id = public.current_entreprise_id()
  );

drop policy if exists "util_insert_super_admin" on public.utilisateurs;
create policy "util_insert_super_admin" on public.utilisateurs
  for insert with check (public.is_super_admin());

-- Mise à jour : soi-même (le garde-fou empêche l'auto-élévation de privilèges),
-- OU manager sur les utilisateurs de son entreprise, OU super_admin.
drop policy if exists "util_update_self" on public.utilisateurs;
create policy "util_update_self" on public.utilisateurs
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "util_update_manager" on public.utilisateurs;
create policy "util_update_manager" on public.utilisateurs
  for update
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id())
  with check (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());

drop policy if exists "util_update_super_admin" on public.utilisateurs;
create policy "util_update_super_admin" on public.utilisateurs
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- Suppression : super_admin uniquement (les managers désactivent via actif=false)
drop policy if exists "util_delete_super_admin" on public.utilisateurs;
create policy "util_delete_super_admin" on public.utilisateurs
  for delete using (public.is_super_admin());

-- ============================================================================
-- LICENCES
-- ----------------------------------------------------------------------------
-- Gérées par le super_admin. Les membres d'une entreprise peuvent seulement
-- CONSULTER la licence de leur entreprise (indicateur d'expiration, statut).
-- L'activation est une opération privilégiée réalisée côté serveur (service_role).
-- ============================================================================
drop policy if exists "lic_select_super_admin" on public.licences;
create policy "lic_select_super_admin" on public.licences
  for select using (public.is_super_admin());

drop policy if exists "lic_select_membres" on public.licences;
create policy "lic_select_membres" on public.licences
  for select using (entreprise_id = public.current_entreprise_id());

drop policy if exists "lic_insert_super_admin" on public.licences;
create policy "lic_insert_super_admin" on public.licences
  for insert with check (public.is_super_admin());

drop policy if exists "lic_update_super_admin" on public.licences;
create policy "lic_update_super_admin" on public.licences
  for update using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "lic_delete_super_admin" on public.licences;
create policy "lic_delete_super_admin" on public.licences
  for delete using (public.is_super_admin());
