import { requireUser } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import type { Entreprise, Licence } from "@/lib/types/database";

// Tableau de bord — point d'entrée après connexion.
// Module 0 : affiche l'identité, le rôle et (pour un tenant) l'état de licence.
// Les vues spécialisées (Super Admin, Manager, Employé) seront construites aux
// modules suivants.
export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Infos entreprise + licence pour les membres d'un tenant (RLS applique le filtrage).
  let entreprise: Entreprise | null = null;
  let licence: Licence | null = null;

  if (user.entreprise_id) {
    const [{ data: ent }, { data: lic }] = await Promise.all([
      supabase.from("entreprises").select("*").eq("id", user.entreprise_id).single(),
      supabase
        .from("licences")
        .select("*")
        .eq("entreprise_id", user.entreprise_id)
        .order("date_creation", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    entreprise = (ent as Entreprise) ?? null;
    licence = (lic as Licence) ?? null;
  }

  const roleLabel: Record<string, string> = {
    super_admin: "Super Admin (Nextiaa)",
    manager: "Manager",
    employe: "Employé",
  };

  // Indicateur d'expiration de licence (30 jours avant — Module 1).
  let alerteLicence: string | null = null;
  if (licence?.date_expiration) {
    const joursRestants = Math.ceil(
      (new Date(licence.date_expiration).getTime() - Date.now()) / 86_400_000
    );
    if (licence.statut !== "active") {
      alerteLicence = `Licence ${licence.statut}.`;
    } else if (joursRestants <= 0) {
      alerteLicence = "Licence expirée.";
    } else if (joursRestants <= 30) {
      alerteLicence = `Licence expirant dans ${joursRestants} jour(s).`;
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-sm opacity-70">
            Bonjour {user.nom} — {roleLabel[user.role_systeme]}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-current/20 px-4 py-2 text-sm transition hover:bg-black/5 dark:hover:bg-white/5"
          >
            Se déconnecter
          </button>
        </form>
      </header>

      {alerteLicence && (
        <div className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          ⚠️ {alerteLicence}
        </div>
      )}

      <section className="space-y-4">
        {entreprise && (
          <div className="rounded-xl border border-current/10 p-5">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide opacity-60">
              Entreprise
            </h2>
            <p className="text-lg font-medium">{entreprise.nom}</p>
            {licence && (
              <p className="mt-1 text-sm opacity-70">
                Licence : {licence.statut}
                {licence.date_expiration &&
                  ` — expire le ${new Date(
                    licence.date_expiration
                  ).toLocaleDateString("fr-FR")}`}
              </p>
            )}
          </div>
        )}

        <div className="rounded-xl border border-dashed border-current/20 p-5 text-sm opacity-70">
          Les fonctionnalités (gestion des licences, onboarding, saisie de
          rapports, analyses…) seront ajoutées module par module.
        </div>
      </section>
    </main>
  );
}
