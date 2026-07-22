import "server-only";

// ============================================================================
// Parsing d'un email entrant en contenu de rapport (Module 10.2).
//
// FORMAT ATTENDU (validé comme approche par défaut) : une ligne par champ,
// sous la forme « Label du champ : valeur ». L'ordre est libre, la casse et
// les accents sont ignorés pour la correspondance. Tout texte non reconnu est
// conservé dans un champ « Note libre » pour ne rien perdre.
//
// Ce format « semi-structuré » est un bon compromis : simple pour l'employé
// (pas d'app à ouvrir), suffisamment fiable pour alimenter les colonnes du
// template. Une v2 pourrait déléguer l'extraction à Gemini pour du texte 100%
// libre — voir README.
// ============================================================================
import type { ChampTemplate, ValeurChamp } from "@/lib/types/rapport";

function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .toLowerCase()
    .trim();
}

export function parserEmailVersContenu(
  champs: ChampTemplate[],
  texte: string
): ValeurChamp[] {
  const lignes = texte.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Index label normalisé -> valeur brute extraite.
  const valeursParLabel = new Map<string, string>();
  const lignesNonReconnues: string[] = [];

  for (const ligne of lignes) {
    const sep = ligne.indexOf(":");
    if (sep === -1) {
      lignesNonReconnues.push(ligne);
      continue;
    }
    const label = normaliser(ligne.slice(0, sep));
    const valeur = ligne.slice(sep + 1).trim();
    if (label) valeursParLabel.set(label, valeur);
    else lignesNonReconnues.push(ligne);
  }

  const contenu: ValeurChamp[] = champs.map((c) => {
    const brut = valeursParLabel.get(normaliser(c.label));
    let valeur: ValeurChamp["valeur"] = null;
    if (brut !== undefined && brut !== "") {
      if (c.type === "nombre") {
        const n = Number(brut.replace(",", "."));
        valeur = Number.isNaN(n) ? null : n;
      } else if (c.type === "case_a_cocher") {
        valeur = /^(oui|yes|true|1|x)$/i.test(brut);
      } else {
        valeur = brut;
      }
    }
    return { champ_id: c.id, label: c.label, type: c.type, valeur };
  });

  // Conserver le texte non reconnu (traçabilité).
  if (lignesNonReconnues.length > 0) {
    contenu.push({
      champ_id: "__note_libre__",
      label: "Note libre (email)",
      type: "texte_long",
      valeur: lignesNonReconnues.join("\n"),
    });
  }

  return contenu;
}
