import "server-only";

// ============================================================================
// Orchestration de l'analyse IA agrégée (Module 5).
// Génère/rafraîchit les notes de performance d'une entreprise pour une période.
// Utilise le client ADMIN (écriture dans notes_performance hors RLS client).
// ============================================================================
import { createAdminClient } from "@/lib/supabase/admin";
import { analyserPerformance } from "@/lib/ia/gemini";
import { joursOuvres, isoDate, type Periode } from "@/lib/data/periodes";
import type { Rapport } from "@/lib/types/rapport";

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
