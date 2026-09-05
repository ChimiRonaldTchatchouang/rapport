import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader } from "@/components/legacy/card";
import { StatCard } from "@/components/legacy/stat-card";
import { Badge } from "@/components/legacy/badge";
import { Button } from "@/components/legacy/button";
import { Select, Input } from "@/components/legacy/field";
import { EmptyState } from "@/components/legacy/empty";
import { Icon } from "@/components/icons";
import { BarList } from "@/components/charts/bar-chart";
import { analyserReponses } from "@/lib/data/analyse";
import { LABEL_TYPE_CHAMP } from "@/lib/types/rapport";
import type { ChampTemplate, TemplateRapport, ValeurChamp } from "@/lib/types/rapport";
import type { Utilisateur } from "@/lib/types/database";

export default async function AnalysesPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; employe?: string; debut?: string; fin?: string }>;
}) {
  const { template, employe, debut, fin } = await searchParams;
  const user = await requireRole("manager", "chef_equipe");
  const supabase = await createClient();

  const [{ data: templatesData }, { data: employesData }] = await Promise.all([
    supabase
      .from("templates_rapport")
      .select("id, nom")
      .eq("entreprise_id", user.entreprise_id)
      .order("nom"),
    supabase
      .from("utilisateurs")
      .select("id, nom")
      .eq("entreprise_id", user.entreprise_id)
      .in("role_systeme", ["employe", "chef_equipe"])
      .order("nom"),
  ]);

  const templates = (templatesData as Pick<TemplateRapport, "id" | "nom">[]) ?? [];
  const employes = (employesData as Pick<Utilisateur, "id" | "nom">[]) ?? [];
  const templateId = template ?? templates[0]?.id ?? null;

  if (!templateId) {
    return (
      <>
        <PageHeader title="Analyses" subtitle="Réponses agrégées de vos rapports." />
        <EmptyState title="Aucun template" description="Créez un template et collectez des rapports pour voir les analyses." icon="📊" />
      </>
    );
  }

  // Champs du template + rapports (filtrés).
  const [{ data: champsData }, rapportsReq] = await Promise.all([
    supabase.from("champs_template").select("*").eq("template_id", templateId).order("ordre", { ascending: true }),
    (async () => {
      let q = supabase
        .from("rapports")
        .select("contenu, soumis_at, employe_id")
        .eq("entreprise_id", user.entreprise_id)
        .eq("template_id", templateId)
        .limit(2000);
      if (employe) q = q.eq("employe_id", employe);
      if (debut) q = q.gte("soumis_at", debut);
      if (fin) {
        const f = new Date(fin);
        f.setDate(f.getDate() + 1);
        q = q.lt("soumis_at", f.toISOString().slice(0, 10));
      }
      return q;
    })(),
  ]);

  const champs = (champsData as ChampTemplate[]) ?? [];
  const rapports = (rapportsReq.data as { contenu: ValeurChamp[] }[]) ?? [];
  const contenus = rapports.map((r) => r.contenu as ValeurChamp[]);
  const analyses = analyserReponses(champs, contenus);

  return (
    <>
      <PageHeader
        title="Analyses"
        subtitle="Réponses agrégées, comme un résumé de formulaire."
      />

      {/* Filtres */}
      <form className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="sm:w-56">
          <label className="muted mb-1 block text-xs font-medium">Template</label>
          <Select name="template" defaultValue={templateId}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.nom}</option>
            ))}
          </Select>
        </div>
        <div className="sm:w-48">
          <label className="muted mb-1 block text-xs font-medium">Employé</label>
          <Select name="employe" defaultValue={employe ?? ""}>
            <option value="">Tous</option>
            {employes.map((e) => (
              <option key={e.id} value={e.id}>{e.nom}</option>
            ))}
          </Select>
        </div>
        <div className="sm:w-36">
          <label className="muted mb-1 block text-xs font-medium">Du</label>
          <Input name="debut" type="date" defaultValue={debut ?? ""} />
        </div>
        <div className="sm:w-36">
          <label className="muted mb-1 block text-xs font-medium">Au</label>
          <Input name="fin" type="date" defaultValue={fin ?? ""} />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" type="submit" className="w-full sm:w-auto">Appliquer</Button>
          {(employe || debut || fin) && (
            <a href={`/analyses?template=${templateId}`} className="whitespace-nowrap text-sm text-brand-600 hover:underline">Réinitialiser</a>
          )}
        </div>
      </form>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Réponses" value={rapports.length} highlight icon={<Icon.doc width={18} />} />
        <StatCard label="Questions" value={champs.length} icon={<Icon.layers width={18} />} />
      </div>

      {rapports.length === 0 ? (
        <EmptyState title="Aucune réponse" description="Aucun rapport ne correspond aux filtres." icon="📭" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {analyses.map((a) => (
            <Card key={a.champId}>
              <CardHeader
                title={a.label}
                subtitle={`${LABEL_TYPE_CHAMP[a.type]} · ${a.nbReponses} réponse(s)`}
                action={a.section ? <Badge tone="neutral">{a.section}</Badge> : undefined}
              />

              {a.kind === "distribution" && a.distribution && (
                <>
                  {a.moyenne !== undefined && (
                    <p className="mb-3 text-sm">
                      Moyenne : <span className="font-semibold text-brand-600">{a.moyenne} / 5</span>
                    </p>
                  )}
                  <BarList data={a.distribution} />
                </>
              )}

              {a.kind === "nombre" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-brand-50 p-3 dark:bg-white/5">
                    <p className="muted text-xs">Total</p>
                    <p className="text-xl font-bold">{a.total}</p>
                  </div>
                  <div className="rounded-xl bg-brand-50 p-3 dark:bg-white/5">
                    <p className="muted text-xs">Moyenne</p>
                    <p className="text-xl font-bold">{a.moyenne}</p>
                  </div>
                </div>
              )}

              {a.kind === "texte" && (
                <div>
                  <p className="text-sm">
                    <span className="text-2xl font-bold">{a.nbReponses}</span>
                    <span className="muted"> réponse(s) libre(s)</span>
                  </p>
                  {a.exemples && a.exemples.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm muted">
                      {a.exemples.map((ex, i) => (
                        <li key={i} className="truncate">« {ex} »</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
