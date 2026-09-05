import Link from "next/link";
import { Plus, Layers, ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { TEMPLATES_PREDEFINIS } from "@/lib/templates/prebuilt";
import type { TemplateRapport } from "@/lib/types/rapport";
import { creerTemplateVide, dupliquerPrebuilt } from "./actions";

type TplRow = TemplateRapport & { champs_template: { count: number }[] };

export default async function TemplatesPage() {
  const user = await requireRole("manager");
  const supabase = await createClient();

  const { data } = await supabase
    .from("templates_rapport")
    .select("*, champs_template(count)")
    .eq("entreprise_id", user.entreprise_id)
    .order("created_at", { ascending: true });

  const templates = (data as TplRow[]) ?? [];

  return (
    <>
      <PageHeader
        title="Templates de rapport"
        subtitle="Composez les formulaires que vos employés rempliront."
      />

      {/* Templates pré-construits */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Démarrer rapidement</CardTitle>
          <CardDescription>Dupliquez un modèle par métier, puis adaptez-le.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES_PREDEFINIS.map((bp) => (
              <form key={bp.cle} action={dupliquerPrebuilt}>
                <input type="hidden" name="cle" value={bp.cle} />
                <button
                  type="submit"
                  className="group flex h-full w-full flex-col rounded-lg border p-4 text-left transition hover:border-primary hover:shadow-sm"
                >
                  <span className="mb-2 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Layers className="size-[18px]" />
                  </span>
                  <span className="font-medium">{bp.nom}</span>
                  <span className="mt-1 text-xs text-muted-foreground">{bp.champs.length} champs</span>
                  <span className="mt-3 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
                    Dupliquer →
                  </span>
                </button>
              </form>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Template vierge</CardTitle></CardHeader>
          <CardContent>
            <form action={creerTemplateVide} className="space-y-4">
              <Field label="Nom">
                <Input name="nom" placeholder="Ex. Rapport hebdo" required />
              </Field>
              <Button type="submit" className="w-full">
                <Plus className="size-4" /> Créer
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <ClipboardList className="size-8 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Aucun template</p>
                  <p className="mt-1 text-sm text-muted-foreground">Dupliquez un modèle ou créez-en un.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {templates.map((t) => (
                <Link key={t.id} href={`/templates/${t.id}`}>
                  <Card className="h-full transition hover:border-primary hover:shadow-md">
                    <CardContent>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{t.nom}</h3>
                        {t.actif ? <Badge variant="success">Actif</Badge> : <Badge variant="secondary">Inactif</Badge>}
                      </div>
                      {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                      <p className="mt-4 text-xs text-muted-foreground">
                        {t.champs_template?.[0]?.count ?? 0} champ(s) · Modifier →
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
