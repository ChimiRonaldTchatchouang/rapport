import { requireUser } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { SuperAdminDashboard } from "./_super-admin";
import { ManagerDashboard } from "./_manager";
import { EmployeDashboard } from "./_employe";

// Tableau de bord adaptatif selon le rôle système.
export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role_systeme === "super_admin") return <SuperAdminDashboard />;
  // Le chef d'équipe réutilise le tableau de bord manager : la RLS restreint
  // automatiquement les données à sa seule équipe.
  if (user.role_systeme === "manager" || user.role_systeme === "chef_equipe")
    return <ManagerDashboard user={user} />;
  if (user.role_systeme === "employe") return <EmployeDashboard user={user} />;

  redirect("/login");
}
