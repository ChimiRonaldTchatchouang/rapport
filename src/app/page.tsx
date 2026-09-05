import Link from "next/link";
import { FileText, Sparkles, LineChart, KeyRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/permissions";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const atouts = [
  { icon: FileText, titre: "Rapports structurés", texte: "Des formulaires sur-mesure par métier, remplis en quelques secondes." },
  { icon: Sparkles, titre: "Analyse par IA", texte: "Gemini note la performance et propose des pistes d'amélioration." },
  { icon: LineChart, titre: "Décisions rapides", texte: "Le manager voit en un coup d'œil qui a besoin d'attention." },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Icon.logo width={20} height={20} />
          </span>
          <span className="text-lg font-bold">Rapports</span>
        </div>
        {user ? (
          <Button asChild size="sm"><Link href="/dashboard">Mon espace</Link></Button>
        ) : (
          <Button asChild variant="secondary" size="sm"><Link href="/login">Se connecter</Link></Button>
        )}
      </nav>

      <section className="mt-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <Sparkles className="size-[15px]" /> Plateforme SaaS multi-entreprises
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Des rapports d&apos;activité enfin{" "}
          <span className="text-primary">utiles</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Digitalisez les rapports de vos équipes, mesurez la performance et
          pilotez la productivité grâce à l&apos;analyse par IA.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href={user ? "/dashboard" : "/login"}>
              {user ? "Accéder à mon espace" : "Se connecter"}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/activation"><KeyRound className="size-4" /> Activer une licence</Link>
          </Button>
        </div>
      </section>

      <section className="mt-20 grid gap-5 sm:grid-cols-3">
        {atouts.map((a) => (
          <Card key={a.titre}>
            <CardContent className="p-6">
              <span className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <a.icon className="size-[22px]" />
              </span>
              <h3 className="mt-4 font-semibold">{a.titre}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{a.texte}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <footer className="mt-20 border-t py-8 text-center text-sm text-muted-foreground">
        <Link href="/activation" className="hover:text-primary">Activer une licence</Link>
        {" · "}
        <Link href="/login" className="hover:text-primary">Connexion</Link>
        <p className="mt-2">Rapports by Nextiaa</p>
      </footer>
    </main>
  );
}
