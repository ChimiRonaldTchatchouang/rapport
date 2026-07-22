import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
import { LineChart, type LinePoint } from "@/components/charts/line-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { CriteresCard } from "@/components/ia/criteres-card";
import { AvisRapportBloc } from "@/components/ia/avis-rapport";
import { dernieresSemaines, semaine, isoDate } from "@/lib/data/periodes";
import { formatDateHeure } from "@/lib/utils";
import type { RoleMetier } from "@/lib/types/database";
import type { NotePerformance, Rapport } from "@/lib/types/rapport";
import { lancerAnalyse, analyserRapportsDuJour } from "./actions";

type EmployeRow = {
  id: string;
  nom: string;
  role_metier_id: string | null;
  roles_metier: { nom: string } | null;
};

export default async function PerformancesPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; message?: string; error?: string }>;
}) {
  const { role: roleFiltre, message, error } = await searchParams;
  const user = await requireRole("manager");
  const supabase = await createClient();
  const entrepriseId = user.entreprise_id!;

  const semaines = dernieresSemaines(8);
  const debutFenetre = isoDate(semaines[0].debut);

  const [{ data: employesData }, { data: notesData }, { data: rapportsData }, { data: rolesData }] =
    await Promise.all([
      supabase
        .from("utilisateurs")
        .select("id, nom, role_metier_id, roles_metier(nom)")
        .eq("entreprise_id", entrepriseId)
        .eq("role_systeme", "employe")
        .eq("actif", true),
      supabase
        .from("notes_performance")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .eq("periode_type", "hebdomadaire")
        .order("periode_debut", { ascending: true }),
      supabase
        .from("rapports")
        .select("employe_id, soumis_at")
        .eq("entreprise_id", entrepriseId)
        .gte("soumis_at", debutFenetre),
      supabase.from("roles_metier").select("id, nom").eq("entreprise_id", entrepriseId),
    ]);

  let employes = (employesData as unknown as EmployeRow[]) ?? [];
  const notes = (notesData as NotePerformance[]) ?? [];
  const rapports = (rapportsData as Pick<Rapport, "employe_id" | "soumis_at">[]) ?? [];
  const roles = (rolesData as Pick<RoleMetier, "id" | "nom">[]) ?? [];

  if (roleFiltre) employes = employes.filter((e) => e.role_metier_id === roleFiltre);
  const idsFiltre = new Set(employes.map((e) => e.id));
  const notesFiltre = notes.filter((n) => idsFiltre.has(n.employe_id));

  // Avis IA récents (rapports analysés individuellement).
  const { data: avisData } = await supabase
    .from("rapports")
    .select("id, template_nom, soumis_at, note, avis, observations, utilisateurs(nom)")
    .eq("entreprise_id", entrepriseId)
    .not("analyse_at", "is", null)
    .order("soumis_at", { ascending: false })
    .limit(6);
  const avisRecents =
    (avisData as unknown as (Pick<Rapport, "id" | "template_nom" | "soumis_at" | "note" | "avis" | "observations"> & {
      utilisateurs: { nom: string } | null;
    })[]) ?? [];

  // Courbe équipe (note moyenne par semaine).
  const courbe: LinePoint[] = semaines.map((s) => {
    const cle = isoDate(s.debut);
    const ns = notesFiltre.filter((n) => n.periode_debut === cle);
    return {
      label: s.label.replace("Sem. du ", ""),
      value: ns.length ? Math.round(ns.reduce((a, n) => a + n.note, 0) / ns.length) : 0,
    };
  });
  const noteMoyenne = courbe.filter((c) => c.value > 0).at(-1)?.value ?? 0;

  // Régularité : semaines avec ≥1 rapport / 8, par employé.
  const debutsSemaines = semaines.map((s) => isoDate(s.debut));
  function semainesActives(empId: string): number {
    const rs = rapports.filter((r) => r.employe_id === empId);
    return debutsSemaines.filter((d, i) => {
      const fin = isoDate(semaines[i].fin);
      return rs.some((r) => r.soumis_at.slice(0, 10) >= d && r.soumis_at.slice(0, 10) <= fin);
    }).length;
  }

  const debutSem = isoDate(semaine(new Date()).debut);
  const ontSoumis = new Set(rapports.filter((r) => r.soumis_at >= debutSem).map((r) => r.employe_id));
  const completude = employes.length
    ? Math.round(([...idsFiltre].filter((id) => ontSoumis.has(id)).length / employes.length) * 100)
    : 0;
  const regulariteMoyenne = employes.length
    ? Math.round((employes.reduce((a, e) => a + semainesActives(e.id), 0) / (employes.length * 8)) * 100)
    : 0;

  // Détail par employé.
  const detail = employes
    .map((e) => {
      const sesNotes = notesFiltre.filter((n) => n.employe_id === e.id);
      const derniere = sesNotes.at(-1) ?? null;
      const precedente = sesNotes.at(-2) ?? null;
      const tendance =
        derniere && precedente ? derniere.note - precedente.note : null;
      return {
        ...e,
        derniere,
        tendance,
        trend: sesNotes.slice(-8).map((n) => n.note),
        regularite: Math.round((semainesActives(e.id) / 8) * 100),
        aSoumis: ontSoumis.has(e.id),
      };
    })
    .sort((a, b) => (b.derniere?.note ?? -1) - (a.derniere?.note ?? -1));

  const alertes = detail.filter((d) => !d.aSoumis || (d.tendance !== null && d.tendance <= -10));

  return (
    <>
      <PageHeader
        title="Performances"
        subtitle="Vélocité, régularité et notes de votre équipe."
        actions={
          <div className="flex flex-wrap gap-2">
            <form action={analyserRapportsDuJour}>
              <input type="hidden" name="tout" value="1" />
              <Button variant="secondary" size="sm" type="submit">
                <Icon.sparkles width={16} /> Analyser les rapports
              </Button>
            </form>
            <form action={lancerAnalyse}>
              <input type="hidden" name="type" value="hebdomadaire" />
              <Button variant="secondary" size="sm" type="submit">
                <Icon.sparkles width={16} /> Bilan semaine
              </Button>
            </form>
            <form action={lancerAnalyse}>
              <input type="hidden" name="type" value="mensuel" />
              <Button size="sm" type="submit">
                <Icon.sparkles width={16} /> Bilan mois
              </Button>
            </form>
          </div>
        }
      />

      {message && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{message}</p>
      )}
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
      )}

      {/* Filtre par rôle */}
      <form className="mb-6 flex items-center gap-2">
        <span className="muted text-sm">Filtrer :</span>
        <Select name="role" defaultValue={roleFiltre ?? ""} className="max-w-xs">
          <option value="">Tous les rôles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.nom}</option>
          ))}
        </Select>
        <Button variant="secondary" size="sm" type="submit">Appliquer</Button>
      </form>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Note moyenne" value={noteMoyenne || "—"} highlight icon={<Icon.chart width={18} />} />
        <StatCard label="Employés" value={employes.length} icon={<Icon.users width={18} />} />
        <StatCard label="Complétude (sem.)" value={`${completude}%`} icon={<Icon.check width={18} />} />
        <StatCard label="Régularité (8 sem.)" value={`${regulariteMoyenne}%`} icon={<Icon.doc width={18} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Vélocité de l'équipe" subtitle="Note moyenne hebdomadaire" />
          <LineChart data={courbe} suffix="/100" />
        </Card>
        <Card>
          <CardHeader title="Alertes" subtitle="Baisse ou absence de rapport" />
          {alertes.length === 0 ? (
            <p className="muted py-6 text-center text-sm">Aucune alerte. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {alertes.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm dark:bg-amber-500/10">
                  <Icon.alert width={16} className="text-amber-600" />
                  <span className="flex-1">{a.nom}</span>
                  <Badge tone="warning">{!a.aSoumis ? "Absent" : `${a.tendance}`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Avis IA par rapport + critères de notation */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Avis de l'IA — rapports récents"
              subtitle="Analyse individuelle de chaque rapport (même sur une journée)"
            />
            {avisRecents.length === 0 ? (
              <p className="muted py-6 text-center text-sm">
                Aucun rapport analysé. Cliquez sur « Analyser les rapports ».
              </p>
            ) : (
              <div className="space-y-3">
                {avisRecents.map((r) => (
                  <div key={r.id}>
                    <p className="mb-1 text-sm font-medium">
                      {r.utilisateurs?.nom ?? "—"}
                      <span className="muted font-normal">
                        {" "}· {r.template_nom ?? "Rapport"} · {formatDateHeure(r.soumis_at)}
                      </span>
                    </p>
                    <AvisRapportBloc
                      note={r.note}
                      avis={r.avis}
                      observations={r.observations ?? []}
                      compact
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        <CriteresCard />
      </div>

      <Card className="mt-6">
        <CardHeader title="Détail par employé" subtitle="Dernière note, tendance et régularité" />
        {detail.length === 0 ? (
          <EmptyState title="Aucun employé" description="Ajoutez des employés et lancez une analyse." icon="📊" />
        ) : (
          <div className="space-y-3">
            {detail.map((d) => (
              <div key={d.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{d.nom}</p>
                    <p className="muted text-xs">{d.roles_metier?.nom ?? "Sans rôle"} · Régularité {d.regularite}%</p>
                  </div>
                  <Sparkline values={d.trend} />
                  {d.tendance !== null && (
                    <Badge tone={d.tendance >= 0 ? "success" : "danger"}>
                      {d.tendance >= 0 ? "▲" : "▼"} {Math.abs(d.tendance)}
                    </Badge>
                  )}
                  <span className="text-lg font-bold">
                    {d.derniere ? `${d.derniere.note}` : "—"}
                    <span className="muted text-sm">/100</span>
                  </span>
                </div>
                {d.derniere && (d.derniere.observations.length > 0 || d.derniere.initiatives.length > 0) && (
                  <div className="mt-3 grid gap-3 border-t border-[var(--border)] pt-3 text-sm sm:grid-cols-2">
                    {d.derniere.observations.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase muted">Observations</p>
                        <ul className="list-disc space-y-0.5 pl-4">
                          {d.derniere.observations.map((o, i) => <li key={i}>{o}</li>)}
                        </ul>
                      </div>
                    )}
                    {d.derniere.initiatives.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase muted">Initiatives</p>
                        <ul className="list-disc space-y-0.5 pl-4">
                          {d.derniere.initiatives.map((o, i) => <li key={i}>{o}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
