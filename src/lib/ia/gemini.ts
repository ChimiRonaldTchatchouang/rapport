import "server-only";
import type { Rapport, ValeurChamp } from "@/lib/types/rapport";
import { valeurLisible } from "@/lib/types/rapport";

// ============================================================================
// Analyse IA des rapports via l'API Gemini (Module 5).
// - Analyse AGRÉGÉE (hebdo/mensuel) pour maîtriser les coûts d'appel.
// - Critères de notation FIXES pour que la note soit comparable entre employés
//   et dans le temps (voir le prompt ci-dessous).
// - Réponse strictement au format JSON.
// ============================================================================

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

export interface ResultatAnalyse {
  note: number; // 0 à 100
  observations: string[]; // 2-3
  initiatives: string[]; // 1-2
}

// Critères de notation communiqués à Gemini (cohérence dans le temps).
const CRITERES = `
Barème de notation sur 100, réparti ainsi :
- Complétude des rapports (0-35) : les champs sont-ils remplis sérieusement, avec du détail utile ?
- Régularité de soumission (0-30) : l'employé soumet-il ses rapports de façon régulière sur la période ?
- Résultats vs objectifs déclarés (0-35) : les résultats rapportés reflètent-ils une activité productive et des objectifs atteints ?
Applique ce barème de façon stricte et constante.`;

function serialiserRapports(rapports: Rapport[]): string {
  return rapports
    .map((r, i) => {
      const lignes = (r.contenu as ValeurChamp[])
        .map((c) => `  - ${c.label} : ${valeurLisible(c)}`)
        .join("\n");
      return `Rapport ${i + 1} (soumis le ${new Date(r.soumis_at).toLocaleDateString("fr-FR")}) :\n${lignes}`;
    })
    .join("\n\n");
}

function construirePrompt(
  nomEmploye: string,
  roleMetier: string,
  periode: string,
  nbJoursOuvres: number,
  rapports: Rapport[]
): string {
  return `Tu es un analyste RH qui évalue la performance d'un employé à partir de ses rapports d'activité.

Employé : ${nomEmploye}
Rôle : ${roleMetier}
Période analysée : ${periode}
Nombre de rapports soumis : ${rapports.length} sur ${nbJoursOuvres} jours ouvrés attendus.

${CRITERES}

Rapports de la période :
${serialiserRapports(rapports)}

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "note": <entier 0-100>,
  "observations": ["<observation 1>", "<observation 2>", "<observation 3 optionnelle>"],
  "initiatives": ["<initiative concrète 1>", "<initiative concrète 2 optionnelle>"]
}
Les observations sont factuelles et claires. Les initiatives sont des propositions concrètes pour améliorer la vélocité et la productivité. Rédige en français.`;
}

/**
 * Appelle Gemini pour analyser les rapports d'un employé sur une période.
 * Lance une erreur si la clé est absente ou si la réponse est invalide.
 */
export async function analyserPerformance(params: {
  nomEmploye: string;
  roleMetier: string;
  periode: string;
  nbJoursOuvres: number;
  rapports: Rapport[];
}): Promise<ResultatAnalyse> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY manquante.");

  const prompt = construirePrompt(
    params.nomEmploye,
    params.roleMetier,
    params.periode,
    params.nbJoursOuvres,
    params.rapports
  );

  const res = await fetch(GEMINI_URL(GEMINI_MODEL, key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Erreur Gemini (${res.status}) : ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const texte: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return validerResultat(texte);
}

// Parse et valide/normalise la réponse JSON de Gemini.
export function validerResultat(texte: string): ResultatAnalyse {
  let brut: unknown;
  try {
    // Retire d'éventuels blocs ```json ... ```
    const nettoye = texte.replace(/```json|```/g, "").trim();
    brut = JSON.parse(nettoye);
  } catch {
    throw new Error("Réponse Gemini non parsable en JSON.");
  }

  const obj = brut as Record<string, unknown>;
  const note = Math.max(0, Math.min(100, Math.round(Number(obj.note))));
  if (Number.isNaN(note)) throw new Error("Note absente ou invalide.");

  const observations = Array.isArray(obj.observations)
    ? obj.observations.map(String).slice(0, 3)
    : [];
  const initiatives = Array.isArray(obj.initiatives)
    ? obj.initiatives.map(String).slice(0, 2)
    : [];

  return { note, observations, initiatives };
}
