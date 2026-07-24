// ============================================================================
// Types applicatifs alignés sur le schéma Postgres (Module 0).
// À terme, ces types pourront être générés automatiquement avec la CLI Supabase
// (`supabase gen types typescript`). Ils sont maintenus à la main pour l'instant.
// ============================================================================

export type RoleSysteme = "super_admin" | "manager" | "chef_equipe" | "employe";

export type StatutLicence = "active" | "expiree" | "suspendue" | "revoquee";

export interface Entreprise {
  id: string;
  nom: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_tel: string | null;
  adresse: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleMetier {
  id: string;
  entreprise_id: string;
  nom: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Utilisateur {
  id: string;
  entreprise_id: string | null;
  role_systeme: RoleSysteme;
  nom: string;
  email: string;
  role_metier_id: string | null;
  manager_id: string | null;
  equipe_id: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Equipe {
  id: string;
  entreprise_id: string;
  nom: string;
  chef_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Objectif {
  id: string;
  entreprise_id: string;
  role_metier_id: string | null;
  equipe_id: string | null;
  periode_debut: string;
  contenu: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Licence {
  id: string;
  cle_unique: string;
  entreprise_id: string | null;
  statut: StatutLicence;
  date_creation: string;
  date_activation: string | null;
  date_expiration: string | null;
  created_by: string | null;
  notes: string | null;
  entreprise_cible_nom: string | null;
  contact_prevu_email: string | null;
  updated_at: string;
}
