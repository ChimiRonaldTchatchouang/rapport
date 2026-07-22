// ============================================================================
// Webhook de réception d'emails entrants (Module 10.2).
// Un employé envoie son rapport par email → cet endpoint l'enregistre.
//
// Configuration (voir README) : router les emails entrants d'un domaine dédié
// vers cette URL (Resend Inbound ou service équivalent). La sécurité repose sur
// un token partagé (RESEND_WEBHOOK_SECRET) passé en query (?token=...).
//
// Étapes : identifier l'employé (email expéditeur) → template de son rôle →
// parser le contenu → enregistrer (heure de réception = maintenant) → notifier
// le manager.
// ============================================================================
import { createAdminClient } from "@/lib/supabase/admin";
import { parserEmailVersContenu } from "@/lib/email/inbound";
import { notifierManagerRapport } from "@/lib/email/notifications";
import type { ChampTemplate, TemplateRapport } from "@/lib/types/rapport";

function extraireEmail(from: string): string | null {
  const m = from.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}

export async function POST(req: Request) {
  // Vérification du token partagé.
  const url = new URL(req.url);
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret && url.searchParams.get("token") !== secret) {
    return new Response("Non autorisé", { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("JSON invalide", { status: 400 });
  }

  // Souplesse sur la forme du webhook (Resend encapsule dans `data`).
  const data = (payload.data as Record<string, unknown>) ?? payload;
  const from = String(data.from ?? payload.from ?? "");
  const texte = String(data.text ?? payload.text ?? "");
  const email = extraireEmail(from);
  if (!email) return new Response("Expéditeur inconnu", { status: 400 });

  const admin = createAdminClient();

  // 1. Identifier l'employé.
  const { data: employe } = await admin
    .from("utilisateurs")
    .select("id, entreprise_id, role_metier_id, role_systeme, actif")
    .eq("email", email)
    .eq("role_systeme", "employe")
    .maybeSingle();

  if (!employe || !employe.actif || !employe.role_metier_id) {
    return new Response("Employé non reconnu ou sans rôle", { status: 404 });
  }

  // 2. Template associé au rôle (le premier).
  const { data: rt } = await admin
    .from("role_templates")
    .select("templates_rapport(id, nom)")
    .eq("role_metier_id", employe.role_metier_id)
    .limit(1)
    .maybeSingle();
  const template = (rt as { templates_rapport: Pick<TemplateRapport, "id" | "nom"> | null } | null)
    ?.templates_rapport;
  if (!template) return new Response("Aucun template pour ce rôle", { status: 404 });

  const { data: champsData } = await admin
    .from("champs_template")
    .select("*")
    .eq("template_id", template.id)
    .order("ordre", { ascending: true });
  const champs = (champsData as ChampTemplate[]) ?? [];

  // 3. Parser + enregistrer (source 'email', heure de réception = now()).
  const contenu = parserEmailVersContenu(champs, texte);
  const { data: rapport, error } = await admin
    .from("rapports")
    .insert({
      entreprise_id: employe.entreprise_id,
      employe_id: employe.id,
      template_id: template.id,
      template_nom: template.nom,
      contenu,
      source: "email",
    })
    .select("id")
    .single();

  if (error || !rapport) {
    return new Response("Échec d'enregistrement", { status: 500 });
  }

  // 4. Notifier le manager (best-effort).
  try {
    await notifierManagerRapport(rapport.id);
  } catch {
    /* ignoré */
  }

  return Response.json({ ok: true, rapport_id: rapport.id });
}
