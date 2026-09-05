import { Sparkles, LineChart as LineIcon, Users, CheckCircle2, FileText, TriangleAlert, BarChart3 } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LineChart, type LinePoint } from "@/components/charts/line-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { CriteresCard } from "@/components/ia/criteres-card";
import { AvisRapportBloc } from "@/components/ia/avis-rapport";
import { dernieresSemaines, semainesEntre, semaine, isoDate } from "@/lib/data/periodes";
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
  searchParams: Promise<{ role?: string; debut?: string; fin?: string; message?: string; error?: string }>;
}) {
  const { role: roleFiltre, debut, fin, message, error } = await searchParams;
  const user = await requireRole("manager", "chef_equipe");
  const estManager = user.role_systeme === "manager";
  const supabase = await createClient();
  const entrepriseId = user.entreprise_id!;

  // Plage de semaines : pilotée par le filtre de dates, sinon 8 dernières.
  const semaines =
    debut && fin ? semainesEntre(new Date(debut), new Date(fin)) : dernieresSemaines(8);
  const nbSemaines = semaines.length;
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
    ? Math.round((employes.reduce((a, e) => a + semainesActives(e.id), 0) / (employes.length * nbSemaines)) * 100)
    : 0;

  // Détail par employé (notes limitées à la plage de dates sélectionnée).
  const detail = employes
    .map((e) => {
      const sesNotes = notesFiltre.filter(
        (n) => n.employe_id === e.id && debutsSemaines.includes(n.periode_debut)
      );
      const derniere = sesNotes.at(-1) ?? null;
      const precedente = sesNotes.at(-2) ?? null;
      const tendance =
        derniere && precedente ? derniere.note - precedente.note : null;
      return {
        ...e,
        derniere,
        tendance,
        trend: sesNotes.slice(-12).map((n) => n.note),
        regularite: Math.round((semainesActives(e.id) / nbSemaines) * 100),
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
          estManager ? (
            <div className="flex flex-wrap gap-2">
              <form action={analyserRapportsDuJour}>
                <input type="hidden" name="tout" value="1" />
                <Button variant="secondary" size="sm" type="submit">
                  <Sparkles className="size-4" /> Analyser les rapports
                </Button>
              </form>
              <form action={lancerAnalyse}>
                <input type="hidden" name="type" value="hebdomadaire" />
                <Button variant="secondary" size="sm" type="submit">
                  <Sparkles className="size-4" /> Bilan semaine
                </Button>
              </form>
              <form action={lancerAnalyse}>
                <input type="hidden" name="type" value="mensuel" />
                <Button size="sm" type="submit">
                  <Sparkles className="size-4" /> Bilan mois
                </Button>
              </form>
            </div>
          ) : null
        }
      />

      {message && (
        <p className="mb-4 rounded-md bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{message}</p>
      )}
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
      )}

      {/* Filtres : rôle + plage de dates (impactent les graphes) */}
      <Card className="mb-6">
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="sm:w-44">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Rôle métier</label>
              <Select name="role" defaultValue={roleFiltre ?? ""}>
                <option value="">Tous les rôles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.nom}</option>
                ))}
              </Select>
            </div>
            <div className="sm:w-40">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Du</label>
              <Input name="debut" type="date" defaultValue={debut ?? ""} />
            </div>
            <div className="sm:w-40">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Au</label>
              <Input name="fin" type="date" defaultValue={fin ?? ""} />
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" type="submit" className="w-full sm:w-auto">
                Appliquer
              </Button>
              {(debut || fin || roleFiltre) && (
                <a href="/performances" className="whitespace-nowrap text-sm text-primary hover:underline">
                  Réinitialiser
                </a>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Note moyenne" value={noteMoyenne || "—"} highlight icon={<LineIcon className="size-5" />} />
        <StatCard label="Employés" value={employes.length} icon={<Users className="size-5" />} />
        <StatCard label="Complétude (sem.)" value={`${completude}%`} icon={<CheckCircle2 className="size-5" />} />
        <StatCard label={`Régularité (${nbSemaines} sem.)`} value={`${regulariteMoyenne}%`} icon={<FileText className="size-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vélocité de l&apos;équipe</CardTitle>
            <CardDescription>Note moyenne hebdomadaire</CardDescription>
          </CardHeader>
          <CardContent><LineChart data={courbe} suffix="/100" /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alertes</CardTitle>
            <CardDescription>Baisse ou absence de rapport</CardDescription>
          </CardHeader>
          <CardContent>
            {alertes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucune alerte. 🎉</p>
            ) : (
              <ul className="space-y-2">
                {alertes.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm dark:bg-amber-500/10">
                    <TriangleAlert className="size-4 text-amber-600" />
                    <span className="flex-1">{a.nom}</span>
                    <Badge variant="warning">{!a.aSoumis ? "Absent" : `${a.tendance}`}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Avis IA par rapport + critères de notation */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Avis de l&apos;IA — rapports récents</CardTitle>
              <CardDescription>Analyse individuelle de chaque rapport (même sur une journée)</CardDescription>
            </CardHeader>
            <CardContent>
              {avisRecents.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucun rapport analysé. Cliquez sur « Analyser les rapports ».
                </p>
              ) : (
                <div className="space-y-3">
                  {avisRecents.map((r) => (
                    <div key={r.id}>
                      <p className="mb-1 text-sm font-medium">
                        {r.utilisateurs?.nom ?? "—"}
                        <span className="font-normal text-muted-foreground">
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
            </CardContent>
          </Card>
        </div>
        <CriteresCard />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Détail par employé</CardTitle>
          <CardDescription>Dernière note, tendance et régularité</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <BarChart3 className="size-8 text-muted-foreground" />
              <div>
                <p className="font-semibold">Aucun employé</p>
                <p className="mt-1 text-sm text-muted-foreground">Ajoutez des employés et lancez une analyse.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {detail.map((d) => (
                <div key={d.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{d.nom}</p>
                      <p className="text-xs text-muted-foreground">{d.roles_metier?.nom ?? "Sans rôle"} · Régularité {d.regularite}%</p>
                    </div>
                    <Sparkline values={d.trend} />
                    {d.tendance !== null && (
                      <Badge variant={d.tendance >= 0 ? "success" : "destructive"}>
                        {d.tendance >= 0 ? "▲" : "▼"} {Math.abs(d.tendance)}
                      </Badge>
                    )}
                    <span className="text-lg font-bold">
                      {d.derniere ? `${d.derniere.note}` : "—"}
                      <span className="text-sm text-muted-foreground">/100</span>
                    </span>
                  </div>
                  {d.derniere && (d.derniere.observations.length > 0 || d.derniere.initiatives.length > 0) && (
                    <div className="mt-3 grid gap-3 border-t pt-3 text-sm sm:grid-cols-2">
                      {d.derniere.observations.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Observations</p>
                          <ul className="list-disc space-y-0.5 pl-4">
                            {d.derniere.observations.map((o, i) => <li key={i}>{o}</li>)}
                          </ul>
                        </div>
                      )}
                      {d.derniere.initiatives.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Initiatives</p>
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
        </CardContent>
      </Card>
    </>
  );
}
