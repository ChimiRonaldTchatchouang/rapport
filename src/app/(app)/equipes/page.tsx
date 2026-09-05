import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import type { Equipe, Utilisateur } from "@/lib/types/database";
import { creerEquipe, assignerChef, supprimerEquipe } from "./actions";

export default async function EquipesPage() {
  const user = await requireRole("manager");
  const supabase = await createClient();

  const [{ data: equipesData }, { data: chefsData }, { data: membresData }] = await Promise.all([
    supabase.from("equipes").select("*").eq("entreprise_id", user.entreprise_id).order("created_at", { ascending: true }),
    supabase.from("utilisateurs").select("id, nom").eq("entreprise_id", user.entreprise_id).eq("role_systeme", "chef_equipe"),
    supabase.from("utilisateurs").select("id, equipe_id").eq("entreprise_id", user.entreprise_id).in("role_systeme", ["employe", "chef_equipe"]),
  ]);

  const equipes = (equipesData as Equipe[]) ?? [];
  const chefs = (chefsData as Pick<Utilisateur, "id" | "nom">[]) ?? [];
  const membres = (membresData as { id: string; equipe_id: string | null }[]) ?? [];
  const compteParEquipe = (id: string) => membres.filter((m) => m.equipe_id === id).length;
  const nomChef = new Map(chefs.map((c) => [c.id, c.nom]));

  return (
    <>
      <PageHeader title="Équipes" subtitle="Organisez vos employés en équipes et désignez un chef d'équipe." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Nouvelle équipe</CardTitle></CardHeader>
          <CardContent>
            <form action={creerEquipe} className="space-y-4">
              <Field label="Nom de l'équipe"><Input name="nom" required placeholder="Ex. Équipe Nord" /></Field>
              <Button type="submit" className="w-full"><Plus className="size-4" /> Créer l&apos;équipe</Button>
            </form>
            <p className="mt-4 text-xs text-muted-foreground">
              Le chef d&apos;équipe doit d&apos;abord être créé dans « Employés » avec le type « Chef d&apos;équipe ». Il apparaîtra ensuite ici.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {equipes.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Aucune équipe. Créez votre première équipe.</CardContent></Card>
          ) : (
            equipes.map((eq) => (
              <Card key={eq.id}>
                <CardContent>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{eq.nom}</h3>
                      <p className="text-sm text-muted-foreground">
                        {compteParEquipe(eq.id)} membre(s)
                        {eq.chef_id ? ` · Chef : ${nomChef.get(eq.chef_id) ?? "—"}` : " · Sans chef"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {eq.chef_id ? <Badge variant="success">Chef assigné</Badge> : <Badge variant="warning">Sans chef</Badge>}
                      <form action={supprimerEquipe}>
                        <input type="hidden" name="id" value={eq.id} />
                        <Button variant="ghost" size="sm" type="submit" className="text-destructive">Supprimer</Button>
                      </form>
                    </div>
                  </div>
                  <form action={assignerChef} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input type="hidden" name="equipe_id" value={eq.id} />
                    <Select name="chef_id" defaultValue={eq.chef_id ?? ""} className="sm:w-64">
                      <option value="">— Aucun chef —</option>
                      {chefs.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </Select>
                    <Button variant="outline" size="sm" type="submit" className="w-full sm:w-auto">Désigner le chef</Button>
                  </form>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
