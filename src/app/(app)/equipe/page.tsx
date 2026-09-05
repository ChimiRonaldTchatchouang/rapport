import { Plus, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import type { Equipe, RoleMetier, Utilisateur } from "@/lib/types/database";
import { creerEmploye, reassignerRole, reassignerEquipe, basculerActif } from "./actions";

type EmployeRow = Utilisateur & { roles_metier: { nom: string } | null };

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const user = await requireRole("manager");
  const supabase = await createClient();

  const [{ data: employesData }, { data: rolesData }, { data: equipesData }] = await Promise.all([
    supabase.from("utilisateurs").select("*, roles_metier(nom)").eq("entreprise_id", user.entreprise_id).in("role_systeme", ["employe", "chef_equipe"]).order("created_at", { ascending: false }),
    supabase.from("roles_metier").select("id, nom").eq("entreprise_id", user.entreprise_id),
    supabase.from("equipes").select("id, nom").eq("entreprise_id", user.entreprise_id),
  ]);

  const employes = (employesData as unknown as EmployeRow[]) ?? [];
  const roles = (rolesData as Pick<RoleMetier, "id" | "nom">[]) ?? [];
  const equipes = (equipesData as Pick<Equipe, "id" | "nom">[]) ?? [];
  const nomEquipe = new Map(equipes.map((e) => [e.id, e.nom]));

  return (
    <>
      <PageHeader title="Employés" subtitle="Créez les comptes, assignez rôle métier et équipe. Les accès sont envoyés par email." />

      {message && <p className="mb-4 rounded-md bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{message}</p>}
      {error && <p className="mb-4 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Nouveau compte</CardTitle></CardHeader>
          <CardContent>
            <form action={creerEmploye} className="space-y-4">
              <Field label="Nom complet"><Input name="nom" required placeholder="Prénom Nom" /></Field>
              <Field label="Email"><Input name="email" type="email" required placeholder="personne@entreprise.com" /></Field>
              <Field label="Mot de passe" hint=" (8 car. min.)"><Input name="password" type="password" required minLength={8} /></Field>
              <Field label="Type de compte">
                <Select name="role_systeme" defaultValue="employe">
                  <option value="employe">Employé</option>
                  <option value="chef_equipe">Chef d&apos;équipe</option>
                </Select>
              </Field>
              <Field label="Équipe">
                <Select name="equipe_id" defaultValue="">
                  <option value="">— Aucune —</option>
                  {equipes.map((eq) => <option key={eq.id} value={eq.id}>{eq.nom}</option>)}
                </Select>
              </Field>
              <Field label="Rôle métier">
                <Select name="role_metier_id" defaultValue="">
                  <option value="">— Aucun —</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </Select>
              </Field>
              <Button type="submit" className="w-full"><Plus className="size-4" /> Créer le compte</Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {employes.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Users className="size-8 text-muted-foreground" />
              <div><p className="font-semibold">Aucun compte</p><p className="mt-1 text-sm text-muted-foreground">Créez le premier employé ou chef d&apos;équipe.</p></div>
            </CardContent></Card>
          ) : (
            <Card>
              <CardHeader><CardTitle>Personnes</CardTitle><CardDescription>{employes.length} compte(s)</CardDescription></CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {employes.map((e) => (
                    <li key={e.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                          {e.nom.split(" ").map((m) => m[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                        <div>
                          <p className="flex flex-wrap items-center gap-1.5 font-medium">
                            {e.nom}
                            {e.role_systeme === "chef_equipe" && <Badge>Chef d&apos;équipe</Badge>}
                            {!e.actif && <Badge variant="secondary">Inactif</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">{e.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {e.roles_metier?.nom ?? "Sans rôle"} · {e.equipe_id ? (nomEquipe.get(e.equipe_id) ?? "Équipe") : "Sans équipe"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={reassignerEquipe} className="flex items-center gap-1">
                          <input type="hidden" name="employe_id" value={e.id} />
                          <Select name="equipe_id" defaultValue={e.equipe_id ?? ""} className="h-8 w-32 text-xs">
                            <option value="">Sans équipe</option>
                            {equipes.map((eq) => <option key={eq.id} value={eq.id}>{eq.nom}</option>)}
                          </Select>
                          <Button variant="outline" size="sm" type="submit">OK</Button>
                        </form>
                        <form action={reassignerRole} className="flex items-center gap-1">
                          <input type="hidden" name="employe_id" value={e.id} />
                          <Select name="role_metier_id" defaultValue={e.role_metier_id ?? ""} className="h-8 w-32 text-xs">
                            <option value="">Sans rôle</option>
                            {roles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                          </Select>
                          <Button variant="outline" size="sm" type="submit">OK</Button>
                        </form>
                        <form action={basculerActif}>
                          <input type="hidden" name="employe_id" value={e.id} />
                          <input type="hidden" name="actif" value={(!e.actif).toString()} />
                          <Button variant="ghost" size="sm" type="submit">{e.actif ? "Désactiver" : "Activer"}</Button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
