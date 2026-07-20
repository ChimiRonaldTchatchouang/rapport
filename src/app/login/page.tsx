import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/permissions";
import { signIn } from "./actions";

// Page de connexion (email / mot de passe).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const { error, redirectTo } = await searchParams;

  // Déjà connecté ? On file au tableau de bord.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Connexion</h1>
        <p className="text-sm opacity-70">Accédez à votre espace de rapports.</p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form action={signIn} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo ?? "/dashboard"} />

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-current/20 bg-transparent px-3 py-2 outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-current/20 bg-transparent px-3 py-2 outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700"
        >
          Se connecter
        </button>
      </form>

      <p className="text-center text-sm opacity-70">
        Nouvelle entreprise ?{" "}
        <Link href="/activation" className="text-blue-600 hover:underline">
          Activer une licence
        </Link>
      </p>
    </main>
  );
}
