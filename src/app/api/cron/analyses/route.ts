// ============================================================================
// Analyse IA agrégée automatique (Module 5) — appelé par un CRON.
//   ?type=hebdomadaire → analyse la semaine écoulée (à programmer le lundi)
//   ?type=mensuel      → analyse le mois écoulé (à programmer le 1er du mois)
// Protégé par CRON_SECRET (header Authorization: Bearer, ou ?token=).
// Exemple de configuration Vercel Cron : voir vercel.json / README.
// ============================================================================
import { createAdminClient } from "@/lib/supabase/admin";
import { genererNotesEntreprise } from "@/lib/ia/generation";
import { semaine, mois } from "@/lib/data/periodes";

function autorise(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const url = new URL(req.url);
  const bearer = req.headers.get("authorization");
  return bearer === `Bearer ${secret}` || url.searchParams.get("token") === secret;
}

export async function GET(req: Request) {
  if (!autorise(req)) return new Response("Non autorisé", { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "mensuel" ? "mensuel" : "hebdomadaire";

  // Période ÉCOULÉE (semaine/mois précédent).
  const ref = new Date();
  if (type === "mensuel") ref.setUTCDate(0); // dernier jour du mois précédent
  else ref.setUTCDate(ref.getUTCDate() - 7);
  const periode = type === "mensuel" ? mois(ref) : semaine(ref);

  const admin = createAdminClient();
  const { data: entreprises } = await admin.from("entreprises").select("id");

  let total = 0;
  for (const e of (entreprises as { id: string }[]) ?? []) {
    try {
      const r = await genererNotesEntreprise(e.id, periode);
      total += r.analyses;
    } catch {
      /* on continue avec les autres entreprises */
    }
  }

  return Response.json({ ok: true, type, periode: periode.label, analyses: total });
}
