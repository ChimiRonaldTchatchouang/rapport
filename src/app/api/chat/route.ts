// ============================================================================
// API de l'assistant chat Gemini (Module 5). Réservé au manager, scopé à SON
// entreprise. Reçoit la question + l'historique récent, renvoie la réponse.
// ============================================================================
import { getCurrentUser } from "@/lib/auth/permissions";
import { repondreManager, type MessageChat } from "@/lib/ia/chat";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role_systeme !== "manager" || !user.entreprise_id) {
    return new Response("Accès refusé", { status: 403 });
  }

  let body: { question?: string; historique?: MessageChat[] };
  try {
    body = await req.json();
  } catch {
    return new Response("JSON invalide", { status: 400 });
  }

  const question = String(body.question ?? "").trim();
  if (!question) return Response.json({ error: "Question vide." }, { status: 400 });

  try {
    const reponse = await repondreManager(
      user.entreprise_id,
      question,
      Array.isArray(body.historique) ? body.historique : []
    );
    return Response.json({ reponse });
  } catch {
    return Response.json(
      { error: "L'assistant est indisponible (clé Gemini configurée ?)." },
      { status: 500 }
    );
  }
}
