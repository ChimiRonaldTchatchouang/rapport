import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Label } from "@/components/ui/field";
import { Icon } from "@/components/icons";
import { LABEL_TYPE_CHAMP } from "@/lib/types/rapport";
import type { ChampTemplate, TemplateRapport } from "@/lib/types/rapport";
import {
  renommerTemplate,
  supprimerTemplate,
  ajouterChamp,
  supprimerChamp,
  deplacerChamp,
} from "../actions";

export default async function TemplateBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("manager");
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("templates_rapport")
    .select("*")
    .eq("id", id)
    .eq("entreprise_id", user.entreprise_id)
    .maybeSingle();

  if (!template) notFound();
  const tpl = template as TemplateRapport;

  const { data: champsData } = await supabase
    .from("champs_template")
    .select("*")
    .eq("template_id", id)
    .order("ordre", { ascending: true });
  const champs = (champsData as ChampTemplate[]) ?? [];

  return (
    <>
      <PageHeader
        title={tpl.nom}
        subtitle="Ajoutez, ordonnez et configurez les champs du formulaire."
        actions={
          <Link href="/templates">
            <Button variant="ghost" size="sm">← Retour</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Champs */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Champs du template" subtitle={`${champs.length} champ(s)`} />
            {champs.length === 0 ? (
              <p className="muted py-6 text-center text-sm">
                Aucun champ. Ajoutez-en un depuis le panneau de droite.
              </p>
            ) : (
              <ul className="space-y-2">
                {champs.map((c, i) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5"
                  >
                    <div className="flex flex-col">
                      <form action={deplacerChamp}>
                        <input type="hidden" name="template_id" value={tpl.id} />
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="direction" value="haut" />
                        <button type="submit" disabled={i === 0} className="muted disabled:opacity-30" aria-label="Monter">▲</button>
                      </form>
                      <form action={deplacerChamp}>
                        <input type="hidden" name="template_id" value={tpl.id} />
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="direction" value="bas" />
                        <button type="submit" disabled={i === champs.length - 1} className="muted disabled:opacity-30" aria-label="Descendre">▼</button>
                      </form>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.label}</p>
                      <p className="muted text-xs">
                        {LABEL_TYPE_CHAMP[c.type]}
                        {c.options && ` · ${c.options.join(", ")}`}
                      </p>
                    </div>
                    {c.obligatoire && <Badge tone="brand">Obligatoire</Badge>}
                    <form action={supprimerChamp}>
                      <input type="hidden" name="template_id" value={tpl.id} />
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="text-slate-400 hover:text-red-600" aria-label="Supprimer">✕</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Panneau : ajouter un champ + réglages */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Ajouter un champ" />
            <form action={ajouterChamp} className="space-y-4">
              <input type="hidden" name="template_id" value={tpl.id} />
              <Field label="Label">
                <Input name="label" required placeholder="Ex. Nombre d'appels" />
              </Field>
              <Field label="Type">
                <Select name="type" defaultValue="texte_court">
                  {Object.entries(LABEL_TYPE_CHAMP).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Options" hint="(choix multiple, séparés par ,)">
                <Input name="options" placeholder="Option A, Option B, Option C" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="obligatoire" className="accent-brand-600" />
                Champ obligatoire
              </label>
              <Button type="submit" className="w-full">
                <Icon.plus width={18} /> Ajouter
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Réglages" />
            <form action={renommerTemplate} className="space-y-3">
              <input type="hidden" name="id" value={tpl.id} />
              <Field label="Nom">
                <Input name="nom" defaultValue={tpl.nom} required />
              </Field>
              <Field label="Description">
                <Input name="description" defaultValue={tpl.description ?? ""} />
              </Field>
              <Button variant="secondary" size="sm" type="submit">Enregistrer</Button>
            </form>
            <form action={supprimerTemplate} className="mt-4 border-t border-[var(--border)] pt-4">
              <input type="hidden" name="id" value={tpl.id} />
              <Button variant="ghost" size="sm" type="submit" className="text-red-600">
                Supprimer le template
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
