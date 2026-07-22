// ============================================================================
// Templates de rapport pré-construits (Module 2).
// L'entreprise peut les dupliquer et les adapter plutôt que partir de zéro.
// Ce sont des blueprints stockés en code : la duplication insère de vraies
// lignes dans `templates_rapport` + `champs_template` pour l'entreprise.
// ============================================================================
import type { ChampType } from "@/lib/types/rapport";

export type ChampBlueprint = {
  label: string;
  type: ChampType;
  obligatoire: boolean;
  options?: string[];
};

export type TemplateBlueprint = {
  cle: string;
  nom: string;
  description: string;
  metier: string;
  champs: ChampBlueprint[];
};

export const TEMPLATES_PREDEFINIS: TemplateBlueprint[] = [
  {
    cle: "commercial",
    nom: "Rapport Commercial",
    description: "Suivi quotidien de l'activité commerciale.",
    metier: "Commercial",
    champs: [
      { label: "Nombre d'appels passés", type: "nombre", obligatoire: true },
      { label: "Nombre de rendez-vous", type: "nombre", obligatoire: true },
      { label: "Devis envoyés", type: "nombre", obligatoire: false },
      { label: "Ventes conclues (montant)", type: "nombre", obligatoire: false },
      { label: "Clients rencontrés", type: "texte_long", obligatoire: false },
      { label: "Objectifs du jour atteints ?", type: "case_a_cocher", obligatoire: false },
      { label: "Difficultés rencontrées", type: "texte_long", obligatoire: false },
    ],
  },
  {
    cle: "technicien",
    nom: "Rapport Technicien",
    description: "Compte-rendu d'interventions techniques.",
    metier: "Technicien",
    champs: [
      { label: "Interventions réalisées", type: "nombre", obligatoire: true },
      { label: "Type d'intervention", type: "choix_multiple", obligatoire: true, options: ["Installation", "Maintenance", "Réparation", "Diagnostic"] },
      { label: "Lieux d'intervention", type: "texte_long", obligatoire: false },
      { label: "Intervention clôturée ?", type: "case_a_cocher", obligatoire: false },
      { label: "Pièces utilisées", type: "texte_long", obligatoire: false },
      { label: "Temps total (heures)", type: "nombre", obligatoire: false },
      { label: "Remarques", type: "texte_long", obligatoire: false },
    ],
  },
  {
    cle: "livreur",
    nom: "Rapport Livreur",
    description: "Suivi des tournées et livraisons.",
    metier: "Livreur",
    champs: [
      { label: "Livraisons effectuées", type: "nombre", obligatoire: true },
      { label: "Livraisons échouées", type: "nombre", obligatoire: false },
      { label: "Kilomètres parcourus", type: "nombre", obligatoire: false },
      { label: "Incidents", type: "texte_long", obligatoire: false },
      { label: "Tournée terminée à temps ?", type: "case_a_cocher", obligatoire: false },
      { label: "Zone / secteur", type: "texte_court", obligatoire: false },
    ],
  },
  {
    cle: "support",
    nom: "Rapport Support Client",
    description: "Activité du support et satisfaction client.",
    metier: "Support Client",
    champs: [
      { label: "Tickets traités", type: "nombre", obligatoire: true },
      { label: "Tickets résolus", type: "nombre", obligatoire: true },
      { label: "Temps de réponse moyen (min)", type: "nombre", obligatoire: false },
      { label: "Canal principal", type: "choix_multiple", obligatoire: false, options: ["Téléphone", "Email", "Chat", "Réseaux sociaux"] },
      { label: "Retours clients marquants", type: "texte_long", obligatoire: false },
      { label: "Escalades nécessaires", type: "texte_long", obligatoire: false },
    ],
  },
];

export function trouverBlueprint(cle: string): TemplateBlueprint | undefined {
  return TEMPLATES_PREDEFINIS.find((t) => t.cle === cle);
}
