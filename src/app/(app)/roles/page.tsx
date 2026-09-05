import { Plus, Briefcase } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import type { RoleMetier } from "@/lib/types/database";
import type { TemplateRapport } from "@/lib/types/rapport";
import { creerRole, supprimerRole, associerTemplates } from "./actions";

type RoleRow = RoleMetier & {
  role_templates: { template_id: string }[];
  utilisateurs: { count: number }[];
};

export default async function RolesPage() {
  const user = await requireRole("manager");
  const supabase = await createClient();

  const [{ data: rolesData }, { data: templatesData }] = await Promise.all([
    supabase
      .from("roles_metier")
      .select("*, role_templates(template_id)")
      .eq("entreprise_id", user.entreprise_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("templates_rapport")
      .select("id, nom")
      .eq("entreprise_id", user.entreprise_id)
      .eq("actif", true),
  ]);

  const roles = (rolesData as RoleRow[]) ?? [];
  const templates = (templatesData as Pick<TemplateRapport, "id" | "nom">[]) ?? [];

  return (
    <>
      <PageHeader
        title="Rôles métier"
        subtitle="Définissez les rôles internes et les templates de rapport associés."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Nouveau rôle</CardTitle>
            <CardDescription>Ex. Commercial, Technicien…</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={creerRole} className="space-y-4">
              <Field label="Nom du rôle">
                <Input name="nom" required placeholder="Ex. Commercial" />
              </Field>
              <Field label="Description" hint=" (optionnel)">
                <Input name="description" placeholder="Courte description" />
              </Field>
              <Button type="submit" className="w-full">
                <Plus className="size-4" /> Créer le rôle
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {roles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Briefcase className="size-8 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Aucun rôle métier</p>
                  <p className="mt-1 text-sm text-muted-foreground">Créez votre premier rôle pour commencer.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            roles.map((role) => {
              const associes = new Set(role.role_templates.map((rt) => rt.template_id));
              return (
                <Card key={role.id}>
                  <CardContent>
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{role.nom}</h3>
                        {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
                      </div>
                      <form action={supprimerRole}>
                        <input type="hidden" name="id" value={role.id} />
                        <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                          Supprimer
                        </Button>
                      </form>
                    </div>

                    <form action={associerTemplates} className="space-y-3">
                      <input type="hidden" name="role_id" value={role.id} />
                      <p className="text-sm font-medium">Templates de rapport</p>
                      {templates.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Aucun template. Créez-en dans l&apos;onglet Templates.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {templates.map((t) => (
                            <label
                              key={t.id}
                              className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                            >
                              <input
                                type="checkbox"
                                name="template_ids"
                                value={t.id}
                                defaultChecked={associes.has(t.id)}
                                className="size-4 accent-primary"
                              />
                              {t.nom}
                            </label>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" type="submit">Enregistrer</Button>
                        <Badge variant="secondary">{associes.size} associé(s)</Badge>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
