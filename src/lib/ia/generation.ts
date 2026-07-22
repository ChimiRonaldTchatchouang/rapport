import "server-only";

// ============================================================================
// Orchestration de l'analyse IA agrégée (Module 5).
// Génère/rafraîchit les notes de performance d'une entreprise pour une période.
// Utilise le client ADMIN (écriture dans notes_performance hors RLS client).
// ============================================================================
import { createAdminClient } from "@/lib/supabase/admin";
import { analyserPerformance, analyserRapport } from "@/lib/ia/gemini";
import { joursOuvres, isoDate, type Periode } from "@/lib/data/periodes";
import type { Rapport } from "@/lib/types/rapport";

// ---------------------------------------------------------------------------
// Analyse d'UN rapport et enregistrement sur la ligne (note + avis + observations).
// Best-effort : lève une erreur si Gemini n'est pas configuré (l'appelant gère).
// ---------------------------------------------------------------------------
export async function analyserEtEnregistrerRapport(rapportId: string): Promise<void> {
  const admin = createAdminClient();

  const { data } = await admin.from("rapports").select("*").eq("id", rapportId).single();
  if (!data) return;
  const rapport = data as Rapport;

  const { data: employe } = await admin
    .from("utilisateurs")
    .select("nom, roles_metier(nom)")
    .eq("id", rapport.employe_id)
    .single();

  const emp = employe as { nom: string; roles_metier: { nom: string } | null } | null;

  const avis = await analyserRapport({
    nomEmploye: emp?.nom ?? "Employé",
    roleMetier: emp?.roles_metier?.nom ?? "Employé",
    dateRapport: new Date(rapport.soumis_at).toLocaleDateString("fr-FR"),
    rapport,
  });

  await admin
    .from("rapports")
    .update({
      note: avis.note,
      avis: avis.avis,
      observations: avis.observations,
      analyse_at: new Date().toISOString(),
    })
    .eq("id", rapportId);
}

// Analyse en lot les rapports non encore analysés d'une entreprise (optionnellement
// d'un jour précis). Utilisé par le bouton manager "Analyser les rapports du jour".
export async function analyserRapportsEnAttente(
  entrepriseId: string,
  jour?: string // YYYY-MM-DD
): Promise<{ analyses: number; erreurs: number }> {
  const admin = createAdminClient();
  let q = admin
    .from("rapports")
    .select("id, soumis_at")
    .eq("entreprise_id", entrepriseId)
    .is("analyse_at", null)
    .order("soumis_at", { ascending: true })
    .limit(50);
  if (jour) {
    const fin = new Date(jour);
    fin.setUTCDate(fin.getUTCDate() + 1);
    q = q.gte("soumis_at", jour).lt("soumis_at", isoDate(fin));
  }
  const { data } = await q;
  const rapports = (data as { id: string }[]) ?? [];

  let analyses = 0;
  let erreurs = 0;
  for (const r of rapports) {
    try {
      await analyserEtEnregistrerRapport(r.id);
      analyses++;
    } catch {
      erreurs++;
    }
  }
  return { analyses, erreurs };
}

export interface ResumeGeneration {
  analyses: number;
  ignores: number;
  erreurs: number;
}

export async function genererNotesEntreprise(
  entrepriseId: string,
  periode: Periode
): Promise<ResumeGeneration> {
  const admin = createAdminClient();
  const resume: ResumeGeneration = { analyses: 0, ignores: 0, erreurs: 0 };

  // Employés actifs + leur rôle métier (pour contextualiser l'analyse).
  const { data: employes } = await admin
    .from("utilisateurs")
    .select("id, nom, roles_metier(nom)")
    .eq("entreprise_id", entrepriseId)
    .eq("role_systeme", "employe")
    .eq("actif", true);

  if (!employes) return resume;

  const debut = isoDate(periode.debut);
  const finExclu = new Date(periode.fin);
  finExclu.setUTCDate(finExclu.getUTCDate() + 1);
  const nbJours = joursOuvres(periode.debut, periode.fin);

  for (const emp of employes as unknown as { id: string; nom: string; roles_metier: { nom: string } | null }[]) {
    try {
      const { data: rapportsData } = await admin
        .from("rapports")
        .select("*")
        .eq("employe_id", emp.id)
        .gte("soumis_at", debut)
        .lt("soumis_at", isoDate(finExclu))
        .order("soumis_at", { ascending: true });

      const rapports = (rapportsData as Rapport[]) ?? [];
      if (rapports.length === 0) {
        resume.ignores++;
        continue;
      }

      const resultat = await analyserPerformance({
        nomEmploye: emp.nom,
        roleMetier: emp.roles_metier?.nom ?? "Employé",
        periode: periode.label,
        nbJoursOuvres: nbJours,
        rapports,
      });

      await admin.from("notes_performance").upsert(
        {
          entreprise_id: entrepriseId,
          employe_id: emp.id,
          periode_type: periode.type,
          periode_debut: isoDate(periode.debut),
          periode_fin: isoDate(periode.fin),
          note: resultat.note,
          observations: resultat.observations,
          initiatives: resultat.initiatives,
          nb_rapports: rapports.length,
          genere_at: new Date().toISOString(),
        },
        { onConflict: "employe_id,periode_type,periode_debut" }
      );
      resume.analyses++;
    } catch {
      resume.erreurs++;
    }
  }

  return resume;
}
