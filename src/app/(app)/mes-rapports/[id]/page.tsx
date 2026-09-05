import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RapportView } from "@/components/rapport/rapport-view";
import type { Rapport, ValeurChamp } from "@/lib/types/rapport";

export default async function MonRapportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employe = await requireRole("employe", "chef_equipe");
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
            <Button asChild variant="ghost" size="sm">
              <Link href="/mes-rapports">← Retour</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/rapport/${rapport.id}/pdf`} target="_blank" rel="noreferrer">
                <Download className="size-4" /> PDF
              </a>
            </Button>
          </div>
        }
      />
      <Card className="mx-auto max-w-2xl">
        <CardContent>
          <RapportView
            templateNom={rapport.template_nom}
            contenu={rapport.contenu as ValeurChamp[]}
            soumisAt={rapport.soumis_at}
            source={rapport.source}
          />
        </CardContent>
      </Card>
    </>
  );
}
