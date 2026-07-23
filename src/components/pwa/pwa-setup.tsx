"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

// Type minimal de l'événement d'installation (non standardisé dans TS).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Enregistre le service worker et propose l'installation de la PWA sur mobile.
export function PwaSetup() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      // N'affiche pas si déjà installé ou déjà refusé récemment.
      if (localStorage.getItem("pwa-dismiss") !== "1") setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible || !promptEvent) return null;

  const installer = async () => {
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setVisible(false);
    setPromptEvent(null);
  };

  const refuser = () => {
    localStorage.setItem("pwa-dismiss", "1");
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md sm:left-auto sm:right-4">
      <div className="card flex items-center gap-3 p-3 shadow-lg">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Icon.download width={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Installer l&apos;application</p>
          <p className="muted text-xs">Accès rapide depuis votre écran d&apos;accueil.</p>
        </div>
        <button onClick={refuser} className="rounded-lg px-2 py-1 text-xs muted hover:bg-slate-100 dark:hover:bg-white/5">
          Plus tard
        </button>
        <button onClick={installer} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
          Installer
        </button>
      </div>
    </div>
  );
}
