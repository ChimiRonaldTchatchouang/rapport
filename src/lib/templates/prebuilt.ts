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
  section?: string;
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

// Rapport structuré en sections avec cases multiples et échelle (ex. terrain).
const S1 = "1 — Identification";
const S2 = "2 — Tes chiffres du jour";
const S3 = "3 — Réceptions & relances";
const S4 = "4 — Conformité";
const S5 = "5 — Bilan & état";

TEMPLATES_PREDEFINIS.push({
  cle: "coach_terrain",
  nom: "Rapport Quotidien Coach",
  description: "Rapport terrain complet en 5 sections (agence / commercial).",
  metier: "Coach",
  champs: [
    { section: S1, label: "Ton nom complet", type: "texte_court", obligatoire: true },
    { section: S1, label: "Ton agence", type: "choix_multiple", obligatoire: true, options: ["DLA1", "DLA2", "YDE1", "YDE2"] },
    { section: S1, label: "Date du rapport", type: "date", obligatoire: true },

    { section: S2, label: "Nouveaux contacts générés aujourd'hui (WhatsApp + terrain)", type: "nombre", obligatoire: true },
    { section: S2, label: "RDV agence fixés et confirmés", type: "nombre", obligatoire: true },
    { section: S2, label: "Réceptions tenues en agence", type: "nombre", obligatoire: true },
    { section: S2, label: "Relances effectuées (J+1 / J+7 / J+14 / J+30)", type: "nombre", obligatoire: true },
    { section: S2, label: "Billets d'avion vendus ou orientés", type: "nombre", obligatoire: true },
    { section: S2, label: "Prospects orientés vers le financement", type: "nombre", obligatoire: true },

    { section: S3, label: "Noms des prospects reçus en agence (un par ligne)", type: "texte_long", obligatoire: true },
    { section: S3, label: "Statut de chaque prospect reçu", type: "cases_multiples", obligatoire: true, options: ["Chaud — RDV de suivi fixé", "Tiède — à relancer J+7", "Froid — flyer laissé", "Proforma remis", "En attente de documents"] },
    { section: S3, label: "Résultat global de tes relances", type: "choix_multiple", obligatoire: true, options: ["Positif — intérêts confirmés", "Mitigé — quelques réponses", "Sans réponse", "Aucune relance effectuée"] },

    { section: S4, label: "As-tu mis à jour le CRM avec toutes tes interactions ?", type: "choix_multiple", obligatoire: true, options: ["Oui — avant 19h00", "Oui — après 19h00", "Non"] },
    { section: S4, label: "As-tu envoyé les rappels J+1 le matin (08h-10h) ?", type: "choix_multiple", obligatoire: true, options: ["Oui — dans le créneau", "Oui — hors créneau", "Non", "Aucun rappel à envoyer"] },
    { section: S4, label: "As-tu fait une promesse de résultat garanti à un client ?", type: "choix_multiple", obligatoire: true, options: ["Non — aucune promesse faite", "Oui — à signaler"] },
    { section: S4, label: "Y a-t-il un incident ou une anomalie à signaler ?", type: "choix_multiple", obligatoire: true, options: ["Non — aucun incident", "Oui — client mécontent", "Oui — problème dossier", "Oui — conflit équipe", "Oui — autre"] },

    { section: S5, label: "En 2 phrases : ce qui s'est bien passé aujourd'hui", type: "texte_long", obligatoire: true },
    { section: S5, label: "En 1 phrase : ta principale difficulté ou l'incident du jour", type: "texte_long", obligatoire: true },
    { section: S5, label: "Mon niveau d'énergie aujourd'hui", type: "echelle", obligatoire: true, options: ["Épuisé(e)", "En pleine forme"] },
    { section: S5, label: "Statut global de ma journée", type: "choix_multiple", obligatoire: true, options: ["Objectifs atteints ✅", "Objectifs partiels 🟡", "Journée difficile — besoin de soutien 🔴"] },
    { section: S5, label: "Je certifie que toutes les informations déclarées sont exactes et complètes.", type: "case_a_cocher", obligatoire: true },
  ],
});

export function trouverBlueprint(cle: string): TemplateBlueprint | undefined {
  return TEMPLATES_PREDEFINIS.find((t) => t.cle === cle);
}
