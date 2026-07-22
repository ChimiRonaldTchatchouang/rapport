import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { LineChart, type LinePoint } from "@/components/charts/line-chart";
import { formatDateHeure } from "@/lib/utils";
import { semaine, isoDate } from "@/lib/data/periodes";
import type { Utilisateur } from "@/lib/types/database";
import type { NotePerformance, Rapport } from "@/lib/types/rapport";

export async function EmployeDashboard({ user }: { user: Utilisateur }) {
  const supabase = await createClient();

  const [{ data: rapportsData }, { data: notesData }] = await Promise.all([
    supabase
      .from("rapports")
      .select("id, template_nom, soumis_at")
      .eq("employe_id", user.id)
      .order("soumis_at", { ascending: false })
      .limit(5),
    supabase
      .from("notes_performance")
      .select("*")
      .eq("employe_id", user.id)
      .eq("periode_type", "hebdomadaire")
      .order("periode_debut", { ascending: true }),
  ]);

  const rapports = (rapportsData as Pick<Rapport, "id" | "template_nom" | "soumis_at">[]) ?? [];
  const notes = (notesData as NotePerformance[]) ?? [];
  const derniereNote = notes.at(-1)?.note ?? null;

  const debutSem = isoDate(semaine(new Date()).debut);
  const aSoumisCetteSemaine = rapports.some((r) => r.soumis_at >= debutSem);

  const courbe: LinePoint[] = notes.slice(-8).map((n) => ({
    label: new Date(n.periode_debut).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    value: n.note,
  }));

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.nom.split(" ")[0]} 👋`}
        subtitle="Avez-vous rempli votre rapport aujourd'hui ?"
        actions={
          <ButtonLink href="/nouveau-rapport">
            <Icon.plus width={18} /> Nouveau rapport
          </ButtonLink>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Ma dernière note"
          value={derniereNote !== null ? `${derniereNote}/100` : "—"}
          highlight
          icon={<Icon.chart width={18} />}
        />
        <StatCard label="Rapports soumis" value={rapports.length >= 5 ? "5+" : rapports.length} icon={<Icon.doc width={18} />} />
        <StatCard
          label="Cette semaine"
          value={aSoumisCetteSemaine ? "Fait ✓" : "À faire"}
          icon={<Icon.check width={18} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Mon évolution" subtitle="Note hebdomadaire" />
          <LineChart data={courbe} suffix="/100" />
        </Card>

        <Card>
          <CardHeader
            title="Rapports récents"
            action={<ButtonLink href="/mes-rapports" variant="ghost" size="sm">Tout voir</ButtonLink>}
          />
          {rapports.length === 0 ? (
            <p className="muted py-6 text-center text-sm">Aucun rapport pour l'instant.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {rapports.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{r.template_nom ?? "Rapport"}</p>
                    <p className="muted text-xs">{formatDateHeure(r.soumis_at)}</p>
                  </div>
                  <Badge tone="success">Soumis</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
