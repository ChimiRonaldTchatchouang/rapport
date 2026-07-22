// ============================================================================
// Utilitaires de période (semaine ISO / mois) pour l'agrégation et l'analyse.
// Toutes les dates sont manipulées en UTC pour rester cohérentes côté serveur.
// ============================================================================

export type Periode = {
  type: "hebdomadaire" | "mensuel";
  debut: Date;
  fin: Date;
  label: string;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export { isoDate };

// Lundi (00:00 UTC) de la semaine contenant `date`.
export function debutSemaine(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jour = (d.getUTCDay() + 6) % 7; // 0 = lundi
  d.setUTCDate(d.getUTCDate() - jour);
  return d;
}

export function semaine(date: Date): Periode {
  const debut = debutSemaine(date);
  const fin = new Date(debut);
  fin.setUTCDate(fin.getUTCDate() + 6);
  return {
    type: "hebdomadaire",
    debut,
    fin,
    label: `Sem. du ${debut.getUTCDate()}/${debut.getUTCMonth() + 1}`,
  };
}

export function mois(date: Date): Periode {
  const debut = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const fin = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  const nomsMois = [
    "Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin",
    "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
  ];
  return {
    type: "mensuel",
    debut,
    fin,
    label: `${nomsMois[debut.getUTCMonth()]} ${debut.getUTCFullYear()}`,
  };
}

// Les N dernières semaines (de la plus ancienne à la plus récente).
export function dernieresSemaines(n: number, ref = new Date()): Periode[] {
  const out: Periode[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref);
    d.setUTCDate(d.getUTCDate() - i * 7);
    out.push(semaine(d));
  }
  return out;
}

// Semaines couvrant l'intervalle [debut, fin] (bornes incluses), plafonnées.
export function semainesEntre(debut: Date, fin: Date, max = 26): Periode[] {
  const out: Periode[] = [];
  let d = debutSemaine(debut);
  const stop = debutSemaine(fin);
  while (d <= stop && out.length < max) {
    out.push(semaine(d));
    const suivant = new Date(d);
    suivant.setUTCDate(suivant.getUTCDate() + 7);
    d = suivant;
  }
  return out.length ? out : [semaine(fin)];
}

// Nombre approximatif de jours ouvrés (lun-ven) dans une période.
export function joursOuvres(debut: Date, fin: Date): number {
  let count = 0;
  const d = new Date(debut);
  while (d <= fin) {
    const jour = d.getUTCDay();
    if (jour !== 0 && jour !== 6) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}
