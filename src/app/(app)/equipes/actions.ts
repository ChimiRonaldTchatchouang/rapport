"use server";

// Gestion des équipes (manager général uniquement).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/permissions";

export async function creerEquipe(formData: FormData) {
  const manager = await requireRole("manager");
  const supabase = await createClient();
  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return;
  await supabase.from("equipes").insert({ entreprise_id: manager.entreprise_id, nom });
  revalidatePath("/equipes");
}

// Désigne le chef d'une équipe : met à jour equipes.chef_id ET rattache le chef
// à l'équipe (equipe_id) pour que son accès soit bien scopé.
export async function assignerChef(formData: FormData) {
  await requireRole("manager");
  const supabase = await createClient();
  const equipeId = String(formData.get("equipe_id"));
  const chefId = String(formData.get("chef_id")) || null;

  await supabase.from("equipes").update({ chef_id: chefId }).eq("id", equipeId);
  if (chefId) {
    await supabase.from("utilisateurs").update({ equipe_id: equipeId }).eq("id", chefId);
  }
  revalidatePath("/equipes");
}

export async function supprimerEquipe(formData: FormData) {
  await requireRole("manager");
  const supabase = await createClient();
  await supabase.from("equipes").delete().eq("id", String(formData.get("id")));
  revalidatePath("/equipes");
}
