import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
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
          <Button asChild variant="ghost" size="sm">
            <Link href="/templates">← Retour</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Champs */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Champs du template</CardTitle>
              <CardDescription>{champs.length} champ(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {champs.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucun champ. Ajoutez-en un depuis le panneau de droite.
                </p>
              ) : (
                <ul className="space-y-2">
                  {champs.map((c, i) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                    >
                      <div className="flex flex-col">
                        <form action={deplacerChamp}>
                          <input type="hidden" name="template_id" value={tpl.id} />
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="direction" value="haut" />
                          <button type="submit" disabled={i === 0} className="text-muted-foreground disabled:opacity-30" aria-label="Monter">▲</button>
                        </form>
                        <form action={deplacerChamp}>
                          <input type="hidden" name="template_id" value={tpl.id} />
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="direction" value="bas" />
                          <button type="submit" disabled={i === champs.length - 1} className="text-muted-foreground disabled:opacity-30" aria-label="Descendre">▼</button>
                        </form>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.section && (
                            <span className="mr-1 rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                              {c.section}
                            </span>
                          )}
                          {LABEL_TYPE_CHAMP[c.type]}
                          {c.options && ` · ${c.options.join(", ")}`}
                        </p>
                      </div>
                      {c.obligatoire && <Badge>Obligatoire</Badge>}
                      <form action={supprimerChamp}>
                        <input type="hidden" name="template_id" value={tpl.id} />
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="text-muted-foreground hover:text-destructive" aria-label="Supprimer">✕</button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panneau : ajouter un champ + réglages */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Ajouter un champ</CardTitle></CardHeader>
            <CardContent>
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
                <Field label="Section" hint=" (optionnel)">
                  <Input name="section" placeholder="Ex. 1 — Identification" />
                </Field>
                <Field label="Options" hint=" (choix/cases/échelle, séparés par ,)">
                  <Input name="options" placeholder="Option A, Option B, Option C" />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="obligatoire" className="size-4 accent-primary" />
                  Champ obligatoire
                </label>
                <Button type="submit" className="w-full">
                  <Plus className="size-4" /> Ajouter
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Réglages</CardTitle></CardHeader>
            <CardContent>
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
              <form action={supprimerTemplate} className="mt-4 border-t pt-4">
                <input type="hidden" name="id" value={tpl.id} />
                <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                  Supprimer le template
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
