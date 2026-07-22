import type { Licence, StatutLicence } from "@/lib/types/database";

// ============================================================================
// Utilitaires de licence (Module 1)
// ============================================================================

// Clé opaque lisible : NEXTIAA-XXXX-XXXX-XXXX (sans caractères ambigus).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function genererCleLicence(): string {
  const bloc = () =>
    Array.from({ length: 4 }, () =>
      ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    ).join("");
  return `NEXTIAA-${bloc()}-${bloc()}-${bloc()}`;
}

export const DUREE_LICENCE_JOURS = 365;

// Nombre de jours avant expiration (négatif si déjà expirée). null si non activée.
export function joursAvantExpiration(licence: Pick<Licence, "date_expiration">): number | null {
  if (!licence.date_expiration) return null;
  return Math.ceil(
    (new Date(licence.date_expiration).getTime() - Date.now()) / 86_400_000
  );
}

// Statut "effectif" tenant compte de la date (une licence active mais dépassée
// est considérée expirée). N'écrit pas en base : simple calcul d'affichage.
export function statutEffectif(licence: Pick<Licence, "statut" | "date_expiration">): StatutLicence {
  if (licence.statut !== "active") return licence.statut;
  const jours = joursAvantExpiration(licence);
  if (jours !== null && jours < 0) return "expiree";
  return "active";
}

// Une licence permet-elle l'accès à la plateforme ? (validée à chaque connexion)
export function licenceValide(licence: Pick<Licence, "statut" | "date_expiration"> | null): boolean {
  if (!licence) return false;
  return statutEffectif(licence) === "active";
}

export const LABEL_STATUT: Record<StatutLicence, string> = {
  active: "Active",
  expiree: "Expirée",
  suspendue: "Suspendue",
  revoquee: "Révoquée",
};

export function toneStatut(statut: StatutLicence): "success" | "warning" | "danger" | "neutral" {
  switch (statut) {
    case "active":
      return "success";
    case "expiree":
      return "warning";
    case "suspendue":
      return "neutral";
    case "revoquee":
      return "danger";
  }
}
