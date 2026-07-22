"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { navForRole } from "@/components/app/nav-config";
import { ChatWidget } from "@/components/ia/chat-widget";
import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import type { RoleSysteme } from "@/lib/types/database";

const roleLabel: Record<RoleSysteme, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
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
  contexte?: string; // nom de l'entreprise ou "Nextiaa"
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
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider muted">
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
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
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
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
        <Icon.logo width={20} height={20} />
      </span>
      <span className="text-lg font-bold tracking-tight">Rapports</span>
    </div>
  );

  const UserCard = (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-white/10 dark:text-brand-300">
        {initiales || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{nom}</p>
        <p className="muted truncate text-xs">{roleLabel[role]}</p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          title="Se déconnecter"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-white/5"
        >
          <Icon.logout width={18} height={18} />
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col justify-between border-r border-[var(--border)] bg-[var(--surface)] p-4 lg:flex">
        <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto">
          {Brand}
          {NavList}
        </div>
        <div className="pt-4">{UserCard}</div>
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 py-3 backdrop-blur lg:hidden">
        {Brand}
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/5"
          aria-label="Ouvrir le menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col justify-between bg-[var(--surface)] p-4">
            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto">
              <div className="flex items-center justify-between">
                {Brand}
                <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Fermer">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
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
            <p className="muted mb-4 hidden text-sm lg:block">{contexte}</p>
          )}
          {children}
        </div>
      </main>

      {/* Assistant IA flottant — réservé au manager */}
      {role === "manager" && <ChatWidget />}
    </div>
  );
}
