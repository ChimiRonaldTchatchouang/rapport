import Link from "next/link";
import { Plus, Download } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
          <Button asChild>
            <Link href="/nouveau-rapport"><Plus className="size-4" /> Nouveau rapport</Link>
          </Button>
        }
      />

      {message && (
        <p className="mb-4 rounded-md bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{message}</p>
      )}

      {rapports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucun rapport. Soumettez votre premier rapport.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y">
            {rapports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <Link href={`/mes-rapports/${r.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.template_nom ?? "Rapport"}</p>
                  <p className="text-xs text-muted-foreground">{formatDateHeure(r.soumis_at)}</p>
                </Link>
                <div className="flex items-center gap-2">
                  {r.similaire_precedent && <Badge variant="warning">Similaire</Badge>}
                  <a
                    href={`/api/rapport/${r.id}/pdf`}
                    target="_blank"
                    className="rounded-md p-2 text-muted-foreground transition hover:bg-accent"
                    title="Télécharger en PDF"
                  >
                    <Download className="size-[18px]" />
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
