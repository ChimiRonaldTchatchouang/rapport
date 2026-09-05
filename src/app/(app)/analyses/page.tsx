import { FileText, Layers, BarChart3, Inbox } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BarChart3 className="size-8 text-muted-foreground" />
            <div>
              <p className="font-semibold">Aucun template</p>
              <p className="mt-1 text-sm text-muted-foreground">Créez un template et collectez des rapports pour voir les analyses.</p>
            </div>
          </CardContent>
        </Card>
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
      <Card className="mb-6">
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="sm:w-56">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Template</label>
              <Select name="template" defaultValue={templateId}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.nom}</option>
                ))}
              </Select>
            </div>
            <div className="sm:w-48">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Employé</label>
              <Select name="employe" defaultValue={employe ?? ""}>
                <option value="">Tous</option>
                {employes.map((e) => (
                  <option key={e.id} value={e.id}>{e.nom}</option>
                ))}
              </Select>
            </div>
            <div className="sm:w-36">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Du</label>
              <Input name="debut" type="date" defaultValue={debut ?? ""} />
            </div>
            <div className="sm:w-36">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Au</label>
              <Input name="fin" type="date" defaultValue={fin ?? ""} />
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" type="submit" className="w-full sm:w-auto">Appliquer</Button>
              {(employe || debut || fin) && (
                <a href={`/analyses?template=${templateId}`} className="whitespace-nowrap text-sm text-primary hover:underline">Réinitialiser</a>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Réponses" value={rapports.length} highlight icon={<FileText className="size-5" />} />
        <StatCard label="Questions" value={champs.length} icon={<Layers className="size-5" />} />
      </div>

      {rapports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <div>
              <p className="font-semibold">Aucune réponse</p>
              <p className="mt-1 text-sm text-muted-foreground">Aucun rapport ne correspond aux filtres.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {analyses.map((a) => (
            <Card key={a.champId}>
              <CardHeader>
                <CardTitle>{a.label}</CardTitle>
                <CardDescription>{`${LABEL_TYPE_CHAMP[a.type]} · ${a.nbReponses} réponse(s)`}</CardDescription>
                {a.section && <CardAction><Badge variant="secondary">{a.section}</Badge></CardAction>}
              </CardHeader>
              <CardContent>
                {a.kind === "distribution" && a.distribution && (
                  <>
                    {a.moyenne !== undefined && (
                      <p className="mb-3 text-sm">
                        Moyenne : <span className="font-semibold text-primary">{a.moyenne} / 5</span>
                      </p>
                    )}
                    <BarList data={a.distribution} />
                  </>
                )}

                {a.kind === "nombre" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-xl font-bold">{a.total}</p>
                    </div>
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-xs text-muted-foreground">Moyenne</p>
                      <p className="text-xl font-bold">{a.moyenne}</p>
                    </div>
                  </div>
                )}

                {a.kind === "texte" && (
                  <div>
                    <p className="text-sm">
                      <span className="text-2xl font-bold">{a.nbReponses}</span>
                      <span className="text-muted-foreground"> réponse(s) libre(s)</span>
                    </p>
                    {a.exemples && a.exemples.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {a.exemples.map((ex, i) => (
                          <li key={i} className="truncate">« {ex} »</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
