import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader } from "@/components/legacy/card";
import { Button } from "@/components/legacy/button";
import { Field, Input, Textarea } from "@/components/legacy/field";
import { Badge } from "@/components/legacy/badge";
import { LABEL_STATUT, toneStatut, statutEffectif, joursAvantExpiration } from "@/lib/licence";
import { formatDate } from "@/lib/utils";
import { Icon } from "@/components/icons";
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
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{message}</p>
      )}
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
      )}

      {/* Logo de l'entreprise (upload) */}
      <Card className="mb-6 max-w-2xl">
        <CardHeader title="Logo" subtitle="Affiché dans les PDF et emails (PNG/JPG, 2 Mo max)." />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-slate-50 dark:bg-white/5">
            {entreprise.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entreprise.logo_url} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <Icon.briefcase width={24} />
            )}
          </div>
          <div className="flex-1 space-y-3">
            <form action={uploadLogo} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp"
                required
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
              />
              <Button type="submit" size="sm" className="shrink-0">
                <Icon.download width={16} /> Envoyer
              </Button>
            </form>
            {entreprise.logo_url && (
              <form action={supprimerLogo}>
                <Button variant="ghost" size="sm" type="submit" className="text-red-600">
                  Retirer le logo
                </Button>
              </form>
            )}
          </div>
        </div>
      </Card>

      {licence && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardHeader title="Licence" />
              <p className="muted text-sm">
                {licence.date_expiration
                  ? `Expire le ${formatDate(licence.date_expiration)}`
                  : "Non activée"}
                {jours !== null && jours >= 0 && jours <= 30 && (
                  <span className="ml-2 text-amber-600">· dans {jours} jour(s)</span>
                )}
              </p>
            </div>
            <Badge tone={toneStatut(statutEffectif(licence))}>
              {LABEL_STATUT[statutEffectif(licence)]}
            </Badge>
          </div>
        </Card>
      )}

      <Card className="max-w-2xl">
        <CardHeader
          title="Informations de l'entreprise"
          subtitle="Ces informations apparaissent dans les PDF et emails."
        />
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
      </Card>
    </>
  );
}
