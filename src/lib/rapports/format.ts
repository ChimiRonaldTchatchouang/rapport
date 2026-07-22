import type { Entreprise, Utilisateur } from "@/lib/types/database";
import type { Rapport, ValeurChamp } from "@/lib/types/rapport";
import { valeurLisible } from "@/lib/types/rapport";
import { formatDateHeure } from "@/lib/utils";

// Échappement HTML minimal (contenu utilisateur inséré dans email/PDF).
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Objet standardisé : "Rapport [Nom de l'employé] - [Date]"
export function objetEmail(nomEmploye: string, date: string | Date): string {
  return `Rapport ${nomEmploye} - ${new Date(date).toLocaleDateString("fr-FR")}`;
}

// Lignes de contenu formatées en HTML (réutilisé email + PDF).
export function contenuEnHtml(contenu: ValeurChamp[]): string {
  return contenu
    .map(
      (c) => `
      <tr>
        <td style="padding:8px 12px;color:#64748b;font-size:13px;border-bottom:1px solid #eef1f6;width:45%;">
          ${escapeHtml(c.label)}
        </td>
        <td style="padding:8px 12px;font-size:14px;font-weight:500;border-bottom:1px solid #eef1f6;">
          ${escapeHtml(valeurLisible(c))}
        </td>
      </tr>`
    )
    .join("");
}

// Email de notification au manager (Module 10.1).
export function emailRapportHtml(params: {
  entreprise: Pick<Entreprise, "nom" | "logo_url">;
  employe: Pick<Utilisateur, "nom" | "email">;
  rapport: Pick<Rapport, "template_nom" | "contenu" | "soumis_at" | "source">;
}): string {
  const { entreprise, employe, rapport } = params;
  const logo = entreprise.logo_url
    ? `<img src="${escapeHtml(entreprise.logo_url)}" alt="" height="36" style="height:36px;" />`
    : `<span style="font-weight:700;font-size:18px;color:#4f46e5;">${escapeHtml(entreprise.nom)}</span>`;

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#eef1f6;padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e7e9f0;">
      <div style="padding:20px 24px;border-bottom:1px solid #eef1f6;display:flex;align-items:center;justify-content:space-between;">
        ${logo}
        <span style="color:#64748b;font-size:12px;">${rapport.source === "email" ? "Reçu par email" : "Soumis via l'app"}</span>
      </div>
      <div style="padding:24px;">
        <h1 style="margin:0 0 4px;font-size:18px;">Nouveau rapport d'activité</h1>
        <p style="margin:0 0 16px;color:#64748b;font-size:14px;">
          <strong>${escapeHtml(employe.nom)}</strong> · ${escapeHtml(rapport.template_nom ?? "Rapport")}<br/>
          ${formatDateHeure(rapport.soumis_at)}
        </p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #eef1f6;border-radius:8px;overflow:hidden;">
          ${contenuEnHtml(rapport.contenu)}
        </table>
      </div>
      <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px;text-align:center;">
        ${escapeHtml(entreprise.nom)} · Rapports by Nextiaa
      </div>
    </div>
  </div>`;
}
