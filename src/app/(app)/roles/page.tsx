import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
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
          <CardHeader title="Nouveau rôle" subtitle="Ex. Commercial, Technicien…" />
          <form action={creerRole} className="space-y-4">
            <Field label="Nom du rôle">
              <Input name="nom" required placeholder="Ex. Commercial" />
            </Field>
            <Field label="Description" hint="(optionnel)">
              <Input name="description" placeholder="Courte description" />
            </Field>
            <Button type="submit" className="w-full">
              <Icon.plus width={18} /> Créer le rôle
            </Button>
          </form>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {roles.length === 0 ? (
            <EmptyState title="Aucun rôle métier" description="Créez votre premier rôle pour commencer." icon="💼" />
          ) : (
            roles.map((role) => {
              const associes = new Set(role.role_templates.map((rt) => rt.template_id));
              return (
                <Card key={role.id}>
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{role.nom}</h3>
                      {role.description && <p className="muted text-sm">{role.description}</p>}
                    </div>
                    <form action={supprimerRole}>
                      <input type="hidden" name="id" value={role.id} />
                      <Button variant="ghost" size="sm" type="submit" className="text-red-600">
                        Supprimer
                      </Button>
                    </form>
                  </div>

                  <form action={associerTemplates} className="space-y-3">
                    <input type="hidden" name="role_id" value={role.id} />
                    <p className="text-sm font-medium">Templates de rapport</p>
                    {templates.length === 0 ? (
                      <p className="muted text-sm">
                        Aucun template. Créez-en dans l'onglet Templates.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {templates.map((t) => (
                          <label
                            key={t.id}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-1.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 dark:has-[:checked]:bg-brand-500/10"
                          >
                            <input
                              type="checkbox"
                              name="template_ids"
                              value={t.id}
                              defaultChecked={associes.has(t.id)}
                              className="accent-brand-600"
                            />
                            {t.nom}
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" type="submit">Enregistrer</Button>
                      <Badge tone="brand">{associes.size} associé(s)</Badge>
                    </div>
                  </form>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
