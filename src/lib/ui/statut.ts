import type { StatutLicence } from "@/lib/types/database";

// Mappe un statut de licence vers un variant de Badge shadcn.
export function badgeStatut(
  statut: StatutLicence
): "success" | "warning" | "destructive" | "secondary" {
  switch (statut) {
    case "active":
      return "success";
    case "expiree":
      return "warning";
    case "revoquee":
      return "destructive";
    case "suspendue":
      return "secondary";
  }
}
