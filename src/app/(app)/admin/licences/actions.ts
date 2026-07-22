"use server";

// ============================================================================
// Actions Super Admin sur les licences (Module 1).
// La RLS autorise ces opérations pour le rôle super_admin uniquement.
// ============================================================================
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/permissions";
import { genererCleLicence } from "@/lib/licence";
import type { StatutLicence } from "@/lib/types/database";

export async function genererLicence(formData: FormData) {
  const admin = await requireRole("super_admin");
  const supabase = await createClient();

  const entrepriseCible = String(formData.get("entreprise_cible_nom") ?? "").trim();
  const contact = String(formData.get("contact_prevu_email") ?? "").trim();

  // Génère une clé unique (réessaie en cas de collision, très improbable).
  let cle = genererCleLicence();
  for (let i = 0; i < 5; i++) {
    const { data: exist } = await supabase
      .from("licences")
      .select("id")
      .eq("cle_unique", cle)
      .maybeSingle();
    if (!exist) break;
    cle = genererCleLicence();
  }

  await supabase.from("licences").insert({
    cle_unique: cle,
    statut: "active",
    created_by: admin.id,
    entreprise_cible_nom: entrepriseCible || null,
    contact_prevu_email: contact || null,
  });

  revalidatePath("/admin/licences");
}

async function changerStatut(id: string, statut: StatutLicence, motif?: string) {
  await requireRole("super_admin");
  const supabase = await createClient();
  await supabase
    .from("licences")
    .update({ statut, notes: motif ?? null })
    .eq("id", id);
  revalidatePath("/admin/licences");
}

export async function suspendreLicence(formData: FormData) {
  await changerStatut(
    String(formData.get("id")),
    "suspendue",
    String(formData.get("motif") ?? "") || undefined
  );
}

export async function revoquerLicence(formData: FormData) {
  await changerStatut(
    String(formData.get("id")),
    "revoquee",
    String(formData.get("motif") ?? "") || undefined
  );
}

export async function reactiverLicence(formData: FormData) {
  await changerStatut(String(formData.get("id")), "active");
}
