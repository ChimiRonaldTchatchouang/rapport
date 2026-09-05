import Link from "next/link";
import { KeyRound, Building2, CheckCircle2, TriangleAlert, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { LABEL_STATUT, statutEffectif, joursAvantExpiration } from "@/lib/licence";
import { badgeStatut } from "@/lib/ui/statut";
import type { Licence } from "@/lib/types/database";

function Stat({
  label,
  value,
  icon,
  primary = false,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Card className={primary ? "gap-2 border-transparent bg-primary py-4 text-primary-foreground" : "gap-2 py-4"}>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className={primary ? "text-sm text-primary-foreground/80" : "text-sm text-muted-foreground"}>{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <span className={primary ? "text-primary-foreground/70" : "text-muted-foreground"}>{icon}</span>
      </CardContent>
    </Card>
  );
}

export async function SuperAdminDashboard() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("licences")
    .select("*, entreprises(nom)")
    .order("date_creation", { ascending: false });

  const licences = (data as (Licence & { entreprises: { nom: string } | null })[]) ?? [];
  const actives = licences.filter((l) => statutEffectif(l) === "active").length;
  const entreprises = licences.filter((l) => l.entreprise_id).length;
  const aExpirer = licences.filter((l) => {
    const j = joursAvantExpiration(l);
    return statutEffectif(l) === "active" && j !== null && j >= 0 && j <= 30;
  });

  return (
    <>
      <PageHeader
        title="Bonjour 👋"
        subtitle="Vue d'ensemble de la plateforme Nextiaa."
        actions={
          <Button asChild>
            <Link href="/admin/licences"><Plus className="size-4" /> Générer une licence</Link>
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat primary label="Licences totales" value={licences.length} icon={<KeyRound className="size-5" />} />
        <Stat label="Licences actives" value={actives} icon={<CheckCircle2 className="size-5" />} />
        <Stat label="Entreprises" value={entreprises} icon={<Building2 className="size-5" />} />
        <Stat label="À renouveler" value={aExpirer.length} icon={<TriangleAlert className="size-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Licences à renouveler</CardTitle>
            <CardDescription>Expiration dans moins de 30 jours</CardDescription>
          </CardHeader>
          <CardContent>
            {aExpirer.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucune licence à renouveler. 🎉</p>
            ) : (
              <ul className="divide-y">
                {aExpirer.map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{l.entreprises?.nom ?? l.entreprise_cible_nom}</p>
                      <p className="text-xs text-muted-foreground">Expire le {formatDate(l.date_expiration!)}</p>
                    </div>
                    <Badge variant="warning">{joursAvantExpiration(l)}j</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dernières licences</CardTitle>
            <CardDescription>Activité récente</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {licences.slice(0, 6).map((l) => {
                const s = statutEffectif(l);
                return (
                  <li key={l.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-mono text-xs font-semibold">{l.cle_unique}</p>
                      <p className="text-xs text-muted-foreground">{l.entreprises?.nom ?? l.entreprise_cible_nom ?? "Non activée"}</p>
                    </div>
                    <Badge variant={badgeStatut(s)}>{LABEL_STATUT[s]}</Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
