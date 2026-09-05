import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/legacy/card";
import { Badge } from "@/components/legacy/badge";
import { EmptyState } from "@/components/legacy/empty";
import { formatDate } from "@/lib/utils";
import { semaine, isoDate } from "@/lib/data/periodes";
import type { Objectif } from "@/lib/types/database";

// Objectifs fixés par le manager, visibles par l'employé : ceux de toute
// l'entreprise + ceux de son rôle métier + ceux de son équipe.
export default async function MesObjectifsPage() {
  const user = await requireRole("employe", "chef_equipe");
  const supabase = await createClient();

  const { data } = await supabase
    .from("objectifs")
    .select("*")
    .eq("entreprise_id", user.entreprise_id)
    .order("periode_debut", { ascending: false });

  const tous = (data as Objectif[]) ?? [];
  const pertinents = tous.filter(
    (o) =>
      (o.role_metier_id === null && o.equipe_id === null) ||
      (o.role_metier_id && o.role_metier_id === user.role_metier_id) ||
      (o.equipe_id && o.equipe_id === user.equipe_id)
  );

  const semaineCourante = isoDate(semaine(new Date()).debut);

  // Groupement par semaine.
  const groupes = new Map<string, Objectif[]>();
  for (const o of pertinents) {
    if (!groupes.has(o.periode_debut)) groupes.set(o.periode_debut, []);
    groupes.get(o.periode_debut)!.push(o);
  }

  return (
    <>
      <PageHeader
        title="Mes objectifs"
        subtitle="Les objectifs fixés par votre manager."
      />

      {pertinents.length === 0 ? (
        <EmptyState
          title="Aucun objectif"
          description="Votre manager n'a pas encore défini d'objectif vous concernant."
          icon="🎯"
        />
      ) : (
        <div className="space-y-6">
          {[...groupes.entries()].map(([sem, liste]) => (
            <div key={sem}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide muted">
                  Semaine du {formatDate(sem)}
                </h2>
                {sem === semaineCourante && <Badge tone="brand">En cours</Badge>}
              </div>
              <div className="space-y-3">
                {liste.map((o) => (
                  <Card key={o.id}>
                    <div className="mb-2">
                      <Badge tone="info">
                        {o.equipe_id ? "Mon équipe" : o.role_metier_id ? "Mon rôle" : "Toute l'entreprise"}
                      </Badge>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{o.contenu}</p>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
