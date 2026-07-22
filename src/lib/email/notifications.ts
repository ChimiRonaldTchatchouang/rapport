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
