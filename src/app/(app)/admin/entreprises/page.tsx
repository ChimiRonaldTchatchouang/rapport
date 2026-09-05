import { Building2 } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { LABEL_STATUT, statutEffectif } from "@/lib/licence";
import { badgeStatut } from "@/lib/ui/statut";
import type { Entreprise, Licence } from "@/lib/types/database";

type EntRow = Entreprise & { licences: Licence[] };

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
      <PageHeader title="Entreprises clientes" subtitle="Les entreprises ayant activé une licence." />

      {entreprises.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Building2 className="size-8 text-muted-foreground" />
            <div>
              <p className="font-semibold">Aucune entreprise</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Les entreprises apparaîtront ici après activation d&apos;une licence.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entreprises.map((e) => {
            const licence = e.licences?.[0];
            const statut = licence ? statutEffectif(licence) : null;
            return (
              <Card key={e.id}>
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{e.nom}</h3>
                      <p className="text-sm text-muted-foreground">{e.contact_email ?? "—"}</p>
                    </div>
                    {statut && <Badge variant={badgeStatut(statut)}>{LABEL_STATUT[statut]}</Badge>}
                  </div>
                  <div className="mt-4 space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      Créée le <span className="text-foreground">{formatDate(e.created_at)}</span>
                    </p>
                    {licence?.date_expiration && (
                      <p className="text-muted-foreground">
                        Licence expire le{" "}
                        <span className="text-foreground">{formatDate(licence.date_expiration)}</span>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
