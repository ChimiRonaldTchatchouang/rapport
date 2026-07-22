"use server";

// Mise à jour des informations de l'entreprise (Module 2). Manager uniquement.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/permissions";

export async function majEntreprise(formData: FormData) {
  const user = await requireRole("manager");
  const supabase = await createClient();

  await supabase
    .from("entreprises")
    .update({
      nom: String(formData.get("nom") ?? "").trim(),
      logo_url: String(formData.get("logo_url") ?? "").trim() || null,
      contact_email: String(formData.get("contact_email") ?? "").trim() || null,
      contact_tel: String(formData.get("contact_tel") ?? "").trim() || null,
      adresse: String(formData.get("adresse") ?? "").trim() || null,
    })
    .eq("id", user.entreprise_id);

  revalidatePath("/parametres");
}
