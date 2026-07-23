"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import type { RoleSysteme } from "@/lib/types/database";

type Etape = { titre: string; texte: string; emoji: string };

// Étapes du tour, adaptées au niveau d'accès de l'utilisateur.
function etapesPour(role: RoleSysteme): Etape[] {
  switch (role) {
    case "super_admin":
      return [
        { emoji: "👋", titre: "Bienvenue, Super Admin", texte: "Vous gérez les licences et les entreprises clientes de la plateforme." },
        { emoji: "🔑", titre: "Générer une licence", texte: "Dans « Licences », créez une clé pour une nouvelle entreprise. Elle est valable 1 an après activation." },
        { emoji: "🏢", titre: "Entreprises", texte: "Suivez les entreprises actives et l'état de leurs licences. Vous ne voyez jamais le contenu de leurs rapports." },
      ];
    case "manager":
      return [
        { emoji: "👋", titre: "Bienvenue !", texte: "Vous êtes manager général : vous pilotez toute l'entreprise." },
        { emoji: "🧩", titre: "1. Configurez", texte: "Créez vos rôles métier et vos templates de rapport, puis assemblez des équipes." },
        { emoji: "👥", titre: "2. Ajoutez vos équipes", texte: "Créez des équipes, désignez un chef d'équipe, et ajoutez les employés. Leurs accès sont envoyés par email." },
        { emoji: "📈", titre: "3. Pilotez la performance", texte: "Le tableau de bord et « Performances » montrent vélocité, régularité et notes IA de vos équipes." },
        { emoji: "✨", titre: "Assistant IA", texte: "La bulle en bas à gauche répond à vos questions sur un employé ou une équipe." },
      ];
    case "chef_equipe":
      return [
        { emoji: "👋", titre: "Bienvenue, chef d'équipe", texte: "Vous suivez uniquement votre équipe." },
        { emoji: "📊", titre: "Votre tableau de bord", texte: "Vélocité, régularité et alertes de vos membres, en un coup d'œil." },
        { emoji: "📄", titre: "Rapports & archives", texte: "Consultez les rapports de votre équipe et leur historique complet." },
      ];
    default: // employe
      return [
        { emoji: "👋", titre: "Bienvenue !", texte: "Ici, vous remplissez vos rapports d'activité en quelques secondes." },
        { emoji: "✍️", titre: "Nouveau rapport", texte: "Cliquez sur « Nouveau rapport » : le formulaire s'adapte à votre rôle." },
        { emoji: "📈", titre: "Vos performances", texte: "Suivez votre note et les retours de l'IA dans « Mes performances »." },
      ];
  }
}

export function WelcomeTour({ role }: { role: RoleSysteme }) {
  const [etape, setEtape] = useState(0);
  const [ouvert, setOuvert] = useState(false);
  const etapes = etapesPour(role);
  const cle = `tour-vu-${role}`;

  useEffect(() => {
    if (localStorage.getItem(cle) !== "1") setOuvert(true);
  }, [cle]);

  if (!ouvert) return null;

  const terminer = () => {
    localStorage.setItem(cle, "1");
    setOuvert(false);
  };

  const e = etapes[etape];
  const dernier = etape === etapes.length - 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="card w-full max-w-md p-6">
        <div className="mb-4 flex items-start justify-between">
          <span className="text-4xl">{e.emoji}</span>
          <button onClick={terminer} className="rounded-lg p-1.5 muted hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Fermer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <h2 className="text-lg font-bold">{e.titre}</h2>
        <p className="muted mt-1 text-sm">{e.texte}</p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {etapes.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === etape ? "w-5 bg-brand-600" : "w-1.5 bg-slate-300 dark:bg-white/20"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {etape > 0 && (
              <button onClick={() => setEtape((s) => s - 1)} className="rounded-xl px-3 py-2 text-sm font-medium muted hover:bg-slate-100 dark:hover:bg-white/5">
                Précédent
              </button>
            )}
            <button
              onClick={() => (dernier ? terminer() : setEtape((s) => s + 1))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {dernier ? "C'est parti" : "Suivant"}
              {dernier ? <Icon.check width={16} /> : null}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
