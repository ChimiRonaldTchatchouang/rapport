// ============================================================================
// Agrégation des réponses d'un template façon "résumé Google Forms".
// Pour chaque champ, produit soit une distribution (répartition des réponses),
// soit des statistiques numériques, soit un décompte de réponses texte.
// ============================================================================
import type { ChampTemplate, ValeurChamp } from "@/lib/types/rapport";

export type AnalyseChamp = {
  champId: string;
  label: string;
  type: ChampTemplate["type"];
  section: string | null;
  nbReponses: number;
  kind: "distribution" | "nombre" | "texte";
  distribution?: { label: string; value: number }[];
  total?: number;
  moyenne?: number;
  exemples?: string[];
};

// contenus : liste des `contenu` (ValeurChamp[]) de chaque rapport.
export function analyserReponses(
  champs: ChampTemplate[],
  contenus: ValeurChamp[][]
): AnalyseChamp[] {
  return champs.map((champ) => {
    const valeurs = contenus
      .map((c) => c.find((v) => v.champ_id === champ.id)?.valeur)
      .filter((v) => v !== undefined && v !== null && v !== "");

    const base = {
      champId: champ.id,
      label: champ.label,
      type: champ.type,
      section: champ.section,
      nbReponses: valeurs.length,
    };

    // Distribution : choix unique, case oui/non, cases multiples, échelle.
    if (champ.type === "choix_multiple") {
      const options = champ.options ?? [];
      const counts = new Map<string, number>(options.map((o) => [o, 0]));
      for (const v of valeurs) {
        const k = String(v);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      return { ...base, kind: "distribution" as const, distribution: [...counts].map(([label, value]) => ({ label, value })) };
    }

    if (champ.type === "case_a_cocher") {
      let oui = 0, non = 0;
      for (const v of valeurs) (v === true || v === "true" ? oui++ : non++);
      return { ...base, kind: "distribution" as const, distribution: [{ label: "Oui", value: oui }, { label: "Non", value: non }] };
    }

    if (champ.type === "cases_multiples") {
      const options = champ.options ?? [];
      const counts = new Map<string, number>(options.map((o) => [o, 0]));
      for (const v of valeurs) {
        const arr = Array.isArray(v) ? v : [String(v)];
        for (const opt of arr) counts.set(opt, (counts.get(opt) ?? 0) + 1);
      }
      return { ...base, kind: "distribution" as const, distribution: [...counts].map(([label, value]) => ({ label, value })) };
    }

    if (champ.type === "echelle") {
      const counts = new Map<string, number>([1, 2, 3, 4, 5].map((n) => [String(n), 0]));
      let somme = 0;
      for (const v of valeurs) {
        const n = Number(v);
        if (!Number.isNaN(n)) {
          counts.set(String(n), (counts.get(String(n)) ?? 0) + 1);
          somme += n;
        }
      }
      const moyenne = valeurs.length ? Math.round((somme / valeurs.length) * 10) / 10 : 0;
      return { ...base, kind: "distribution" as const, moyenne, distribution: [...counts].map(([label, value]) => ({ label, value })) };
    }

    if (champ.type === "nombre") {
      const nums = valeurs.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
      const total = nums.reduce((a, n) => a + n, 0);
      const moyenne = nums.length ? Math.round((total / nums.length) * 10) / 10 : 0;
      return { ...base, kind: "nombre" as const, total, moyenne };
    }

    // texte_court, texte_long, date : décompte + quelques exemples.
    return {
      ...base,
      kind: "texte" as const,
      exemples: valeurs.slice(0, 3).map((v) => String(v)),
    };
  });
}
