import "server-only";

// ============================================================================
// Helpers d'authentification & de permissions (côté serveur).
// Centralise la récupération de l'utilisateur courant et les vérifications de
// rôle. À utiliser dans les Server Components, Server Actions et Route Handlers.
// ============================================================================
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RoleSysteme, Utilisateur } from "@/lib/types/database";

/**
 * Récupère le profil applicatif de l'utilisateur connecté (ou null).
 * La RLS garantit qu'un utilisateur ne lit que sa propre ligne ici.
 */
export async function getCurrentUser(): Promise<Utilisateur | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profil } = await supabase
    .from("utilisateurs")
    .select("*")
    .eq("id", user.id)
    .single();

  return (profil as Utilisateur) ?? null;
}

/**
 * Exige un utilisateur connecté ; redirige vers /login sinon.
 */
export async function requireUser(): Promise<Utilisateur> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Exige un utilisateur connecté ET l'un des rôles système autorisés.
 * Redirige vers /login (non connecté) ou /dashboard (rôle insuffisant).
 */
export async function requireRole(
  ...roles: RoleSysteme[]
): Promise<Utilisateur> {
  const user = await requireUser();
  if (!roles.includes(user.role_systeme)) {
    redirect("/dashboard");
  }
  return user;
}

export function isSuperAdmin(user: Utilisateur | null): boolean {
  return user?.role_systeme === "super_admin";
}

export function isManager(user: Utilisateur | null): boolean {
  return user?.role_systeme === "manager";
}

export function isEmploye(user: Utilisateur | null): boolean {
  return user?.role_systeme === "employe";
}
