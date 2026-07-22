import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
import type { RoleMetier, Utilisateur } from "@/lib/types/database";
import { creerEmploye, reassignerRole, basculerActif } from "./actions";

type EmployeRow = Utilisateur & { roles_metier: { nom: string } | null };

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const user = await requireRole("manager");
  const supabase = await createClient();

  const [{ data: employesData }, { data: rolesData }] = await Promise.all([
    supabase
      .from("utilisateurs")
      .select("*, roles_metier(nom)")
      .eq("entreprise_id", user.entreprise_id)
      .eq("role_systeme", "employe")
      .order("created_at", { ascending: false }),
    supabase
      .from("roles_metier")
      .select("id, nom")
      .eq("entreprise_id", user.entreprise_id),
  ]);

  const employes = (employesData as EmployeRow[]) ?? [];
  const roles = (rolesData as Pick<RoleMetier, "id" | "nom">[]) ?? [];

  return (
    <>
      <PageHeader
        title="Employés"
        subtitle="Créez les comptes et assignez un rôle métier."
      />

      {message && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{message}</p>
      )}
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Nouvel employé" />
          <form action={creerEmploye} className="space-y-4">
            <Field label="Nom complet">
              <Input name="nom" required placeholder="Prénom Nom" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required placeholder="employe@entreprise.com" />
            </Field>
            <Field label="Mot de passe" hint="(8 car. min.)">
              <Input name="password" type="password" required minLength={8} />
            </Field>
            <Field label="Rôle métier">
              <Select name="role_metier_id" defaultValue="">
                <option value="">— Aucun —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.nom}</option>
                ))}
              </Select>
            </Field>
            <Button type="submit" className="w-full">
              <Icon.plus width={18} /> Créer l'employé
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-2">
          {employes.length === 0 ? (
            <EmptyState title="Aucun employé" description="Créez le premier compte employé." icon="👥" />
          ) : (
            <Card className="overflow-hidden">
              <CardHeader title="Équipe" subtitle={`${employes.length} employé(s)`} />
              <ul className="divide-y divide-[var(--border)]">
                {employes.map((e) => (
                  <li key={e.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-white/10">
                        {e.nom.split(" ").map((m) => m[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                      <div>
                        <p className="font-medium">
                          {e.nom} {!e.actif && <Badge tone="neutral">Inactif</Badge>}
                        </p>
                        <p className="muted text-xs">{e.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={reassignerRole} className="flex items-center gap-1">
                        <input type="hidden" name="employe_id" value={e.id} />
                        <Select name="role_metier_id" defaultValue={e.role_metier_id ?? ""} className="py-1.5 text-xs">
                          <option value="">Sans rôle</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>{r.nom}</option>
                          ))}
                        </Select>
                        <Button variant="secondary" size="sm" type="submit">OK</Button>
                      </form>
                      <form action={basculerActif}>
                        <input type="hidden" name="employe_id" value={e.id} />
                        <input type="hidden" name="actif" value={(!e.actif).toString()} />
                        <Button variant="ghost" size="sm" type="submit">
                          {e.actif ? "Désactiver" : "Activer"}
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
