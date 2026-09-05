import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function variantNote(note: number): "success" | "warning" | "destructive" {
  return note >= 70 ? "success" : note >= 50 ? "warning" : "destructive";
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
      <div className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        <Sparkles className="size-4" /> Analyse IA en attente
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-secondary/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Sparkles className="size-4" /> Avis de l&apos;IA
        </span>
        {note !== null && <Badge variant={variantNote(note)}>{note}/100</Badge>}
      </div>
      {avis && <p className="text-sm">{avis}</p>}
      {!compact && observations.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
          {observations.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
