import Link from "next/link";
import { FileText, Check } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChampInput } from "@/components/rapport/champ-input";
import type { ChampTemplate, TemplateRapport } from "@/lib/types/rapport";
import { soumettreRapport } from "./actions";

export default async function NouveauRapportPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; similaire?: string; error?: string }>;
}) {
  const { template: templateParam, similaire, error } = await searchParams;
  const employe = await requireRole("employe", "chef_equipe");
  const supabase = await createClient();

  // Templates liés au rôle métier de l'employé.
  let templates: Pick<TemplateRapport, "id" | "nom" | "description">[] = [];
  if (employe.role_metier_id) {
    const { data } = await supabase
      .from("role_templates")
      .select("templates_rapport(id, nom, description, actif)")
      .eq("role_metier_id", employe.role_metier_id);
    templates = ((data as unknown as { templates_rapport: TemplateRapport | null }[]) ?? [])
      .map((r) => r.templates_rapport)
      .filter((t): t is TemplateRapport => !!t && t.actif);
  }

  if (!employe.role_metier_id || templates.length === 0) {
    return (
      <>
        <PageHeader title="Nouveau rapport" />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <div>
              <p className="font-semibold">Aucun rapport à remplir</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Votre manager ne vous a pas encore assigné de rôle avec un template. Contactez-le.
              </p>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  // Sélection du template : param, ou le seul disponible.
  const templateId = templateParam ?? (templates.length === 1 ? templates[0].id : null);

  if (!templateId) {
    return (
      <>
        <PageHeader title="Nouveau rapport" subtitle="Choisissez le type de rapport à remplir." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Link key={t.id} href={`/nouveau-rapport?template=${t.id}`}>
              <Card className="h-full transition hover:border-primary hover:shadow-md">
                <CardContent>
                  <span className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="size-5" />
                  </span>
                  <h3 className="font-semibold">{t.nom}</h3>
                  {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </>
    );
  }

  const template = templates.find((t) => t.id === templateId);
  const { data: champsData } = await supabase
    .from("champs_template")
    .select("*")
    .eq("template_id", templateId)
    .order("ordre", { ascending: true });
  const champs = (champsData as ChampTemplate[]) ?? [];

  // Regroupement des champs par section (dans l'ordre).
  const groupes: { section: string | null; items: ChampTemplate[] }[] = [];
  for (const c of champs) {
    const last = groupes[groupes.length - 1];
    if (last && last.section === (c.section ?? null)) last.items.push(c);
    else groupes.push({ section: c.section ?? null, items: [c] });
  }

  return (
    <>
      <PageHeader
        title={template?.nom ?? "Nouveau rapport"}
        subtitle="Remplissez et soumettez votre rapport."
        actions={
          templates.length > 1 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/nouveau-rapport">← Changer de type</Link>
            </Button>
          ) : null
        }
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
      )}

      {similaire && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          ⚠️ Ce rapport ressemble beaucoup à votre précédent. Vérifiez son contenu,
          puis cochez la confirmation en bas pour le soumettre quand même.
        </div>
      )}

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Formulaire</CardTitle>
          <CardDescription>{champs.length} champ(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={soumettreRapport} className="space-y-5">
            <input type="hidden" name="template_id" value={templateId} />

            {groupes.map((g, gi) => (
              <div key={gi} className="space-y-5">
                {g.section && (
                  <h3 className="border-b pb-2 text-sm font-semibold uppercase tracking-wide text-primary">
                    {g.section}
                  </h3>
                )}
                {g.items.map((c) => (
                  <div key={c.id}>
                    <Label className="mb-1.5">
                      {c.label}
                      {c.obligatoire && <span className="ml-1 text-destructive">*</span>}
                    </Label>
                    <ChampInput champ={c} />
                  </div>
                ))}
              </div>
            ))}

            {similaire && (
              <label className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-sm dark:bg-amber-500/10">
                <input type="checkbox" name="confirmer_similaire" value="1" required className="size-4 accent-amber-600" />
                Je confirme que ce rapport est bien distinct.
              </label>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-xs text-muted-foreground">L&apos;heure de soumission est enregistrée automatiquement.</p>
              <Button type="submit">
                <Check className="size-4" /> Soumettre
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
