import Link from "next/link";
import { Download } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatDateHeure } from "@/lib/utils";
import type { Utilisateur } from "@/lib/types/database";

type RapportRow = {
  id: string;
  template_nom: string | null;
  soumis_at: string;
  source: "app" | "email";
  note: number | null;
  utilisateurs: { nom: string } | null;
};

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default async function ArchivesPage({
  searchParams,
}: {
  searchParams: Promise<{ employe?: string; debut?: string; fin?: string }>;
}) {
  const { employe, debut, fin } = await searchParams;
  const user = await requireRole("manager", "chef_equipe");
  const supabase = await createClient();

  const [{ data: employesData }, rapportsReq] = await Promise.all([
    supabase
      .from("utilisateurs")
      .select("id, nom")
      .eq("entreprise_id", user.entreprise_id)
      .in("role_systeme", ["employe", "chef_equipe"])
      .order("nom"),
    (async () => {
      let q = supabase
        .from("rapports")
        .select("id, template_nom, soumis_at, source, note, utilisateurs(nom)")
        .eq("entreprise_id", user.entreprise_id)
        .order("soumis_at", { ascending: false })
        .limit(500);
      if (employe) q = q.eq("employe_id", employe);
      if (debut) q = q.gte("soumis_at", debut);
      if (fin) {
        const f = new Date(fin);
        f.setDate(f.getDate() + 1);
        q = q.lt("soumis_at", f.toISOString().slice(0, 10));
      }
      return q;
    })(),
  ]);

  const employes = (employesData as Pick<Utilisateur, "id" | "nom">[]) ?? [];
  const rapports = (rapportsReq.data as unknown as RapportRow[]) ?? [];

  // Groupement par mois (YYYY-MM).
  const groupes = new Map<string, RapportRow[]>();
  for (const r of rapports) {
    const cle = r.soumis_at.slice(0, 7);
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle)!.push(r);
  }

  return (
    <>
      <PageHeader
        title="Archives des rapports"
        subtitle="Tout l'historique, regroupé par mois."
      />

      <Card className="mb-6">
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="sm:w-56">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Employé</label>
              <Select name="employe" defaultValue={employe ?? ""}>
                <option value="">Tous</option>
                {employes.map((e) => (
                  <option key={e.id} value={e.id}>{e.nom}</option>
                ))}
              </Select>
            </div>
            <div className="sm:w-40">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Du</label>
              <Input name="debut" type="date" defaultValue={debut ?? ""} />
            </div>
            <div className="sm:w-40">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Au</label>
              <Input name="fin" type="date" defaultValue={fin ?? ""} />
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" type="submit" className="w-full sm:w-auto">Filtrer</Button>
              {(employe || debut || fin) && (
                <a href="/archives" className="whitespace-nowrap text-sm text-primary hover:underline">Réinitialiser</a>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {rapports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucun rapport archivé. Les rapports soumis apparaîtront ici.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...groupes.entries()].map(([cle, liste]) => {
            const [annee, mois] = cle.split("-");
            return (
              <div key={cle}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {MOIS[Number(mois) - 1]} {annee} · {liste.length} rapport(s)
                </h2>
                <Card className="overflow-hidden p-0">
                  <ul className="divide-y">
                    {liste.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <Link href={`/rapports/${r.id}`} className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {r.utilisateurs?.nom ?? "—"}
                            <span className="font-normal text-muted-foreground"> · {r.template_nom ?? "Rapport"}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDateHeure(r.soumis_at)}</p>
                        </Link>
                        <div className="flex items-center gap-2">
                          {r.note !== null && (
                            <Badge variant={r.note >= 70 ? "success" : r.note >= 50 ? "warning" : "destructive"}>
                              {r.note}/100
                            </Badge>
                          )}
                          <a
                            href={`/api/rapport/${r.id}/pdf`}
                            target="_blank"
                            className="rounded-md p-2 text-muted-foreground transition hover:bg-accent"
                            title="PDF"
                          >
                            <Download className="size-[18px]" />
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
