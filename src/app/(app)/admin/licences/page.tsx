import { KeyRound, CheckCircle2, TriangleAlert, Building2, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { LABEL_STATUT, statutEffectif, joursAvantExpiration } from "@/lib/licence";
import { badgeStatut } from "@/lib/ui/statut";
import type { Licence } from "@/lib/types/database";
import { genererLicence, suspendreLicence, revoquerLicence, reactiverLicence } from "./actions";

type LicenceRow = Licence & { entreprises: { nom: string } | null };

function Stat({ label, value, icon, primary = false }: { label: string; value: React.ReactNode; icon: React.ReactNode; primary?: boolean }) {
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
  const bientot = licences.filter((l) => {
    const j = joursAvantExpiration(l);
    return statutEffectif(l) === "active" && j !== null && j <= 30 && j >= 0;
  }).length;

  return (
    <>
      <PageHeader title="Licences" subtitle="Générez et pilotez les licences des entreprises clientes." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat primary label="Total licences" value={total} icon={<KeyRound className="size-5" />} />
        <Stat label="Actives" value={actives} icon={<CheckCircle2 className="size-5" />} />
        <Stat label="Expirent < 30j" value={bientot} icon={<TriangleAlert className="size-5" />} />
        <Stat label="Entreprises" value={licences.filter((l) => l.entreprise_id).length} icon={<Building2 className="size-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Nouvelle licence</CardTitle>
            <CardDescription>Valable 1 an dès l&apos;activation.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={genererLicence} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cible">Entreprise cible <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input id="cible" name="entreprise_cible_nom" placeholder="Ex. Acme SARL" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact">Email de contact <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input id="contact" name="contact_prevu_email" type="email" placeholder="contact@acme.com" />
              </div>
              <Button type="submit" className="w-full"><Plus className="size-4" /> Générer une clé</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Toutes les licences</CardTitle>
            <CardDescription>{total} licence(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {licences.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune licence générée.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clé / Entreprise</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licences.map((l) => {
                    const statut = statutEffectif(l);
                    const jours = joursAvantExpiration(l);
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <p className="font-mono text-xs font-semibold">{l.cle_unique}</p>
                          <p className="text-xs text-muted-foreground">{l.entreprises?.nom ?? l.entreprise_cible_nom ?? "— non activée"}</p>
                        </TableCell>
                        <TableCell><Badge variant={badgeStatut(statut)}>{LABEL_STATUT[statut]}</Badge></TableCell>
                        <TableCell>
                          {l.date_expiration ? (
                            <span className={jours !== null && jours <= 30 ? "text-amber-600" : ""}>
                              {formatDate(l.date_expiration)}
                              {jours !== null && jours >= 0 && jours <= 30 && (
                                <span className="block text-xs text-muted-foreground">dans {jours}j</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
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
                                <Button variant="ghost" size="sm" type="submit" className="text-destructive">Révoquer</Button>
                              </form>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
