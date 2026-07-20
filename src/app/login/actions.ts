"use server";

// ============================================================================
// Server Actions d'authentification (connexion / déconnexion).
// ============================================================================
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Email et mot de passe requis.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent("Identifiants invalides.")}` +
        `&redirectTo=${encodeURIComponent(redirectTo)}`
    );
  }

  revalidatePath("/", "layout");
  redirect(redirectTo || "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
