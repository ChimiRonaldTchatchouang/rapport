"use server";

// Mise à jour des informations de l'entreprise (Module 2). Manager uniquement.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/permissions";

const BUCKET_LOGOS = "logos";

export async function majEntreprise(formData: FormData) {
  const user = await requireRole("manager");
  const supabase = await createClient();

  await supabase
    .from("entreprises")
    .update({
      nom: String(formData.get("nom") ?? "").trim(),
      contact_email: String(formData.get("contact_email") ?? "").trim() || null,
      contact_tel: String(formData.get("contact_tel") ?? "").trim() || null,
      adresse: String(formData.get("adresse") ?? "").trim() || null,
    })
    .eq("id", user.entreprise_id);

  revalidatePath("/parametres");
}

// Upload d'un fichier image comme logo → Supabase Storage (bucket public).
export async function uploadLogo(formData: FormData) {
  const user = await requireRole("manager");
  const admin = createAdminClient();

  const echec = (m: string): never =>
    redirect(`/parametres?error=${encodeURIComponent(m)}`);

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) echec("Aucun fichier sélectionné.");
  const fichier = file as File;

  if (!fichier.type.startsWith("image/")) echec("Le fichier doit être une image.");
  if (fichier.size > 2 * 1024 * 1024) echec("Image trop lourde (2 Mo maximum).");

  // S'assure que le bucket public existe (best-effort : ignore si déjà créé).
  await admin.storage.createBucket(BUCKET_LOGOS, {
    public: true,
    fileSizeLimit: "2MB",
  }).catch(() => {});

  const ext = fichier.name.split(".").pop()?.toLowerCase() || "png";
  const chemin = `${user.entreprise_id}/${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await fichier.arrayBuffer());

  const { error: errUp } = await admin.storage
    .from(BUCKET_LOGOS)
    .upload(chemin, bytes, { contentType: fichier.type, upsert: true });
  if (errUp) echec("Échec de l'envoi de l'image.");

  const { data: pub } = admin.storage.from(BUCKET_LOGOS).getPublicUrl(chemin);

  await admin
    .from("entreprises")
    .update({ logo_url: pub.publicUrl })
    .eq("id", user.entreprise_id);

  revalidatePath("/parametres");
  redirect("/parametres?message=" + encodeURIComponent("Logo mis à jour."));
}

// Retirer le logo.
export async function supprimerLogo() {
  const user = await requireRole("manager");
  const supabase = await createClient();
  await supabase.from("entreprises").update({ logo_url: null }).eq("id", user.entreprise_id);
  revalidatePath("/parametres");
}
