import "server-only";

// ============================================================================
// Notification email au manager après soumission d'un rapport (Module 10.1).
// Utilise le client ADMIN car il faut lire l'email du manager (hors RLS employé).
// ============================================================================
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail, type EmailAttachment } from "@/lib/email/resend";
import { emailRapportHtml, objetEmail } from "@/lib/rapports/format";
import { genererPdfRapport } from "@/lib/pdf/generer";
import type { Rapport, ValeurChamp } from "@/lib/types/rapport";

/**
 * Envoie ses accès à un nouvel utilisateur (identifiants + lien de connexion).
 * Best-effort : lève une erreur si l'email n'est pas configuré (l'appelant gère).
 */
export async function envoyerAccesUtilisateur(params: {
  email: string;
  nom: string;
  motDePasse: string;
  role: "chef_equipe" | "employe";
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const loginUrl = `${appUrl}/login`;
  const roleLabel = params.role === "chef_equipe" ? "Chef d'équipe" : "Employé";

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#eef1f6;padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e7e9f0;overflow:hidden;">
      <div style="background:#4f46e5;padding:20px 24px;color:#fff;">
        <h1 style="margin:0;font-size:18px;">Bienvenue sur Rapports</h1>
      </div>
      <div style="padding:24px;color:#0f172a;">
        <p style="margin:0 0 16px;">Bonjour <strong>${escapeHtmlLite(params.nom)}</strong>,</p>
        <p style="margin:0 0 16px;">Un compte <strong>${roleLabel}</strong> a été créé pour vous. Voici vos accès :</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:8px 0;color:#64748b;">Email</td><td style="padding:8px 0;font-weight:600;">${escapeHtmlLite(params.email)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Mot de passe</td><td style="padding:8px 0;font-weight:600;">${escapeHtmlLite(params.motDePasse)}</td></tr>
        </table>
        <a href="${loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">Se connecter</a>
        <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;">Nous vous conseillons de changer votre mot de passe après la première connexion.</p>
      </div>
    </div>
  </div>`;

  await envoyerEmail({ to: params.email, subject: "Vos accès à Rapports", html });
}

function escapeHtmlLite(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Envoie au manager un email récapitulatif du rapport soumis.
 * Best-effort : lève une erreur si l'email n'est pas configuré (l'appelant
 * l'attrape pour ne pas bloquer la soumission).
 */
export async function notifierManagerRapport(rapportId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: rapport } = await admin
    .from("rapports")
    .select("*")
    .eq("id", rapportId)
    .single();
  if (!rapport) return;

  const r = rapport as Rapport;

  const [{ data: employe }, { data: entreprise }] = await Promise.all([
    admin.from("utilisateurs").select("nom, email, manager_id").eq("id", r.employe_id).single(),
    admin
      .from("entreprises")
      .select("nom, logo_url, contact_email, contact_tel, adresse")
      .eq("id", r.entreprise_id)
      .single(),
  ]);
  if (!employe || !entreprise) return;

  // Destinataire : le manager assigné, sinon tout manager de l'entreprise.
  let managerEmail: string | null = null;
  if (employe.manager_id) {
    const { data: m } = await admin
      .from("utilisateurs")
      .select("email")
      .eq("id", employe.manager_id)
      .maybeSingle();
    managerEmail = m?.email ?? null;
  }
  if (!managerEmail) {
    const { data: m } = await admin
      .from("utilisateurs")
      .select("email")
      .eq("entreprise_id", r.entreprise_id)
      .eq("role_systeme", "manager")
      .limit(1)
      .maybeSingle();
    managerEmail = m?.email ?? null;
  }
  if (!managerEmail) {
    console.warn(`[email] aucun manager trouvé pour l'entreprise ${r.entreprise_id}`);
    return;
  }

  // Génère le PDF du rapport en pièce jointe (best-effort).
  let attachments: EmailAttachment[] | undefined;
  try {
    const pdf = await genererPdfRapport({
      rapport: { template_nom: r.template_nom, contenu: r.contenu as ValeurChamp[], soumis_at: r.soumis_at },
      employe,
      entreprise,
    });
    const nomFichier = `rapport-${employe.nom.replace(/\s+/g, "-")}-${r.soumis_at.slice(0, 10)}.pdf`;
    attachments = [{ filename: nomFichier, content: Buffer.from(pdf).toString("base64") }];
  } catch (e) {
    console.error("[pdf] génération de la pièce jointe échouée:", e);
  }

  await envoyerEmail({
    to: managerEmail,
    subject: objetEmail(employe.nom, r.soumis_at),
    html: emailRapportHtml({
      entreprise,
      employe,
      rapport: {
        template_nom: r.template_nom,
        contenu: r.contenu as ValeurChamp[],
        soumis_at: r.soumis_at,
        source: r.source,
      },
    }),
    attachments,
  });
}
