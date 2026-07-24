import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/permissions";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";

const atouts = [
  { icon: Icon.doc, titre: "Rapports structurés", texte: "Des formulaires sur-mesure par métier, remplis en quelques secondes." },
  { icon: Icon.sparkles, titre: "Analyse par IA", texte: "Gemini note la performance et propose des pistes d'amélioration." },
  { icon: Icon.chart, titre: "Décisions rapides", texte: "Le manager voit en un coup d'œil qui a besoin d'attention." },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-gold-500 text-white ring-1 ring-gold-400/40">
            <Icon.logo width={20} height={20} />
          </span>
          <span className="text-lg font-bold">Rapports</span>
        </div>
        {user ? (
          <ButtonLink href="/dashboard" size="sm">Mon espace</ButtonLink>
        ) : (
          <ButtonLink href="/login" variant="secondary" size="sm">Se connecter</ButtonLink>
        )}
      </nav>

      <section className="mt-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          <Icon.sparkles width={15} /> Plateforme SaaS multi-entreprises
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Des rapports d&apos;activité enfin{" "}
          <span className="text-brand-600">utiles</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg muted">
          Digitalisez les rapports de vos équipes, mesurez la performance et
          pilotez la productivité grâce à l&apos;analyse par IA.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href={user ? "/dashboard" : "/login"}>
            {user ? "Accéder à mon espace" : "Se connecter"}
          </ButtonLink>
          <ButtonLink href="/activation" variant="secondary">
            <Icon.key width={18} /> Activer une licence
          </ButtonLink>
        </div>
      </section>

      <section className="mt-20 grid gap-5 sm:grid-cols-3">
        {atouts.map((a) => (
          <div key={a.titre} className="card p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-white/5">
              <a.icon width={22} />
            </span>
            <h3 className="mt-4 font-semibold">{a.titre}</h3>
            <p className="muted mt-1 text-sm">{a.texte}</p>
          </div>
        ))}
      </section>

      <footer className="mt-20 border-t border-[var(--border)] py-8 text-center text-sm muted">
        <Link href="/activation" className="hover:text-brand-600">Activer une licence</Link>
        {" · "}
        <Link href="/login" className="hover:text-brand-600">Connexion</Link>
        <p className="mt-2">Rapports by Nextiaa</p>
      </footer>
    </main>
  );
}
