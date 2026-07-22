// ============================================================================
// Critères de notation FIXES (Module 5).
// Source unique de vérité : utilisée à la fois dans le prompt Gemini ET
// affichée dans l'interface (carte "Critères de notation"). Garantit que la
// note reste comparable entre employés et dans le temps.
// ============================================================================

export interface CritereNotation {
  cle: string;
  label: string;
  poids: number; // sur 100
  description: string;
}

export const CRITERES_NOTATION: CritereNotation[] = [
  {
    cle: "completude",
    label: "Complétude du rapport",
    poids: 35,
    description:
      "Les champs sont-ils remplis sérieusement, avec un niveau de détail utile ?",
  },
  {
    cle: "regularite",
    label: "Régularité de soumission",
    poids: 30,
    description:
      "Le rapport est-il soumis à temps et de façon régulière ? (pour une analyse journalière : rapport bien rempli du jour)",
  },
  {
    cle: "resultats",
    label: "Résultats vs objectifs",
    poids: 35,
    description:
      "Les résultats déclarés reflètent-ils une activité productive et des objectifs atteints ?",
  },
];

// Rendu texte des critères pour l'injection dans le prompt Gemini.
export function criteresPourPrompt(): string {
  return CRITERES_NOTATION.map(
    (c) => `- ${c.label} (0-${c.poids}) : ${c.description}`
  ).join("\n");
}
