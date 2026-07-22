import type { ValeurChamp } from "@/lib/types/rapport";

// ============================================================================
// Détection basique de rapports quasi-identiques (Module 4).
// Objectif : signaler un copier-coller du rapport précédent, pour lutter contre
// la banalisation des rapports. Approche simple et explicable (similarité de
// Jaccard sur les mots), sans dépendance ni appel externe.
// ============================================================================

function normaliserContenu(contenu: ValeurChamp[]): string {
  return contenu
    .map((c) => (c.valeur === null ? "" : String(c.valeur)))
    .join(" ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ensembleMots(texte: string): Set<string> {
  return new Set(texte.split(" ").filter((m) => m.length > 2));
}

// Indice de similarité entre deux contenus (0 = différents, 1 = identiques).
export function scoreSimilarite(a: ValeurChamp[], b: ValeurChamp[]): number {
  const ta = normaliserContenu(a);
  const tb = normaliserContenu(b);
  if (!ta && !tb) return 1;
  if (ta === tb) return 1;

  const sa = ensembleMots(ta);
  const sb = ensembleMots(tb);
  if (sa.size === 0 || sb.size === 0) return ta === tb ? 1 : 0;

  let intersection = 0;
  for (const m of sa) if (sb.has(m)) intersection++;
  const union = sa.size + sb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Seuil au-delà duquel on considère le rapport comme trop similaire.
export const SEUIL_SIMILARITE = 0.9;

export function estTropSimilaire(a: ValeurChamp[], b: ValeurChamp[]): boolean {
  return scoreSimilarite(a, b) >= SEUIL_SIMILARITE;
}
