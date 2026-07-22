// ============================================================================
// Export CSV des rapports (Module 8).
// Approche retenue : UN CSV PAR TEMPLATE → colonnes propres et cohérentes
// (les rôles ayant des templates différents ne mélangent pas leurs colonnes).
// Réservé au manager, limité à SON entreprise (RLS + contrôle de rôle).
// ============================================================================
import { getCurrentUser } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { construireCsv } from "@/lib/exports/csv";
import { valeurLisible, type Rapport, type ValeurChamp } from "@/lib/types/rapport";
import { formatDateHeure } from "@/lib/utils";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role_systeme !== "manager") {
    return new Response("Accès refusé", { status: 403 });
  }

  const url = new URL(req.url);
  const templateId = url.searchParams.get("template");
  const debut = url.searchParams.get("debut"); // YYYY-MM-DD (optionnel)
  const fin = url.searchParams.get("fin");
  if (!templateId) return new Response("Template requis", { status: 400 });

  const supabase = await createClient();

  let q = supabase
    .from("rapports")
    .select("*, utilisateurs(nom)")
    .eq("entreprise_id", user.entreprise_id)
    .eq("template_id", templateId)
    .order("soumis_at", { ascending: true });
  if (debut) q = q.gte("soumis_at", debut);
  if (fin) {
    const finJour = new Date(fin);
    finJour.setDate(finJour.getDate() + 1);
    q = q.lt("soumis_at", finJour.toISOString().slice(0, 10));
  }

  const { data } = await q;
  const rapports = (data as unknown as (Rapport & { utilisateurs: { nom: string } | null })[]) ?? [];

  // Union ordonnée des labels rencontrés (robuste aux évolutions du template).
  const labels: string[] = [];
  for (const r of rapports) {
    for (const c of r.contenu as ValeurChamp[]) {
      if (!labels.includes(c.label)) labels.push(c.label);
    }
  }

  const entetes = ["Employé", "Date de soumission", "Source", ...labels];
  const lignes = rapports.map((r) => {
    const parLabel = new Map((r.contenu as ValeurChamp[]).map((c) => [c.label, valeurLisible(c)]));
    return [
      r.utilisateurs?.nom ?? "",
      formatDateHeure(r.soumis_at),
      r.source,
      ...labels.map((l) => parLabel.get(l) ?? ""), // "" = champ non applicable
    ];
  });

  const csv = construireCsv(entetes, lignes);
  const nomFichier = `rapports_${templateId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
    },
  });
}
