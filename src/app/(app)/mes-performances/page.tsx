import { LineChart as LineIcon, CheckCircle2, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { LineChart, type LinePoint } from "@/components/charts/line-chart";
import type { NotePerformance } from "@/lib/types/rapport";

export default async function MesPerformancesPage() {
  const employe = await requireRole("employe", "chef_equipe");
  const supabase = await createClient();

  const { data } = await supabase
    .from("notes_performance")
    .select("*")
    .eq("employe_id", employe.id)
    .order("periode_debut", { ascending: true });

  const notes = (data as NotePerformance[]) ?? [];
  const hebdo = notes.filter((n) => n.periode_type === "hebdomadaire");
  const derniere = notes.at(-1) ?? null;
  const moyenne = notes.length
    ? Math.round(notes.reduce((a, n) => a + n.note, 0) / notes.length)
    : null;

  const courbe: LinePoint[] = hebdo.slice(-10).map((n) => ({
    label: new Date(n.periode_debut).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    value: n.note,
  }));

  return (
    <>
      <PageHeader title="Mes performances" subtitle="Votre évolution et les retours de l'IA." />

      {notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <LineIcon className="size-8 text-muted-foreground" />
            <div>
              <p className="font-semibold">Pas encore de note</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Vos notes apparaîtront après l&apos;analyse de vos rapports par votre manager.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Dernière note" value={`${derniere?.note ?? "—"}/100`} highlight icon={<LineIcon className="size-5" />} />
            <StatCard label="Moyenne" value={`${moyenne}/100`} icon={<CheckCircle2 className="size-5" />} />
            <StatCard label="Périodes analysées" value={notes.length} icon={<FileText className="size-5" />} />
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Mon évolution</CardTitle>
              <CardDescription>Notes hebdomadaires</CardDescription>
            </CardHeader>
            <CardContent><LineChart data={courbe} suffix="/100" /></CardContent>
          </Card>

          {derniere && (
            <Card>
              <CardHeader>
                <CardTitle>Derniers retours</CardTitle>
                <CardDescription>{`Période du ${derniere.periode_debut} au ${derniere.periode_fin}`}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Observations</p>
                    {derniere.observations.length ? (
                      <ul className="list-disc space-y-1 pl-4 text-sm">
                        {derniere.observations.map((o, i) => <li key={i}>{o}</li>)}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Pistes d&apos;amélioration</p>
                    {derniere.initiatives.length ? (
                      <ul className="list-disc space-y-1 pl-4 text-sm">
                        {derniere.initiatives.map((o, i) => <li key={i}>{o}</li>)}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </>
  );
}
