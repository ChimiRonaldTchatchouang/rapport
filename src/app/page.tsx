import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/permissions";

// Page d'accueil publique. Redirige les utilisateurs déjà connectés.
export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">
          Rapports d&apos;activité, enfin utiles.
        </h1>
        <p className="text-lg opacity-70">
          Digitalisez les rapports de vos équipes, mesurez la performance et
          gagnez en visibilité grâce à l&apos;analyse par IA.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {user ? (
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700"
          >
            Accéder à mon espace
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700"
            >
              Se connecter
            </Link>
            <Link
              href="/activation"
              className="rounded-lg border border-current/20 px-5 py-2.5 font-medium transition hover:bg-black/5 dark:hover:bg-white/5"
            >
              Activer une licence
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
