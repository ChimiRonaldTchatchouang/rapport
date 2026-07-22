"use server";

// ============================================================================
// Form builder : templates de rapport & champs (Module 2). Réservé au manager.
// ============================================================================
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/permissions";
import { trouverBlueprint } from "@/lib/templates/prebuilt";
import type { ChampType } from "@/lib/types/rapport";

const TYPES_VALIDES: ChampType[] = [
  "texte_court", "texte_long", "case_a_cocher", "choix_multiple", "nombre", "date",
];

// Duplique un template pré-construit dans l'entreprise.
export async function dupliquerPrebuilt(formData: FormData) {
  const user = await requireRole("manager");
  const supabase = await createClient();
  const bp = trouverBlueprint(String(formData.get("cle")));
  if (!bp) return;

  const { data: template } = await supabase
    .from("templates_rapport")
    .insert({
      entreprise_id: user.entreprise_id,
      nom: bp.nom,
      description: bp.description,
    })
    .select("id")
    .single();
  if (!template) return;

  await supabase.from("champs_template").insert(
    bp.champs.map((c, i) => ({
      template_id: template.id,
      entreprise_id: user.entreprise_id,
      label: c.label,
      type: c.type,
      options: c.options ?? null,
      obligatoire: c.obligatoire,
      ordre: i,
    }))
  );
  revalidatePath("/templates");
  redirect(`/templates/${template.id}`);
}

export async function creerTemplateVide(formData: FormData) {
  const user = await requireRole("manager");
  const supabase = await createClient();
  const nom = String(formData.get("nom") ?? "").trim() || "Nouveau template";
  const { data } = await supabase
    .from("templates_rapport")
    .insert({ entreprise_id: user.entreprise_id, nom })
    .select("id")
    .single();
  revalidatePath("/templates");
  if (data) redirect(`/templates/${data.id}`);
}

export async function supprimerTemplate(formData: FormData) {
  await requireRole("manager");
  const supabase = await createClient();
  await supabase.from("templates_rapport").delete().eq("id", String(formData.get("id")));
  revalidatePath("/templates");
  redirect("/templates");
}

export async function renommerTemplate(formData: FormData) {
  await requireRole("manager");
  const supabase = await createClient();
  await supabase
    .from("templates_rapport")
    .update({
      nom: String(formData.get("nom") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
    })
    .eq("id", String(formData.get("id")));
  revalidatePath(`/templates/${formData.get("id")}`);
}

export async function ajouterChamp(formData: FormData) {
  const user = await requireRole("manager");
  const supabase = await createClient();
  const templateId = String(formData.get("template_id"));
  const type = String(formData.get("type")) as ChampType;
  if (!TYPES_VALIDES.includes(type)) return;

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;

  const optionsBrut = String(formData.get("options") ?? "").trim();
  const options =
    type === "choix_multiple" && optionsBrut
      ? optionsBrut.split(",").map((o) => o.trim()).filter(Boolean)
      : null;

  // ordre = à la fin
  const { count } = await supabase
    .from("champs_template")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);

  await supabase.from("champs_template").insert({
    template_id: templateId,
    entreprise_id: user.entreprise_id,
    label,
    type,
    options,
    obligatoire: formData.get("obligatoire") === "on",
    ordre: count ?? 0,
  });
  revalidatePath(`/templates/${templateId}`);
}

export async function supprimerChamp(formData: FormData) {
  await requireRole("manager");
  const supabase = await createClient();
  const templateId = String(formData.get("template_id"));
  await supabase.from("champs_template").delete().eq("id", String(formData.get("id")));
  revalidatePath(`/templates/${templateId}`);
}

// Déplace un champ vers le haut/bas en échangeant l'ordre avec son voisin.
export async function deplacerChamp(formData: FormData) {
  await requireRole("manager");
  const supabase = await createClient();
  const templateId = String(formData.get("template_id"));
  const id = String(formData.get("id"));
  const direction = String(formData.get("direction")); // "haut" | "bas"

  const { data: champs } = await supabase
    .from("champs_template")
    .select("id, ordre")
    .eq("template_id", templateId)
    .order("ordre", { ascending: true });
  if (!champs) return;

  const idx = champs.findIndex((c) => c.id === id);
  const cible = direction === "haut" ? idx - 1 : idx + 1;
  if (idx < 0 || cible < 0 || cible >= champs.length) return;

  await supabase.from("champs_template").update({ ordre: champs[cible].ordre }).eq("id", champs[idx].id);
  await supabase.from("champs_template").update({ ordre: champs[idx].ordre }).eq("id", champs[cible].id);
  revalidatePath(`/templates/${templateId}`);
}
