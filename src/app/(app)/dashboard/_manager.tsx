import Link from "next/link";
import { Users, FileText, CheckCircle2, LineChart as LineIcon, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, type LinePoint } from "@/components/charts/line-chart";
import { AvisRapportBloc } from "@/components/ia/avis-rapport";
import { dernieresSemaines, semaine, isoDate } from "@/lib/data/periodes";
import { formatDateHeure } from "@/lib/utils";
import type { Utilisateur } from "@/lib/types/database";
import type { NotePerformance, Rapport } from "@/lib/types/rapport";

export async function ManagerDashboard({ user }: { user: Utilisateur }) {
  const supabase = await createClient();
  const entrepriseId = user.entreprise_id!;

  const [{ data: employesData }, { data: notesData }, { data: rapportsData }] = await Promise.all([
    supabase.from("utilisateurs").select("id, nom, actif").eq("entreprise_id", entrepriseId).eq("role_systeme", "employe"),
    supabase.from("notes_performance").select("*").eq("entreprise_id", entrepriseId).eq("periode_type", "hebdomadaire").order("periode_debut", { ascending: true }),
    supabase.from("rapports").select("id, employe_id, soumis_at").eq("entreprise_id", entrepriseId).gte("soumis_at", isoDate(semaine(new Date()).debut)),
  ]);

  const employes = (employesData as { id: string; nom: string; actif: boolean }[]) ?? [];
  const notes = (notesData as NotePerformance[]) ?? [];
  const rapportsSemaine = (rapportsData as Pick<Rapport, "id" | "employe_id" | "soumis_at">[]) ?? [];

  const { data: avisData } = await supabase
    .from("rapports")
    .select("id, template_nom, soumis_at, note, avis, observations, utilisateurs(nom)")
    .eq("entreprise_id", entrepriseId)
    .not("analyse_at", "is", null)
    .order("soumis_at", { ascending: false })
    .limit(4);
  const avisRecents =
    (avisData as unknown as (Pick<Rapport, "id" | "template_nom" | "soumis_at" | "note" | "avis" | "observations"> & {
      utilisateurs: { nom: string } | null;
    })[]) ?? [];

  const employesActifs = employes.filter((e) => e.actif);
  const ontSoumis = new Set(rapportsSemaine.map((r) => r.employe_id));
  const tauxCompletude = employesActifs.length > 0 ? Math.round((ontSoumis.size / employesActifs.length) * 100) : 0;

  const semaines = dernieresSemaines(8);
  const courbe: LinePoint[] = semaines.map((s) => {
    const cle = isoDate(s.debut);
    const notesSem = notes.filter((n) => n.periode_debut === cle);
    const moy = notesSem.length ? Math.round(notesSem.reduce((a, n) => a + n.note, 0) / notesSem.length) : 0;
    return { label: s.label.replace("Sem. du ", ""), value: moy };
  });
  const noteMoyenne = courbe.filter((c) => c.value > 0).at(-1)?.value ?? 0;

  const derniereNoteParEmploye = new Map<string, NotePerformance>();
  for (const n of notes) derniereNoteParEmploye.set(n.employe_id, n);
  const classement = employesActifs
    .map((e) => ({ nom: e.nom, note: derniereNoteParEmploye.get(e.id)?.note ?? null }))
    .sort((a, b) => (b.note ?? -1) - (a.note ?? -1));

  const alertes = employesActifs.filter((e) => !ontSoumis.has(e.id));

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.nom.split(" ")[0]} 👋`}
        subtitle="Voici l'activité de votre équipe cette semaine."
        actions={
          <Button asChild variant="outline">
            <Link href="/performances"><LineIcon className="size-4" /> Performances</Link>
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Employés actifs" value={employesActifs.length} highlight icon={<Users className="size-5" />} />
        <StatCard label="Rapports cette semaine" value={rapportsSemaine.length} icon={<FileText className="size-5" />} />
        <StatCard label="Taux de complétude" value={`${tauxCompletude}%`} icon={<CheckCircle2 className="size-5" />} />
        <StatCard label="Note moyenne équipe" value={noteMoyenne || "—"} icon={<LineIcon className="size-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vélocité de l&apos;équipe</CardTitle>
            <CardDescription>Note moyenne — 8 dernières semaines</CardDescription>
          </CardHeader>
          <CardContent><LineChart data={courbe} suffix="/100" /></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertes</CardTitle>
            <CardDescription>À suivre cette semaine</CardDescription>
          </CardHeader>
          <CardContent>
            {alertes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Tout le monde a soumis. 🎉</p>
            ) : (
              <ul className="space-y-2">
                {alertes.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-md bg-amber-50 px-3 py-2.5 text-sm dark:bg-amber-500/10">
                    <TriangleAlert className="size-4 text-amber-600" />
                    <span className="flex-1">{e.nom}</span>
                    <Badge variant="warning">Pas de rapport</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {avisRecents.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Avis récents de l&apos;IA</CardTitle>
            <CardDescription>Analyse individuelle des derniers rapports</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm"><Link href="/performances">Tout voir</Link></Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {avisRecents.map((r) => (
              <div key={r.id}>
                <p className="mb-1 text-sm font-medium">
                  {r.utilisateurs?.nom ?? "—"}
                  <span className="font-normal text-muted-foreground"> · {formatDateHeure(r.soumis_at)}</span>
                </p>
                <AvisRapportBloc note={r.note} avis={r.avis} observations={r.observations ?? []} compact />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Classement des employés</CardTitle>
          <CardDescription>Dernière note de performance</CardDescription>
        </CardHeader>
        <CardContent>
          {classement.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun employé pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y">
              {classement.map((c, i) => (
                <li key={i} className="flex items-center gap-4 py-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 font-medium">{c.nom}</span>
                  {c.note !== null ? (
                    <Badge variant={c.note >= 70 ? "success" : c.note >= 50 ? "warning" : "destructive"}>{c.note}/100</Badge>
                  ) : (
                    <Badge variant="secondary">Non noté</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
