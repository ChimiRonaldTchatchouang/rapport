import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/icons";
import { formatDate } from "@/lib/utils";
import {
  LABEL_STATUT,
  toneStatut,
  statutEffectif,
  joursAvantExpiration,
} from "@/lib/licence";
import type { Licence } from "@/lib/types/database";
import {
  genererLicence,
  suspendreLicence,
  revoquerLicence,
  reactiverLicence,
} from "./actions";

type LicenceRow = Licence & { entreprises: { nom: string } | null };

export default async function LicencesPage() {
  await requireRole("super_admin");
  const supabase = await createClient();

  const { data } = await supabase
    .from("licences")
    .select("*, entreprises(nom)")
    .order("date_creation", { ascending: false });

  const licences = (data as LicenceRow[]) ?? [];

  const total = licences.length;
  const actives = licences.filter((l) => statutEffectif(l) === "active").length;
  const bientotExpirees = licences.filter((l) => {
    const j = joursAvantExpiration(l);
    return statutEffectif(l) === "active" && j !== null && j <= 30 && j >= 0;
  }).length;

  return (
    <>
      <PageHeader
        title="Licences"
        subtitle="Générez et pilotez les licences des entreprises clientes."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total licences" value={total} icon={<Icon.key width={18} />} highlight />
        <StatCard label="Actives" value={actives} icon={<Icon.check width={18} />} />
        <StatCard label="Expirent < 30j" value={bientotExpirees} icon={<Icon.alert width={18} />} />
        <StatCard label="Entreprises" value={licences.filter((l) => l.entreprise_id).length} icon={<Icon.briefcase width={18} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Générateur */}
        <Card className="lg:col-span-1">
          <CardHeader title="Nouvelle licence" subtitle="Valable 1 an dès l'activation." />
          <form action={genererLicence} className="space-y-4">
            <Field label="Entreprise cible" hint="(optionnel)">
              <Input name="entreprise_cible_nom" placeholder="Ex. Acme SARL" />
            </Field>
            <Field label="Email de contact" hint="(optionnel)">
              <Input name="contact_prevu_email" type="email" placeholder="contact@acme.com" />
            </Field>
            <Button type="submit" className="w-full">
              <Icon.plus width={18} /> Générer une clé
            </Button>
          </form>
        </Card>

        {/* Liste */}
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Toutes les licences" subtitle={`${total} licence(s)`} />
          {licences.length === 0 ? (
            <p className="muted py-8 text-center text-sm">Aucune licence générée.</p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left muted">
                    <th className="px-2 py-2 font-medium">Clé / Entreprise</th>
                    <th className="px-2 py-2 font-medium">Statut</th>
                    <th className="px-2 py-2 font-medium">Expiration</th>
                    <th className="px-2 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {licences.map((l) => {
                    const statut = statutEffectif(l);
                    const jours = joursAvantExpiration(l);
                    return (
                      <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-2 py-3">
                          <p className="font-mono text-xs font-semibold">{l.cle_unique}</p>
                          <p className="muted text-xs">
                            {l.entreprises?.nom ?? l.entreprise_cible_nom ?? "— non activée"}
                          </p>
                        </td>
                        <td className="px-2 py-3">
                          <Badge tone={toneStatut(statut)}>{LABEL_STATUT[statut]}</Badge>
                        </td>
                        <td className="px-2 py-3">
                          {l.date_expiration ? (
                            <span className={jours !== null && jours <= 30 ? "text-amber-600" : ""}>
                              {formatDate(l.date_expiration)}
                              {jours !== null && jours >= 0 && jours <= 30 && (
                                <span className="muted block text-xs">dans {jours}j</span>
                              )}
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {l.statut === "active" && (
                              <form action={suspendreLicence}>
                                <input type="hidden" name="id" value={l.id} />
                                <Button variant="ghost" size="sm" type="submit">Suspendre</Button>
                              </form>
                            )}
                            {(l.statut === "suspendue" || l.statut === "expiree") && (
                              <form action={reactiverLicence}>
                                <input type="hidden" name="id" value={l.id} />
                                <Button variant="ghost" size="sm" type="submit">Réactiver</Button>
                              </form>
                            )}
                            {l.statut !== "revoquee" && (
                              <form action={revoquerLicence}>
                                <input type="hidden" name="id" value={l.id} />
                                <Button variant="ghost" size="sm" type="submit" className="text-red-600">
                                  Révoquer
                                </Button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
