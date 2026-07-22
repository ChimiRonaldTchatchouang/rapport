import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { LABEL_STATUT, toneStatut, statutEffectif, joursAvantExpiration } from "@/lib/licence";
import { formatDate } from "@/lib/utils";
import type { Entreprise, Licence } from "@/lib/types/database";
import { majEntreprise } from "./actions";

export default async function ParametresPage() {
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
          <Field label="URL du logo" hint="(image en ligne)">
            <Input name="logo_url" type="url" defaultValue={entreprise.logo_url ?? ""} placeholder="https://…/logo.png" />
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
