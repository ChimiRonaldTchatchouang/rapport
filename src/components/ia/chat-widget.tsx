"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@/components/icons";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Quel employé a besoin d'attention cette semaine ?",
  "Fais un point sur les commerciaux.",
  "Qui n'a pas soumis ses rapports récemment ?",
];

// Assistant IA flottant (coin bas-gauche) réservé au manager.
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function envoyer(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    const historique = messages;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, historique }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reponse ?? data.error ?? "Erreur." },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Connexion impossible." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 left-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-gold-500 text-white shadow-lg transition hover:opacity-90"
        aria-label="Assistant IA"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        ) : (
          <Icon.sparkles width={24} />
        )}
      </button>

      {/* Panneau */}
      {open && (
        <div className="card fixed bottom-24 left-5 z-50 flex h-[70vh] max-h-[560px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-brand-600 px-4 py-3 text-white">
            <Icon.sparkles width={18} />
            <div>
              <p className="text-sm font-semibold">Assistant IA</p>
              <p className="text-xs text-white/70">Questions sur votre équipe</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="muted text-sm">
                  Posez une question sur un employé, un rôle ou l&apos;équipe.
                </p>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => envoyer(s)}
                      className="block w-full rounded-xl border border-[var(--border)] px-3 py-2 text-left text-sm transition hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-white/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-3.5 py-2 text-sm text-white"
                      : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2 text-sm dark:bg-white/10"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2 text-sm muted dark:bg-white/10">
                  L&apos;assistant réfléchit…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              envoyer(input);
            }}
            className="flex items-center gap-2 border-t border-[var(--border)] p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre question…"
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
              aria-label="Envoyer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
