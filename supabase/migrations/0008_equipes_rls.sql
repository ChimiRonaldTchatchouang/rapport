-- ============================================================================
-- RLS des équipes + accès scopé "chef d'équipe".
-- Le chef d'équipe voit uniquement les membres et données de SON équipe.
-- ============================================================================

alter table public.equipes enable row level security;
grant select, insert, update, delete on public.equipes to authenticated;

-- Équipes : lecture par les membres de l'entreprise, écriture par le manager général.
create policy "eq_select_membres" on public.equipes
  for select using (entreprise_id = public.current_entreprise_id());
create policy "eq_write_manager" on public.equipes
  for all
  using (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id())
  with check (public.current_user_role() = 'manager' and entreprise_id = public.current_entreprise_id());

-- Utilisateurs : le chef d'équipe voit les membres de SON équipe.
create policy "util_select_chef" on public.utilisateurs
  for select using (
    public.current_user_role() = 'chef_equipe'
    and equipe_id is not null
    and equipe_id = public.current_equipe_id()
  );

-- Rapports : le chef d'équipe voit ceux des membres de son équipe.
create policy "rap_select_chef" on public.rapports
  for select using (
    public.current_user_role() = 'chef_equipe'
    and public.employe_dans_mon_equipe(employe_id)
  );

-- Notes de performance : idem, scopées à l'équipe.
create policy "note_select_chef" on public.notes_performance
  for select using (
    public.current_user_role() = 'chef_equipe'
    and public.employe_dans_mon_equipe(employe_id)
  );

-- Les tables de configuration (templates, champs, rôles métier, objectifs) sont
-- déjà lisibles par tous les membres de l'entreprise via leurs policies
-- "..._select_membres" (entreprise_id = current_entreprise_id()), ce qui couvre
-- le chef d'équipe en lecture seule. L'écriture reste réservée au manager général.
