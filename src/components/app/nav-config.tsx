import { Icon } from "@/components/icons";
import type { RoleSysteme } from "@/lib/types/database";

export type NavItem = {
  href: string;
  label: string;
  icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactNode;
};

export type NavSection = { titre?: string; items: NavItem[] };

// Navigation adaptée au rôle système de l'utilisateur.
export function navForRole(role: RoleSysteme): NavSection[] {
  if (role === "super_admin") {
    return [
      {
        items: [
          { href: "/dashboard", label: "Vue d'ensemble", icon: Icon.grid },
          { href: "/admin/licences", label: "Licences", icon: Icon.key },
          { href: "/admin/entreprises", label: "Entreprises", icon: Icon.briefcase },
        ],
      },
    ];
  }

  if (role === "manager") {
    return [
      {
        titre: "Pilotage",
        items: [
          { href: "/dashboard", label: "Tableau de bord", icon: Icon.grid },
          { href: "/performances", label: "Performances", icon: Icon.chart },
          { href: "/rapports", label: "Rapports", icon: Icon.doc },
          { href: "/archives", label: "Archives", icon: Icon.layers },
          { href: "/objectifs", label: "Objectifs", icon: Icon.check },
        ],
      },
      {
        titre: "Organisation",
        items: [
          { href: "/equipe", label: "Employés", icon: Icon.users },
          { href: "/equipes", label: "Équipes", icon: Icon.briefcase },
          { href: "/roles", label: "Rôles métier", icon: Icon.briefcase },
          { href: "/templates", label: "Templates", icon: Icon.layers },
          { href: "/exports", label: "Exports", icon: Icon.download },
          { href: "/parametres", label: "Paramètres", icon: Icon.settings },
        ],
      },
    ];
  }

  if (role === "chef_equipe") {
    return [
      {
        items: [
          { href: "/dashboard", label: "Mon équipe", icon: Icon.grid },
          { href: "/performances", label: "Performances", icon: Icon.chart },
          { href: "/rapports", label: "Rapports", icon: Icon.doc },
          { href: "/archives", label: "Archives", icon: Icon.layers },
        ],
      },
    ];
  }

  // employe
  return [
    {
      items: [
        { href: "/dashboard", label: "Accueil", icon: Icon.grid },
        { href: "/nouveau-rapport", label: "Nouveau rapport", icon: Icon.plus },
        { href: "/mes-rapports", label: "Mes rapports", icon: Icon.doc },
        { href: "/mes-performances", label: "Mes performances", icon: Icon.chart },
      ],
    },
  ];
}
