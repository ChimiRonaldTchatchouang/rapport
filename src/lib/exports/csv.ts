// Génération de CSV (séparateur ";" — compatible Excel FR). Sans dépendance.

function echapper(valeur: string): string {
  if (/[";\n]/.test(valeur)) {
    return `"${valeur.replace(/"/g, '""')}"`;
  }
  return valeur;
}

export function construireCsv(entetes: string[], lignes: string[][]): string {
  const bom = "﻿"; // BOM pour l'ouverture correcte des accents dans Excel
  const contenu = [entetes, ...lignes]
    .map((ligne) => ligne.map((c) => echapper(c ?? "")).join(";"))
    .join("\r\n");
  return bom + contenu;
}
