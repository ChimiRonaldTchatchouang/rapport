import Link from "next/link";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader } from "@/components/legacy/card";
import { Button } from "@/components/legacy/button";
import { Label } from "@/components/legacy/field";
import { EmptyState } from "@/components/legacy/empty";
import { Icon } from "@/components/icons";
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
        <EmptyState
          title="Aucun rapport à remplir"
          description="Votre manager ne vous a pas encore assigné de rôle avec un template. Contactez-le."
          icon="📝"
        />
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
              <Card className="h-full transition hover:border-brand-400 hover:shadow-md">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-white/5">
                  <Icon.doc width={20} />
                </span>
                <h3 className="font-semibold">{t.nom}</h3>
                {t.description && <p className="muted mt-1 text-sm">{t.description}</p>}
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
            <Link href="/nouveau-rapport">
              <Button variant="ghost" size="sm">← Changer de type</Button>
            </Link>
          ) : null
        }
      />

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
      )}

      {similaire && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          ⚠️ Ce rapport ressemble beaucoup à votre précédent. Vérifiez son contenu,
          puis cochez la confirmation en bas pour le soumettre quand même.
        </div>
      )}

      <Card className="mx-auto max-w-2xl">
        <CardHeader title="Formulaire" subtitle={`${champs.length} champ(s)`} />
        <form action={soumettreRapport} className="space-y-5">
          <input type="hidden" name="template_id" value={templateId} />

          {groupes.map((g, gi) => (
            <div key={gi} className="space-y-5">
              {g.section && (
                <h3 className="border-b border-[var(--border)] pb-2 text-sm font-semibold uppercase tracking-wide text-brand-600">
                  {g.section}
                </h3>
              )}
              {g.items.map((c) => (
                <div key={c.id}>
                  <Label>
                    {c.label}
                    {c.obligatoire && <span className="ml-1 text-red-500">*</span>}
                  </Label>
                  <ChampInput champ={c} />
                </div>
              ))}
            </div>
          ))}

          {similaire && (
            <label className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm dark:bg-amber-500/10">
              <input type="checkbox" name="confirmer_similaire" value="1" required className="accent-amber-600" />
              Je confirme que ce rapport est bien distinct.
            </label>
          )}

          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
            <p className="muted text-xs">L'heure de soumission est enregistrée automatiquement.</p>
            <Button type="submit">
              <Icon.check width={18} /> Soumettre
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
