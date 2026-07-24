"use server";

// Objectifs hebdomadaires définis par le manager (Module 5/6).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/permissions";
import { semaine, isoDate } from "@/lib/data/periodes";

export async function definirObjectif(formData: FormData) {
  const manager = await requireRole("manager");
  const supabase = await createClient();

  const contenu = String(formData.get("contenu") ?? "").trim();
  if (!contenu) return;

  const roleMetierId = String(formData.get("role_metier_id") ?? "") || null;
  const equipeId = String(formData.get("equipe_id") ?? "") || null;
  const semaineChoisie = String(formData.get("periode_debut") ?? "");
  const debut = semaineChoisie
    ? isoDate(semaine(new Date(semaineChoisie)).debut)
    : isoDate(semaine(new Date()).debut);

  await supabase.from("objectifs").insert({
    entreprise_id: manager.entreprise_id,
    role_metier_id: roleMetierId,
    equipe_id: equipeId,
    periode_debut: debut,
    contenu,
    created_by: manager.id,
  });
  revalidatePath("/objectifs");
}

export async function supprimerObjectif(formData: FormData) {
  await requireRole("manager");
  const supabase = await createClient();
  await supabase.from("objectifs").delete().eq("id", String(formData.get("id")));
  revalidatePath("/objectifs");
}
