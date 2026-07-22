import { Card, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/icons";
import { CRITERES_NOTATION } from "@/lib/ia/criteres";

// Carte explicitant les critères de notation fixes utilisés par l'IA.
export function CriteresCard() {
  return (
    <Card>
      <CardHeader
        title="Critères de notation"
        subtitle="Barème fixe appliqué par l'IA à chaque rapport"
        action={
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-white/5">
            <Icon.sparkles width={16} />
          </span>
        }
      />
      <ul className="space-y-3">
        {CRITERES_NOTATION.map((c) => (
          <li key={c.cle}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{c.label}</span>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                / {c.poids}
              </span>
            </div>
            <p className="muted mt-0.5 text-xs">{c.description}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
