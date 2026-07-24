// ============================================================================
// Téléchargement PDF binaire d'un rapport (Module 7).
// - Employé : ses propres rapports.
// - Manager : rapports de son entreprise + version ENRICHIE (note + observations).
// La RLS garantit qu'aucun rapport hors périmètre n'est renvoyé.
// ============================================================================
import { getCurrentUser } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { genererPdfRapport } from "@/lib/pdf/generer";
import type { NotePerformance, Rapport, ValeurChamp } from "@/lib/types/rapport";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Non autorisé", { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase.from("rapports").select("*").eq("id", id).maybeSingle();
  if (!data) return new Response("Rapport introuvable", { status: 404 });
  const rapport = data as Rapport;

  const [{ data: employe }, { data: entreprise }] = await Promise.all([
    supabase.from("utilisateurs").select("nom, email").eq("id", rapport.employe_id).maybeSingle(),
    supabase
      .from("entreprises")
      .select("nom, logo_url, contact_email, contact_tel, adresse")
      .eq("id", rapport.entreprise_id)
      .maybeSingle(),
  ]);

  // Version enrichie pour le manager : note de la période couvrant le rapport.
  let note: NotePerformance | null = null;
  if (user.role_systeme === "manager") {
    const d = rapport.soumis_at.slice(0, 10);
    const { data: n } = await supabase
      .from("notes_performance")
      .select("*")
      .eq("employe_id", rapport.employe_id)
      .lte("periode_debut", d)
      .gte("periode_fin", d)
      .order("periode_type", { ascending: true })
      .limit(1)
      .maybeSingle();
    note = (n as NotePerformance) ?? null;
  }

  let pdf: Uint8Array;
  try {
    pdf = await genererPdfRapport({
      rapport: { template_nom: rapport.template_nom, contenu: rapport.contenu as ValeurChamp[], soumis_at: rapport.soumis_at },
      employe: employe ?? { nom: "Employé", email: "" },
      entreprise: entreprise ?? { nom: "Entreprise", logo_url: null, contact_email: null, contact_tel: null, adresse: null },
      note,
    });
  } catch (e) {
    console.error("[pdf] génération échouée:", e);
    return new Response("Erreur lors de la génération du PDF.", { status: 500 });
  }

  // Nom de fichier ASCII (évite les soucis d'en-tête HTTP).
  const nomAscii = (employe?.nom ?? "employe")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-");
  const nomFichier = `rapport-${nomAscii}-${rapport.soumis_at.slice(0, 10)}.pdf`;

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
    },
  });
}
