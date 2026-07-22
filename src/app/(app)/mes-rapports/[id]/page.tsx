import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { RapportView } from "@/components/rapport/rapport-view";
import type { Rapport, ValeurChamp } from "@/lib/types/rapport";

export default async function MonRapportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employe = await requireRole("employe");
  const supabase = await createClient();

  const { data } = await supabase
    .from("rapports")
    .select("*")
    .eq("id", id)
    .eq("employe_id", employe.id) // sécurité en plus de la RLS
    .maybeSingle();

  if (!data) notFound();
  const rapport = data as Rapport;

  return (
    <>
      <PageHeader
        title="Détail du rapport"
        actions={
          <div className="flex gap-2">
            <Link href="/mes-rapports">
              <Button variant="ghost" size="sm">← Retour</Button>
            </Link>
            <ButtonLink href={`/impression/rapport/${rapport.id}`} target="_blank" variant="secondary" size="sm">
              <Icon.download width={16} /> PDF
            </ButtonLink>
          </div>
        }
      />
      <Card className="mx-auto max-w-2xl">
        <RapportView
          templateNom={rapport.template_nom}
          contenu={rapport.contenu as ValeurChamp[]}
          soumisAt={rapport.soumis_at}
          source={rapport.source}
        />
      </Card>
    </>
  );
}
