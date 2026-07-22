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

export default async function RapportManagerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("manager");
  const supabase = await createClient();

  const { data } = await supabase
    .from("rapports")
    .select("*, utilisateurs(nom)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const rapport = data as unknown as Rapport & { utilisateurs: { nom: string } | null };

  return (
    <>
      <PageHeader
        title="Détail du rapport"
        actions={
          <div className="flex gap-2">
            <Link href="/rapports">
              <Button variant="ghost" size="sm">← Retour</Button>
            </Link>
            <ButtonLink href={`/impression/rapport/${rapport.id}`} target="_blank" variant="secondary" size="sm">
              <Icon.download width={16} /> PDF enrichi
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
          auteur={rapport.utilisateurs?.nom}
        />
      </Card>
    </>
  );
}
