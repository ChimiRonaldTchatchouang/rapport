import { Download, Briefcase } from "lucide-react";
import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { badgeStatut } from "@/lib/ui/statut";
import { LABEL_STATUT, statutEffectif, joursAvantExpiration } from "@/lib/licence";
import { formatDate } from "@/lib/utils";
import type { Entreprise, Licence } from "@/lib/types/database";
import { majEntreprise, uploadLogo, supprimerLogo } from "./actions";

export default async function ParametresPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  const user = await requireRole("manager");
  const supabase = await createClient();

  const [{ data: entData }, { data: licData }] = await Promise.all([
    supabase.from("entreprises").select("*").eq("id", user.entreprise_id).single(),
    supabase
      .from("licences")
      .select("*")
      .eq("entreprise_id", user.entreprise_id)
      .order("date_creation", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const entreprise = entData as Entreprise;
  const licence = licData as Licence | null;
  const jours = licence ? joursAvantExpiration(licence) : null;

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Informations de votre entreprise et licence." />

      {message && (
        <p className="mb-4 rounded-md bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{message}</p>
      )}
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
      )}

      {/* Logo de l'entreprise (upload) */}
      <Card className="mb-6 max-w-2xl">
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>Affiché dans les PDF et emails (PNG/JPG, 2 Mo max).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
              {entreprise.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entreprise.logo_url} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <Briefcase className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <form action={uploadLogo} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="file"
                  name="logo"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                />
                <Button type="submit" size="sm" className="shrink-0">
                  <Download className="size-4" /> Envoyer
                </Button>
              </form>
              {entreprise.logo_url && (
                <form action={supprimerLogo}>
                  <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                    Retirer le logo
                  </Button>
                </form>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {licence && (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Licence</h3>
              <p className="text-sm text-muted-foreground">
                {licence.date_expiration
                  ? `Expire le ${formatDate(licence.date_expiration)}`
                  : "Non activée"}
                {jours !== null && jours >= 0 && jours <= 30 && (
                  <span className="ml-2 text-amber-600">· dans {jours} jour(s)</span>
                )}
              </p>
            </div>
            <Badge variant={badgeStatut(statutEffectif(licence))}>
              {LABEL_STATUT[statutEffectif(licence)]}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informations de l&apos;entreprise</CardTitle>
          <CardDescription>Ces informations apparaissent dans les PDF et emails.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={majEntreprise} className="space-y-4">
            <Field label="Nom de l'entreprise">
              <Input name="nom" defaultValue={entreprise.nom} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email de contact">
                <Input name="contact_email" type="email" defaultValue={entreprise.contact_email ?? ""} />
              </Field>
              <Field label="Téléphone">
                <Input name="contact_tel" defaultValue={entreprise.contact_tel ?? ""} />
              </Field>
            </div>
            <Field label="Adresse">
              <Textarea name="adresse" defaultValue={entreprise.adresse ?? ""} />
            </Field>
            <Button type="submit">Enregistrer</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
