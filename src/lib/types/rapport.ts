// Types du domaine "rapport" (Modules 2, 4, 5).

export type ChampType =
  | "texte_court"
  | "texte_long"
  | "case_a_cocher"
  | "choix_multiple"
  | "nombre"
  | "date";

export const LABEL_TYPE_CHAMP: Record<ChampType, string> = {
  texte_court: "Texte court",
  texte_long: "Texte long",
  case_a_cocher: "Case à cocher",
  choix_multiple: "Choix multiple",
  nombre: "Nombre",
  date: "Date",
};

export interface TemplateRapport {
  id: string;
  entreprise_id: string;
  nom: string;
  description: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChampTemplate {
  id: string;
  template_id: string;
  entreprise_id: string;
  label: string;
  type: ChampType;
  options: string[] | null;
  obligatoire: boolean;
  ordre: number;
  created_at: string;
}

// Instantané d'une valeur de champ, stocké dans rapports.contenu (JSONB).
export interface ValeurChamp {
  champ_id: string;
  label: string;
  type: ChampType;
  valeur: string | number | boolean | null;
}

export interface Rapport {
  id: string;
  entreprise_id: string;
  employe_id: string;
  template_id: string | null;
  template_nom: string | null;
  contenu: ValeurChamp[];
  source: "app" | "email";
  similaire_precedent: boolean;
  soumis_at: string;
  created_at: string;
  // Analyse IA par rapport (Module 5 — granularité journalière)
  note: number | null;
  avis: string | null;
  observations: string[];
  analyse_at: string | null;
}

export interface NotePerformance {
  id: string;
  entreprise_id: string;
  employe_id: string;
  periode_type: "hebdomadaire" | "mensuel";
  periode_debut: string;
  periode_fin: string;
  note: number;
  observations: string[];
  initiatives: string[];
  nb_rapports: number;
  genere_at: string;
}

// Rendu lisible d'une valeur de champ (PDF, email, tableau).
export function valeurLisible(v: ValeurChamp): string {
  if (v.valeur === null || v.valeur === "") return "—";
  if (v.type === "case_a_cocher") return v.valeur ? "Oui" : "Non";
  return String(v.valeur);
}
