import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { formatDate } from "@/lib/utils";
import { LABEL_STATUT, toneStatut, statutEffectif, joursAvantExpiration } from "@/lib/licence";
import type { Licence } from "@/lib/types/database";

export async function SuperAdminDashboard() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("licences")
    .select("*, entreprises(nom)")
    .order("date_creation", { ascending: false });

  const licences = ((data as (Licence & { entreprises: { nom: string } | null })[]) ?? []);
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
          <ButtonLink href="/admin/licences">
            <Icon.plus width={18} /> Générer une licence
          </ButtonLink>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Licences totales" value={licences.length} highlight icon={<Icon.key width={18} />} />
        <StatCard label="Licences actives" value={actives} icon={<Icon.check width={18} />} />
        <StatCard label="Entreprises" value={entreprises} icon={<Icon.briefcase width={18} />} />
        <StatCard label="À renouveler" value={aExpirer.length} icon={<Icon.alert width={18} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Licences à renouveler"
            subtitle="Expiration dans moins de 30 jours"
          />
          {aExpirer.length === 0 ? (
            <p className="muted py-6 text-center text-sm">Aucune licence à renouveler. 🎉</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {aExpirer.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{l.entreprises?.nom ?? l.entreprise_cible_nom}</p>
                    <p className="muted text-xs">Expire le {formatDate(l.date_expiration!)}</p>
                  </div>
                  <Badge tone="warning">{joursAvantExpiration(l)}j</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Dernières licences" subtitle="Activité récente" />
          <ul className="divide-y divide-[var(--border)]">
            {licences.slice(0, 6).map((l) => {
              const s = statutEffectif(l);
              return (
                <li key={l.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-mono text-xs font-semibold">{l.cle_unique}</p>
                    <p className="muted text-xs">{l.entreprises?.nom ?? l.entreprise_cible_nom ?? "Non activée"}</p>
                  </div>
                  <Badge tone={toneStatut(s)}>{LABEL_STATUT[s]}</Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
