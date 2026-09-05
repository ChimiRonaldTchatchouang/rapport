import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader } from "@/components/legacy/card";
import { Button } from "@/components/legacy/button";
import { Badge } from "@/components/legacy/badge";
import { Field, Textarea, Select, Input } from "@/components/legacy/field";
import { EmptyState } from "@/components/legacy/empty";
import { Icon } from "@/components/icons";
import { formatDate } from "@/lib/utils";
import { semaine, isoDate } from "@/lib/data/periodes";
import type { Equipe, Objectif, RoleMetier } from "@/lib/types/database";
import { definirObjectif, supprimerObjectif } from "./actions";

export default async function ObjectifsPage() {
  const user = await requireRole("manager");
  const supabase = await createClient();

  const [{ data: objData }, { data: rolesData }, { data: equipesData }] = await Promise.all([
    supabase
      .from("objectifs")
      .select("*")
      .eq("entreprise_id", user.entreprise_id)
      .order("periode_debut", { ascending: false }),
    supabase.from("roles_metier").select("id, nom").eq("entreprise_id", user.entreprise_id),
    supabase.from("equipes").select("id, nom").eq("entreprise_id", user.entreprise_id),
  ]);

  const objectifs = (objData as Objectif[]) ?? [];
  const roles = (rolesData as Pick<RoleMetier, "id" | "nom">[]) ?? [];
  const equipes = (equipesData as Pick<Equipe, "id" | "nom">[]) ?? [];
  const nomRole = new Map(roles.map((r) => [r.id, r.nom]));
  const nomEquipe = new Map(equipes.map((e) => [e.id, e.nom]));
  const cible = (o: Objectif) =>
    o.equipe_id
      ? `Équipe : ${nomEquipe.get(o.equipe_id) ?? "—"}`
      : o.role_metier_id
        ? nomRole.get(o.role_metier_id) ?? "Rôle"
        : "Toute l'entreprise";
  const semaineCourante = isoDate(semaine(new Date()).debut);

  return (
    <>
      <PageHeader
        title="Objectifs hebdomadaires"
        subtitle="Définissez les objectifs de la semaine — l'IA les utilise pour évaluer l'équipe."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Nouvel objectif" />
          <form action={definirObjectif} className="space-y-4">
            <Field label="Semaine" hint="(lundi)">
              <Input name="periode_debut" type="date" defaultValue={semaineCourante} />
            </Field>
            <Field label="Rôle métier" hint="(optionnel)">
              <Select name="role_metier_id" defaultValue="">
                <option value="">— Tous —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.nom}</option>
                ))}
              </Select>
            </Field>
            <Field label="Équipe" hint="(optionnel)">
              <Select name="equipe_id" defaultValue="">
                <option value="">— Toutes —</option>
                {equipes.map((e) => (
                  <option key={e.id} value={e.id}>{e.nom}</option>
                ))}
              </Select>
            </Field>
            <p className="muted text-xs">
              Sans rôle ni équipe : l&apos;objectif s&apos;applique à toute l&apos;entreprise.
            </p>
            <Field label="Objectifs">
              <Textarea name="contenu" required placeholder="Ex. Réaliser 50 appels, conclure 5 ventes, relancer les devis en attente…" />
            </Field>
            <Button type="submit" className="w-full">
              <Icon.plus width={18} /> Définir l'objectif
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-2">
          {objectifs.length === 0 ? (
            <EmptyState title="Aucun objectif" description="Définissez les objectifs de la semaine." icon="🎯" />
          ) : (
            <div className="space-y-4">
              {objectifs.map((o) => (
                <Card key={o.id}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge tone={o.periode_debut === semaineCourante ? "brand" : "neutral"}>
                      Sem. du {formatDate(o.periode_debut)}
                    </Badge>
                    <Badge tone="info">{cible(o)}</Badge>
                    <form action={supprimerObjectif} className="ml-auto">
                      <input type="hidden" name="id" value={o.id} />
                      <Button variant="ghost" size="sm" type="submit" className="text-red-600">Supprimer</Button>
                    </form>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{o.contenu}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
