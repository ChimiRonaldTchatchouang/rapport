import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { formatDate } from "@/lib/utils";
import { LABEL_STATUT, toneStatut, statutEffectif } from "@/lib/licence";
import type { Entreprise, Licence } from "@/lib/types/database";

type EntRow = Entreprise & { licences: Licence[] };

// Vue Super Admin : entreprises clientes et leur licence.
// Conformément à la politique de confidentialité, le Super Admin ne voit PAS le
// contenu des rapports (aucun accès à la table `rapports`).
export default async function EntreprisesPage() {
  await requireRole("super_admin");
  const supabase = await createClient();

  const { data } = await supabase
    .from("entreprises")
    .select("*, licences(*)")
    .order("created_at", { ascending: false });

  const entreprises = (data as EntRow[]) ?? [];

  return (
    <>
      <PageHeader
        title="Entreprises clientes"
        subtitle="Les entreprises ayant activé une licence."
      />

      {entreprises.length === 0 ? (
        <EmptyState
          title="Aucune entreprise"
          description="Les entreprises apparaîtront ici après activation d'une licence."
          icon="🏢"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entreprises.map((e) => {
            const licence = e.licences?.[0];
            const statut = licence ? statutEffectif(licence) : null;
            return (
              <Card key={e.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{e.nom}</h3>
                    <p className="muted text-sm">{e.contact_email ?? "—"}</p>
                  </div>
                  {statut && <Badge tone={toneStatut(statut)}>{LABEL_STATUT[statut]}</Badge>}
                </div>
                <div className="mt-4 space-y-1 text-sm">
                  <p className="muted">
                    Créée le <span className="text-[var(--text)]">{formatDate(e.created_at)}</span>
                  </p>
                  {licence?.date_expiration && (
                    <p className="muted">
                      Licence expire le{" "}
                      <span className="text-[var(--text)]">{formatDate(licence.date_expiration)}</span>
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
