"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { Icon } from "@/components/icons";
import { navForRole } from "@/components/app/nav-config";
import { ChatWidget } from "@/components/ia/chat-widget";
import { WelcomeTour } from "@/components/onboarding/welcome-tour";
import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import type { RoleSysteme } from "@/lib/types/database";

const roleLabel: Record<RoleSysteme, string> = {
  super_admin: "Super Admin",
  manager: "Manager général",
  chef_equipe: "Chef d'équipe",
  employe: "Employé",
};

export function AppShell({
  role,
  nom,
  email,
  contexte,
  children,
}: {
  role: RoleSysteme;
  nom: string;
  email: string;
  contexte?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const sections = navForRole(role);

  const initiales = nom
    .split(" ")
    .map((m) => m[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const NavList = (
    <nav className="flex flex-col gap-6">
      {sections.map((section, i) => (
        <div key={i}>
          {section.titre && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.titre}
            </p>
          )}
          <ul className="space-y-1">
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon width={18} height={18} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const Brand = (
    <div className="flex items-center gap-2 px-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Icon.logo width={20} height={20} />
      </span>
      <span className="text-lg font-bold tracking-tight">Rapports</span>
    </div>
  );

  const UserCard = (
    <div className="flex items-center gap-3 rounded-lg border p-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
        {initiales || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{nom}</p>
        <p className="truncate text-xs text-muted-foreground">{roleLabel[role]}</p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          title="Se déconnecter"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
        >
          <LogOut className="size-[18px]" />
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col justify-between border-r bg-card p-4 lg:flex">
        <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto">
          {Brand}
          {NavList}
        </div>
        <div className="pt-4">{UserCard}</div>
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
        {Brand}
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-2 hover:bg-accent"
          aria-label="Ouvrir le menu"
        >
          <Menu className="size-6" />
        </button>
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col justify-between border-r bg-card p-4">
            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto">
              <div className="flex items-center justify-between">
                {Brand}
                <button onClick={() => setOpen(false)} className="rounded-md p-2 hover:bg-accent" aria-label="Fermer">
                  <X className="size-5" />
                </button>
              </div>
              {NavList}
            </div>
            <div className="pt-4">{UserCard}</div>
          </aside>
        </div>
      )}

      {/* Contenu */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {contexte && (
            <p className="mb-4 hidden text-sm text-muted-foreground lg:block">{contexte}</p>
          )}
          {children}
        </div>
      </main>

      {role === "manager" && <ChatWidget />}
      <WelcomeTour role={role} />
    </div>
  );
}
