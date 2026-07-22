import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";

function toneNote(note: number): "success" | "warning" | "danger" {
  return note >= 70 ? "success" : note >= 50 ? "warning" : "danger";
}

// Avis IA d'un rapport : note + avis rédigé + observations.
export function AvisRapportBloc({
  note,
  avis,
  observations,
  compact = false,
}: {
  note: number | null;
  avis: string | null;
  observations: string[];
  compact?: boolean;
}) {
  if (note === null && !avis) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-4 py-3 text-sm muted">
        <Icon.sparkles width={16} /> Analyse IA en attente
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
          <Icon.sparkles width={16} /> Avis de l&apos;IA
        </span>
        {note !== null && (
          <Badge tone={toneNote(note)}>
            {note}/100
          </Badge>
        )}
      </div>
      {avis && <p className="text-sm">{avis}</p>}
      {!compact && observations.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm muted">
          {observations.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
