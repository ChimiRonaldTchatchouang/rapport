"use server";

// ============================================================================
// Soumission d'un rapport (Module 4).
// - L'heure de soumission est fixée CÔTÉ SERVEUR (jamais par l'employé).
// - Détection basique de rapport quasi-identique au précédent (anti copier-coller).
// - Notifie le manager par email (Module 10.1) en best-effort.
// ============================================================================
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/permissions";
import { estTropSimilaire } from "@/lib/rapports/similarity";
import { notifierManagerRapport } from "@/lib/email/notifications";
import { analyserEtEnregistrerRapport } from "@/lib/ia/generation";
import type { ChampTemplate, ValeurChamp } from "@/lib/types/rapport";

export async function soumettreRapport(formData: FormData) {
  const employe = await requireRole("employe");
  const supabase = await createClient();
  const templateId = String(formData.get("template_id"));

  // Charge le template + ses champs (RLS : membre de l'entreprise).
  const { data: template } = await supabase
    .from("templates_rapport")
    .select("id, nom, entreprise_id")
    .eq("id", templateId)
    .maybeSingle();
  if (!template) redirect("/nouveau-rapport?error=Template introuvable");

  const { data: champsData } = await supabase
    .from("champs_template")
    .select("*")
    .eq("template_id", templateId)
    .order("ordre", { ascending: true });
  const champs = (champsData as ChampTemplate[]) ?? [];

  // Construit le contenu (snapshot label+type+valeur).
  const contenu: ValeurChamp[] = champs.map((c) => {
    const brut = formData.get(`champ_${c.id}`);
    let valeur: ValeurChamp["valeur"] = null;
    if (c.type === "case_a_cocher") valeur = brut === "on";
    else if (c.type === "nombre") valeur = brut ? Number(brut) : null;
    else valeur = brut ? String(brut) : null;
    return { champ_id: c.id, label: c.label, type: c.type, valeur };
  });

  // Détection de similarité avec le dernier rapport de l'employé sur ce template.
  const { data: precedent } = await supabase
    .from("rapports")
    .select("contenu")
    .eq("employe_id", employe.id)
    .eq("template_id", templateId)
    .order("soumis_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const similaire = precedent
    ? estTropSimilaire(contenu, precedent.contenu as ValeurChamp[])
    : false;

  // Si l'employé n'a pas confirmé malgré l'alerte de similarité, on le renvoie.
  if (similaire && formData.get("confirmer_similaire") !== "1") {
    redirect(`/nouveau-rapport?template=${templateId}&similaire=1`);
  }

  // Insertion — soumis_at pris par défaut côté serveur (now()).
  const { data: rapport, error } = await supabase
    .from("rapports")
    .insert({
      entreprise_id: employe.entreprise_id,
      employe_id: employe.id,
      template_id: templateId,
      template_nom: template.nom,
      contenu,
      source: "app",
      similaire_precedent: similaire,
    })
    .select("id")
    .single();

  if (error || !rapport) {
    redirect("/nouveau-rapport?error=" + encodeURIComponent("Échec de l'enregistrement."));
  }

  // Analyse IA du rapport (best-effort : ne bloque pas la soumission).
  try {
    await analyserEtEnregistrerRapport(rapport.id);
  } catch {
    // Ignoré : l'analyse pourra être relancée manuellement par le manager.
  }

  // Notification email au manager (best-effort : n'échoue pas la soumission).
  try {
    await notifierManagerRapport(rapport.id);
  } catch {
    // Ignoré volontairement : l'email ne doit pas bloquer la soumission.
  }

  redirect("/mes-rapports?message=" + encodeURIComponent("Rapport soumis avec succès ✓"));
}
