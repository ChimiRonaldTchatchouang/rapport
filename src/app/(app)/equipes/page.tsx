import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader } from "@/components/legacy/card";
import { Button } from "@/components/legacy/button";
import { Badge } from "@/components/legacy/badge";
import { Field, Input, Select } from "@/components/legacy/field";
import { EmptyState } from "@/components/legacy/empty";
import { Icon } from "@/components/icons";
import type { Equipe, Utilisateur } from "@/lib/types/database";
import { creerEquipe, assignerChef, supprimerEquipe } from "./actions";

export default async function EquipesPage() {
  const user = await requireRole("manager");
  const supabase = await createClient();

  const [{ data: equipesData }, { data: chefsData }, { data: membresData }] = await Promise.all([
    supabase
      .from("equipes")
      .select("*")
      .eq("entreprise_id", user.entreprise_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("utilisateurs")
      .select("id, nom")
      .eq("entreprise_id", user.entreprise_id)
      .eq("role_systeme", "chef_equipe"),
    supabase
      .from("utilisateurs")
      .select("id, equipe_id")
      .eq("entreprise_id", user.entreprise_id)
      .in("role_systeme", ["employe", "chef_equipe"]),
  ]);

  const equipes = (equipesData as Equipe[]) ?? [];
  const chefs = (chefsData as Pick<Utilisateur, "id" | "nom">[]) ?? [];
  const membres = (membresData as { id: string; equipe_id: string | null }[]) ?? [];
  const compteParEquipe = (id: string) => membres.filter((m) => m.equipe_id === id).length;
  const nomChef = new Map(chefs.map((c) => [c.id, c.nom]));

  return (
    <>
      <PageHeader
        title="Équipes"
        subtitle="Organisez vos employés en équipes et désignez un chef d'équipe."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Nouvelle équipe" />
          <form action={creerEquipe} className="space-y-4">
            <Field label="Nom de l'équipe">
              <Input name="nom" required placeholder="Ex. Équipe Nord" />
            </Field>
            <Button type="submit" className="w-full">
              <Icon.plus width={18} /> Créer l&apos;équipe
            </Button>
          </form>
          <p className="muted mt-4 text-xs">
            Le chef d&apos;équipe doit d&apos;abord être créé dans « Employés » avec
            le type de compte « Chef d&apos;équipe ». Il apparaîtra ensuite ici.
          </p>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {equipes.length === 0 ? (
            <EmptyState title="Aucune équipe" description="Créez votre première équipe." icon="🏷️" />
          ) : (
            equipes.map((eq) => (
              <Card key={eq.id}>
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{eq.nom}</h3>
                    <p className="muted text-sm">
                      {compteParEquipe(eq.id)} membre(s)
                      {eq.chef_id ? ` · Chef : ${nomChef.get(eq.chef_id) ?? "—"}` : " · Sans chef"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {eq.chef_id ? <Badge tone="success">Chef assigné</Badge> : <Badge tone="warning">Sans chef</Badge>}
                    <form action={supprimerEquipe}>
                      <input type="hidden" name="id" value={eq.id} />
                      <Button variant="ghost" size="sm" type="submit" className="text-red-600">Supprimer</Button>
                    </form>
                  </div>
                </div>
                <form action={assignerChef} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input type="hidden" name="equipe_id" value={eq.id} />
                  <Select name="chef_id" defaultValue={eq.chef_id ?? ""} className="sm:w-64">
                    <option value="">— Aucun chef —</option>
                    {chefs.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </Select>
                  <Button variant="secondary" size="sm" type="submit" className="w-full sm:w-auto">
                    Désigner le chef
                  </Button>
                </form>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
