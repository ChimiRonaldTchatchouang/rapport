import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
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
        <EmptyState
          title="Pas encore de note"
          description="Vos notes apparaîtront après l'analyse de vos rapports par votre manager."
          icon="📈"
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Dernière note" value={`${derniere?.note ?? "—"}/100`} highlight icon={<Icon.chart width={18} />} />
            <StatCard label="Moyenne" value={`${moyenne}/100`} icon={<Icon.check width={18} />} />
            <StatCard label="Périodes analysées" value={notes.length} icon={<Icon.doc width={18} />} />
          </div>

          <Card className="mb-6">
            <CardHeader title="Mon évolution" subtitle="Notes hebdomadaires" />
            <LineChart data={courbe} suffix="/100" />
          </Card>

          {derniere && (
            <Card>
              <CardHeader
                title="Derniers retours"
                subtitle={`Période du ${derniere.periode_debut} au ${derniere.periode_fin}`}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase muted">Observations</p>
                  {derniere.observations.length ? (
                    <ul className="list-disc space-y-1 pl-4 text-sm">
                      {derniere.observations.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                  ) : (
                    <p className="muted text-sm">—</p>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase muted">Pistes d'amélioration</p>
                  {derniere.initiatives.length ? (
                    <ul className="list-disc space-y-1 pl-4 text-sm">
                      {derniere.initiatives.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                  ) : (
                    <p className="muted text-sm">—</p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
}
