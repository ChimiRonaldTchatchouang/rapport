import { Badge } from "@/components/ui/badge";
import { valeurLisible, type ValeurChamp } from "@/lib/types/rapport";
import { formatDateHeure } from "@/lib/utils";

// Regroupe des valeurs de champ par section, en préservant l'ordre.
function grouperParSection(contenu: ValeurChamp[]) {
  const groupes: { section: string | null; items: ValeurChamp[] }[] = [];
  for (const c of contenu) {
    const last = groupes[groupes.length - 1];
    if (last && last.section === (c.section ?? null)) last.items.push(c);
    else groupes.push({ section: c.section ?? null, items: [c] });
  }
  return groupes;
}

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

      {grouperParSection(contenu).map((g, gi) => (
        <div key={gi} className="mb-4 last:mb-0">
          {g.section && (
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-600">
              {g.section}
            </h4>
          )}
          <dl className="overflow-hidden rounded-xl border border-[var(--border)]">
            {g.items.map((c, i) => (
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
      ))}
    </div>
  );
}
