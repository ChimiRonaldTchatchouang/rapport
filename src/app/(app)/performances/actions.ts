"use server";

// Déclenchement manuel de l'analyse IA (Module 5). Le manager lance l'agrégation
// hebdomadaire ou mensuelle. Un CRON pourra appeler la même logique (voir README).
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/permissions";
import { genererNotesEntreprise, analyserRapportsEnAttente } from "@/lib/ia/generation";
import { semaine, mois, isoDate } from "@/lib/data/periodes";

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

// Analyse individuelle des rapports non encore analysés (par défaut : aujourd'hui).
export async function analyserRapportsDuJour(formData: FormData) {
  const manager = await requireRole("manager");
  const tout = formData.get("tout") === "1";
  const jour = tout ? undefined : isoDate(new Date());

  let resume;
  try {
    resume = await analyserRapportsEnAttente(manager.entreprise_id!, jour);
  } catch {
    redirect("/performances?error=" + encodeURIComponent("Analyse impossible (clé Gemini configurée ?)."));
  }

  redirect(
    "/performances?message=" +
      encodeURIComponent(
        `${resume.analyses} rapport(s) analysé(s)${resume.erreurs ? `, ${resume.erreurs} erreur(s)` : ""}.`
      )
  );
}
