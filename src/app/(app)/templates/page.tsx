import Link from "next/link";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
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
        <CardHeader
          title="Démarrer rapidement"
          subtitle="Dupliquez un modèle par métier, puis adaptez-le."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATES_PREDEFINIS.map((bp) => (
            <form key={bp.cle} action={dupliquerPrebuilt}>
              <input type="hidden" name="cle" value={bp.cle} />
              <button
                type="submit"
                className="group flex h-full w-full flex-col rounded-xl border border-[var(--border)] p-4 text-left transition hover:border-brand-400 hover:shadow-sm"
              >
                <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-white/5">
                  <Icon.layers width={18} />
                </span>
                <span className="font-medium">{bp.nom}</span>
                <span className="muted mt-1 text-xs">{bp.champs.length} champs</span>
                <span className="mt-3 text-xs font-medium text-brand-600 opacity-0 transition group-hover:opacity-100">
                  Dupliquer →
                </span>
              </button>
            </form>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Template vierge" />
          <form action={creerTemplateVide} className="space-y-4">
            <Field label="Nom">
              <Input name="nom" placeholder="Ex. Rapport hebdo" required />
            </Field>
            <Button type="submit" className="w-full">
              <Icon.plus width={18} /> Créer
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-2">
          {templates.length === 0 ? (
            <EmptyState title="Aucun template" description="Dupliquez un modèle ou créez-en un." icon="📋" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {templates.map((t) => (
                <Link key={t.id} href={`/templates/${t.id}`}>
                  <Card className="h-full transition hover:border-brand-400 hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">{t.nom}</h3>
                      {t.actif ? <Badge tone="success">Actif</Badge> : <Badge tone="neutral">Inactif</Badge>}
                    </div>
                    {t.description && <p className="muted mt-1 text-sm">{t.description}</p>}
                    <p className="muted mt-4 text-xs">
                      {t.champs_template?.[0]?.count ?? 0} champ(s) · Modifier →
                    </p>
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
