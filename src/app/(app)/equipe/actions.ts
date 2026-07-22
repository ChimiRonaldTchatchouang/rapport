"use server";

// ============================================================================
// Gestion des employés (Module 3). Le manager crée/administre les comptes.
// La création du compte auth nécessite le client ADMIN (service_role).
// ============================================================================
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/permissions";

export async function creerEmploye(formData: FormData) {
  const manager = await requireRole("manager");
  const admin = createAdminClient();

  const nom = String(formData.get("nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleMetierId = String(formData.get("role_metier_id") ?? "") || null;

  const echec = (m: string): never => redirect(`/equipe?error=${encodeURIComponent(m)}`);

  if (!nom || !email || password.length < 8) {
    echec("Champs invalides (mot de passe : 8 caractères minimum).");
  }

  const { data: authUser, error: errAuth } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (errAuth || !authUser.user) {
    echec("Impossible de créer le compte (email déjà utilisé ?).");
  }
  const compte = authUser.user!;

  const { error: errProfil } = await admin.from("utilisateurs").insert({
    id: compte.id,
    entreprise_id: manager.entreprise_id,
    role_systeme: "employe",
    nom,
    email,
    role_metier_id: roleMetierId,
    manager_id: manager.id,
  });
  if (errProfil) {
    await admin.auth.admin.deleteUser(compte.id);
    echec("Impossible de créer le profil employé.");
  }

  revalidatePath("/equipe");
  redirect("/equipe?message=" + encodeURIComponent(`Employé ${nom} créé.`));
}

// Réassigne le rôle métier d'un employé (RLS : manager de la même entreprise).
export async function reassignerRole(formData: FormData) {
  await requireRole("manager");
  const supabase = await createClient();
  await supabase
    .from("utilisateurs")
    .update({ role_metier_id: String(formData.get("role_metier_id")) || null })
    .eq("id", String(formData.get("employe_id")));
  revalidatePath("/equipe");
}

export async function basculerActif(formData: FormData) {
  await requireRole("manager");
  const supabase = await createClient();
  await supabase
    .from("utilisateurs")
    .update({ actif: formData.get("actif") === "true" })
    .eq("id", String(formData.get("employe_id")));
  revalidatePath("/equipe");
}
