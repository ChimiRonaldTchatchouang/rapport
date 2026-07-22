"use server";

// ============================================================================
// Activation de licence + création du compte entreprise (Module 1 → 2).
// Opération privilégiée : utilise le client ADMIN (service_role) car elle crée
// une entreprise, un utilisateur auth et met à jour la licence — actions hors
// périmètre RLS d'un visiteur anonyme.
// ============================================================================
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { DUREE_LICENCE_JOURS, statutEffectif } from "@/lib/licence";

function echec(message: string): never {
  redirect(`/activation?error=${encodeURIComponent(message)}`);
}

export async function activerLicence(formData: FormData) {
  const cle = String(formData.get("cle") ?? "").trim().toUpperCase();
  const entrepriseNom = String(formData.get("entreprise_nom") ?? "").trim();
  const managerNom = String(formData.get("manager_nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!cle || !entrepriseNom || !managerNom || !email || password.length < 8) {
    echec("Tous les champs sont requis (mot de passe : 8 caractères minimum).");
  }

  const admin = createAdminClient();

  // 1. Vérifier la licence.
  const { data: licence } = await admin
    .from("licences")
    .select("*")
    .eq("cle_unique", cle)
    .maybeSingle();

  if (!licence) echec("Clé de licence introuvable.");
  if (licence.entreprise_id) echec("Cette licence a déjà été activée.");
  if (statutEffectif(licence) !== "active")
    echec("Cette licence n'est pas active (suspendue, révoquée ou expirée).");

  // 2. Créer l'entreprise.
  const { data: entreprise, error: errEnt } = await admin
    .from("entreprises")
    .insert({ nom: entrepriseNom, contact_email: email })
    .select("id")
    .single();
  if (errEnt || !entreprise) echec("Impossible de créer l'entreprise.");

  // 3. Créer le compte auth du manager.
  const { data: authUser, error: errAuth } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (errAuth || !authUser.user) {
    // Rollback entreprise pour ne pas laisser d'orphelin.
    await admin.from("entreprises").delete().eq("id", entreprise.id);
    echec(
      errAuth?.message?.includes("already")
        ? "Un compte existe déjà avec cet email."
        : "Impossible de créer le compte."
    );
  }

  // 4. Créer le profil manager.
  const { error: errProfil } = await admin.from("utilisateurs").insert({
    id: authUser.user.id,
    entreprise_id: entreprise.id,
    role_systeme: "manager",
    nom: managerNom,
    email,
  });
  if (errProfil) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    await admin.from("entreprises").delete().eq("id", entreprise.id);
    echec("Impossible de finaliser le compte manager.");
  }

  // 5. Activer la licence : rattacher l'entreprise + fixer l'expiration à +1 an.
  const maintenant = new Date();
  const expiration = new Date(maintenant);
  expiration.setDate(expiration.getDate() + DUREE_LICENCE_JOURS);

  await admin
    .from("licences")
    .update({
      entreprise_id: entreprise.id,
      date_activation: maintenant.toISOString(),
      date_expiration: expiration.toISOString(),
      statut: "active",
    })
    .eq("id", licence.id);

  redirect("/login?message=" + encodeURIComponent("Compte créé. Connectez-vous."));
}
