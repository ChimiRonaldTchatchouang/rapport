import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { LineChart, type LinePoint } from "@/components/charts/line-chart";
import { dernieresSemaines, semaine, isoDate } from "@/lib/data/periodes";
import type { Utilisateur } from "@/lib/types/database";
import type { NotePerformance, Rapport } from "@/lib/types/rapport";

export async function ManagerDashboard({ user }: { user: Utilisateur }) {
  const supabase = await createClient();
  const entrepriseId = user.entreprise_id!;

  const [{ data: employesData }, { data: notesData }, { data: rapportsData }] =
    await Promise.all([
      supabase
        .from("utilisateurs")
        .select("id, nom, actif")
        .eq("entreprise_id", entrepriseId)
        .eq("role_systeme", "employe"),
      supabase
        .from("notes_performance")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .eq("periode_type", "hebdomadaire")
        .order("periode_debut", { ascending: true }),
      supabase
        .from("rapports")
        .select("id, employe_id, soumis_at")
        .eq("entreprise_id", entrepriseId)
        .gte("soumis_at", isoDate(semaine(new Date()).debut)),
    ]);

  const employes = (employesData as { id: string; nom: string; actif: boolean }[]) ?? [];
  const notes = (notesData as NotePerformance[]) ?? [];
  const rapportsSemaine = (rapportsData as Pick<Rapport, "id" | "employe_id" | "soumis_at">[]) ?? [];

  const employesActifs = employes.filter((e) => e.actif);
  const ontSoumis = new Set(rapportsSemaine.map((r) => r.employe_id));
  const tauxCompletude =
    employesActifs.length > 0
      ? Math.round((ontSoumis.size / employesActifs.length) * 100)
      : 0;

  // Courbe : note moyenne d'équipe sur les 8 dernières semaines.
  const semaines = dernieresSemaines(8);
  const courbe: LinePoint[] = semaines.map((s) => {
    const cle = isoDate(s.debut);
    const notesSem = notes.filter((n) => n.periode_debut === cle);
    const moy = notesSem.length
      ? Math.round(notesSem.reduce((a, n) => a + n.note, 0) / notesSem.length)
      : 0;
    return { label: s.label.replace("Sem. du ", ""), value: moy };
  });
  const noteMoyenne = courbe.filter((c) => c.value > 0).at(-1)?.value ?? 0;

  // Classement (dernière note de chaque employé).
  const derniereNoteParEmploye = new Map<string, NotePerformance>();
  for (const n of notes) derniereNoteParEmploye.set(n.employe_id, n);
  const classement = employesActifs
    .map((e) => ({ nom: e.nom, note: derniereNoteParEmploye.get(e.id)?.note ?? null }))
    .sort((a, b) => (b.note ?? -1) - (a.note ?? -1));

  // Alertes : employés n'ayant pas soumis cette semaine.
  const alertes = employesActifs.filter((e) => !ontSoumis.has(e.id));

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.nom.split(" ")[0]} 👋`}
        subtitle="Voici l'activité de votre équipe cette semaine."
        actions={
          <ButtonLink href="/performances" variant="secondary">
            <Icon.chart width={18} /> Performances
          </ButtonLink>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Employés actifs" value={employesActifs.length} highlight icon={<Icon.users width={18} />} />
        <StatCard label="Rapports cette semaine" value={rapportsSemaine.length} icon={<Icon.doc width={18} />} />
        <StatCard label="Taux de complétude" value={`${tauxCompletude}%`} icon={<Icon.check width={18} />} />
        <StatCard label="Note moyenne équipe" value={noteMoyenne || "—"} icon={<Icon.chart width={18} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Vélocité de l'équipe" subtitle="Note moyenne — 8 dernières semaines" />
          <LineChart data={courbe} suffix="/100" />
        </Card>

        <Card>
          <CardHeader title="Alertes" subtitle="À suivre cette semaine" />
          {alertes.length === 0 ? (
            <p className="muted py-6 text-center text-sm">Tout le monde a soumis. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {alertes.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm dark:bg-amber-500/10">
                  <Icon.alert width={18} className="text-amber-600" />
                  <span className="flex-1">{e.nom}</span>
                  <Badge tone="warning">Pas de rapport</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Classement des employés" subtitle="Dernière note de performance" />
        {classement.length === 0 ? (
          <p className="muted py-6 text-center text-sm">Aucun employé pour l'instant.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {classement.map((c, i) => (
              <li key={i} className="flex items-center gap-4 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-white/5">
                  {i + 1}
                </span>
                <span className="flex-1 font-medium">{c.nom}</span>
                {c.note !== null ? (
                  <Badge tone={c.note >= 70 ? "success" : c.note >= 50 ? "warning" : "danger"}>
                    {c.note}/100
                  </Badge>
                ) : (
                  <Badge tone="neutral">Non noté</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
