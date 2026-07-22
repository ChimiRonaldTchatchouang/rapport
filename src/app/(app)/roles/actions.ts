"use server";

// Gestion des rôles métier (Module 2/3). Réservé au manager (RLS + garde).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/permissions";

export async function creerRole(formData: FormData) {
  const user = await requireRole("manager");
  const supabase = await createClient();
  const nom = String(formData.get("nom") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!nom) return;

  await supabase.from("roles_metier").insert({
    entreprise_id: user.entreprise_id,
    nom,
    description: description || null,
  });
  revalidatePath("/roles");
}

export async function supprimerRole(formData: FormData) {
  await requireRole("manager");
  const supabase = await createClient();
  await supabase.from("roles_metier").delete().eq("id", String(formData.get("id")));
  revalidatePath("/roles");
}

// Associe un ensemble de templates à un rôle (remplace les associations existantes).
export async function associerTemplates(formData: FormData) {
  const user = await requireRole("manager");
  const supabase = await createClient();
  const roleId = String(formData.get("role_id"));
  const templateIds = formData.getAll("template_ids").map(String);

  await supabase.from("role_templates").delete().eq("role_metier_id", roleId);
  if (templateIds.length > 0) {
    await supabase.from("role_templates").insert(
      templateIds.map((tid) => ({
        entreprise_id: user.entreprise_id,
        role_metier_id: roleId,
        template_id: tid,
      }))
    );
  }
  revalidatePath("/roles");
}
