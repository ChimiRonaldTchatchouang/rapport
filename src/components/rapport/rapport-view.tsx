import { Badge } from "@/components/ui/badge";
import { valeurLisible, type ValeurChamp } from "@/lib/types/rapport";
import { formatDateHeure } from "@/lib/utils";

// Vue détaillée d'un rapport (contenu structuré selon l'ordre des champs).
export function RapportView({
  templateNom,
  contenu,
  soumisAt,
  source,
  auteur,
}: {
  templateNom: string | null;
  contenu: ValeurChamp[];
  soumisAt: string;
  source: "app" | "email";
  auteur?: string;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">{templateNom ?? "Rapport"}</h3>
        <Badge tone={source === "email" ? "info" : "brand"}>
          {source === "email" ? "Reçu par email" : "Via l'app"}
        </Badge>
      </div>
      <p className="muted mb-4 text-sm">
        {auteur && <>Par {auteur} · </>}
        Soumis le {formatDateHeure(soumisAt)}
      </p>

      <dl className="overflow-hidden rounded-xl border border-[var(--border)]">
        {contenu.map((c, i) => (
          <div
            key={c.champ_id + i}
            className="grid grid-cols-1 gap-1 border-b border-[var(--border)] px-4 py-3 last:border-0 sm:grid-cols-3"
          >
            <dt className="muted text-sm">{c.label}</dt>
            <dd className="text-sm font-medium sm:col-span-2">{valeurLisible(c)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
