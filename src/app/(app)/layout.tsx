import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/permissions";
import { AppShell } from "@/components/app/app-shell";

// Layout partagé de l'espace authentifié : injecte l'ossature (sidebar + topbar)
// adaptée au rôle de l'utilisateur.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Contexte affiché (nom de l'entreprise pour un membre, "Nextiaa" pour l'admin).
  let contexte = "Espace Nextiaa";
  if (user.entreprise_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("entreprises")
      .select("nom")
      .eq("id", user.entreprise_id)
      .single();
    contexte = data?.nom ?? "Mon entreprise";
  }

  return (
    <AppShell
      role={user.role_systeme}
      nom={user.nom}
      email={user.email}
      contexte={contexte}
    >
      {children}
    </AppShell>
  );
}
