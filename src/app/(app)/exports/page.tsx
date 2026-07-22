import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
import type { TemplateRapport } from "@/lib/types/rapport";

// Export CSV : un formulaire par template (colonnes propres à chaque template).
export default async function ExportsPage() {
  const user = await requireRole("manager");
  const supabase = await createClient();

  const { data } = await supabase
    .from("templates_rapport")
    .select("id, nom, description")
    .eq("entreprise_id", user.entreprise_id)
    .order("nom");
  const templates = (data as Pick<TemplateRapport, "id" | "nom" | "description">[]) ?? [];

  return (
    <>
      <PageHeader
        title="Exports CSV"
        subtitle="Exportez les rapports par template et par période."
      />

      <div className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
        Un fichier CSV distinct est généré par template, avec des colonnes
        adaptées à ses champs. Les périodes sont optionnelles.
      </div>

      {templates.length === 0 ? (
        <EmptyState title="Aucun template" description="Créez des templates pour exporter des rapports." icon="📊" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader title={t.nom} subtitle={t.description ?? undefined} />
              <form action="/api/exports/csv" method="get" className="space-y-3">
                <input type="hidden" name="template" value={t.id} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Du" hint="(opt.)">
                    <Input name="debut" type="date" />
                  </Field>
                  <Field label="Au" hint="(opt.)">
                    <Input name="fin" type="date" />
                  </Field>
                </div>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
                >
                  <Icon.download width={18} /> Télécharger le CSV
                </button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
