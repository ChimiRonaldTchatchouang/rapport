// Petit helper de composition de classes CSS (évite une dépendance externe).
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

// Formatage monétaire simple (par défaut en euros, configurable).
export function formatMontant(
  valeur: number,
  devise = "EUR",
  locale = "fr-FR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: devise,
    maximumFractionDigits: 2,
  }).format(valeur);
}

export function formatDate(date: string | Date, locale = "fr-FR"): string {
  return new Date(date).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateHeure(date: string | Date, locale = "fr-FR"): string {
  return new Date(date).toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
