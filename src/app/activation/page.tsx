import Link from "next/link";

// Placeholder — l'activation de licence & l'onboarding entreprise seront
// implémentés au Module 1 (générateur de licence) et Module 2 (onboarding).
export default function ActivationPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">Activation de licence</h1>
      <p className="opacity-70">
        La création de compte entreprise par clé de licence sera disponible
        prochainement (Module 1 &amp; 2).
      </p>
      <Link href="/" className="text-blue-600 hover:underline">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
