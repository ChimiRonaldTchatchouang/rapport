import Link from "next/link";
import { Download } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatDateHeure } from "@/lib/utils";
import type { Utilisateur } from "@/lib/types/database";

type RapportRow = {
  id: string;
  template_nom: string | null;
  soumis_at: string;
  source: "app" | "email";
  similaire_precedent: boolean;
  utilisateurs: { nom: string } | null;
};

export default async function RapportsManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ employe?: string }>;
}) {
  const { employe } = await searchParams;
  const user = await requireRole("manager", "chef_equipe");
  const estManager = user.role_systeme === "manager";
  const supabase = await createClient();

  const [{ data: employesData }, rapportsReq] = await Promise.all([
    supabase
      .from("utilisateurs")
      .select("id, nom")
      .eq("entreprise_id", user.entreprise_id)
      .eq("role_systeme", "employe")
      .order("nom"),
    (async () => {
      let q = supabase
        .from("rapports")
        .select("id, template_nom, soumis_at, source, similaire_precedent, utilisateurs(nom)")
        .eq("entreprise_id", user.entreprise_id)
        .order("soumis_at", { ascending: false })
        .limit(100);
      if (employe) q = q.eq("employe_id", employe);
      return q;
    })(),
  ]);

  const employes = (employesData as Pick<Utilisateur, "id" | "nom">[]) ?? [];
  const rapports = (rapportsReq.data as unknown as RapportRow[]) ?? [];

  return (
    <>
      <PageHeader
        title="Rapports de l'équipe"
        subtitle="Consultez et exportez les rapports soumis."
        actions={
          estManager ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/exports"><Download className="size-4" /> Export CSV</Link>
            </Button>
          ) : null
        }
      />

      <form className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="sm:w-64">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Employé</label>
          <Select name="employe" defaultValue={employe ?? ""}>
            <option value="">Tous</option>
            {employes.map((e) => (
              <option key={e.id} value={e.id}>{e.nom}</option>
            ))}
          </Select>
        </div>
        <Button variant="outline" size="sm" type="submit" className="w-full sm:w-auto">
          Filtrer
        </Button>
      </form>

      {rapports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucun rapport. Les rapports soumis apparaîtront ici.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y">
            {rapports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <Link href={`/rapports/${r.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {r.utilisateurs?.nom ?? "—"} <span className="font-normal text-muted-foreground">· {r.template_nom ?? "Rapport"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateHeure(r.soumis_at)}</p>
                </Link>
                <div className="flex items-center gap-2">
                  {r.source === "email" && <Badge variant="secondary">Email</Badge>}
                  {r.similaire_precedent && <Badge variant="warning">Similaire</Badge>}
                  <a
                    href={`/api/rapport/${r.id}/pdf`}
                    target="_blank"
                    className="rounded-md p-2 text-muted-foreground transition hover:bg-accent"
                    title="PDF enrichi"
                  >
                    <Download className="size-[18px]" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
