import Link from "next/link";
import { Icon } from "@/components/icons";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { activerLicence } from "./actions";

// Activation d'une licence : l'entreprise crée son compte + son 1er manager.
export default async function ActivationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Icon.logo width={22} height={22} />
        </span>
        <span className="text-xl font-bold">Rapports</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Activer votre licence</h1>
        <p className="muted mt-1 text-sm">
          Saisissez la clé fournie par Nextiaa et créez le compte administrateur
          de votre entreprise.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form action={activerLicence} className="card space-y-4 p-6">
        <Field label="Clé de licence">
          <Input name="cle" required placeholder="NEXTIAA-XXXX-XXXX-XXXX" autoComplete="off" />
        </Field>
        <Field label="Nom de l'entreprise">
          <Input name="entreprise_nom" required placeholder="Ex. Acme SARL" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Votre nom (manager)">
            <Input name="manager_nom" required placeholder="Prénom Nom" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required placeholder="vous@entreprise.com" />
          </Field>
        </div>
        <Field label="Mot de passe" hint="(8 caractères min.)">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Button type="submit" className="w-full">
          Activer et créer mon compte
        </Button>
      </form>

      <p className="text-center text-sm muted">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-brand-600 hover:underline">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
