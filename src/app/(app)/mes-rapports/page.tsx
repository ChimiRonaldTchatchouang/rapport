import Link from "next/link";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
import { formatDateHeure } from "@/lib/utils";
import type { Rapport } from "@/lib/types/rapport";

export default async function MesRapportsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const employe = await requireRole("employe", "chef_equipe");
  const supabase = await createClient();

  const { data } = await supabase
    .from("rapports")
    .select("id, template_nom, soumis_at, source, similaire_precedent")
    .eq("employe_id", employe.id)
    .order("soumis_at", { ascending: false });

  const rapports = (data as Pick<Rapport, "id" | "template_nom" | "soumis_at" | "source" | "similaire_precedent">[]) ?? [];

  return (
    <>
      <PageHeader
        title="Mes rapports"
        subtitle="Historique de vos soumissions."
        actions={
          <ButtonLink href="/nouveau-rapport">
            <Icon.plus width={18} /> Nouveau rapport
          </ButtonLink>
        }
      />

      {message && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{message}</p>
      )}

      {rapports.length === 0 ? (
        <EmptyState title="Aucun rapport" description="Soumettez votre premier rapport." icon="📄" />
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-[var(--border)]">
            {rapports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <Link href={`/mes-rapports/${r.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.template_nom ?? "Rapport"}</p>
                  <p className="muted text-xs">{formatDateHeure(r.soumis_at)}</p>
                </Link>
                <div className="flex items-center gap-2">
                  {r.similaire_precedent && <Badge tone="warning">Similaire</Badge>}
                  <a
                    href={`/api/rapport/${r.id}/pdf`}
                    target="_blank"
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
                    title="Télécharger en PDF"
                  >
                    <Icon.download width={18} />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
