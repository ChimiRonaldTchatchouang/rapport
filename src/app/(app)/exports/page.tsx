import { Download, BarChart3 } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
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

      <div className="mb-4 rounded-md bg-primary/10 px-4 py-3 text-sm text-primary">
        Un fichier CSV distinct est généré par template, avec des colonnes
        adaptées à ses champs. Les périodes sont optionnelles.
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BarChart3 className="size-8 text-muted-foreground" />
            <div>
              <p className="font-semibold">Aucun template</p>
              <p className="mt-1 text-sm text-muted-foreground">Créez des templates pour exporter des rapports.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle>{t.nom}</CardTitle>
                {t.description && <CardDescription>{t.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <form action="/api/exports/csv" method="get" className="space-y-3">
                  <input type="hidden" name="template" value={t.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Du" hint=" (opt.)">
                      <Input name="debut" type="date" />
                    </Field>
                    <Field label="Au" hint=" (opt.)">
                      <Input name="fin" type="date" />
                    </Field>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                  >
                    <Download className="size-4" /> Télécharger le CSV
                  </button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
