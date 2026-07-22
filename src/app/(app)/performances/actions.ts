"use server";

// Déclenchement manuel de l'analyse IA (Module 5). Le manager lance l'agrégation
// hebdomadaire ou mensuelle. Un CRON pourra appeler la même logique (voir README).
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/permissions";
import { genererNotesEntreprise } from "@/lib/ia/generation";
import { semaine, mois } from "@/lib/data/periodes";

export async function lancerAnalyse(formData: FormData) {
  const manager = await requireRole("manager");
  const type = String(formData.get("type") ?? "hebdomadaire");
  const periode = type === "mensuel" ? mois(new Date()) : semaine(new Date());

  let resume;
  try {
    resume = await genererNotesEntreprise(manager.entreprise_id!, periode);
  } catch {
    redirect("/performances?error=" + encodeURIComponent("Analyse impossible (clé Gemini configurée ?)."));
  }

  redirect(
    "/performances?message=" +
      encodeURIComponent(
        `Analyse ${type} terminée : ${resume.analyses} noté(s), ${resume.ignores} sans rapport, ${resume.erreurs} erreur(s).`
      )
  );
}
