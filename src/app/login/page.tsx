import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { signIn } from "./actions";

// Page de connexion (email / mot de passe).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string; message?: string }>;
}) {
  const { error, redirectTo, message } = await searchParams;

  // Déjà connecté ? On file au tableau de bord.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Connexion</h1>
        <p className="text-sm text-muted-foreground">Accédez à votre espace de rapports.</p>
      </div>

      {message && (
        <p className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {message}
        </p>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <Card>
        <CardContent className="p-6">
          <form action={signIn} className="space-y-4">
            <input type="hidden" name="redirectTo" value={redirectTo ?? "/dashboard"} />

            <Field label="Email">
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </Field>

            <Field label="Mot de passe">
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </Field>

            <Button type="submit" className="w-full">Se connecter</Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Nouvelle entreprise ?{" "}
        <Link href="/activation" className="text-primary hover:underline">
          Activer une licence
        </Link>
      </p>
    </main>
  );
}
