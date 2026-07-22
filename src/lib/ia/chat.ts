import "server-only";

// ============================================================================
// Assistant conversationnel Gemini pour le manager (Module 5 — bulle de chat).
// Le manager peut interroger l'IA sur un employé, un rôle/service, ou l'équipe.
// Le contexte est construit à partir des données de SON entreprise uniquement
// (via le client ADMIN, mais toujours filtré sur entreprise_id).
// ============================================================================
import { createAdminClient } from "@/lib/supabase/admin";
import { genererTexte } from "@/lib/ia/gemini";
import { valeurLisible, type ValeurChamp } from "@/lib/types/rapport";
import { isoDate, semaine } from "@/lib/data/periodes";

export type MessageChat = { role: "user" | "assistant"; content: string };

// Construit un instantané compact des données de l'entreprise pour Gemini.
async function construireContexte(entrepriseId: string): Promise<string> {
  const admin = createAdminClient();

  const [{ data: employes }, { data: notes }, { data: rapports }, { data: objectifs }] =
    await Promise.all([
      admin
        .from("utilisateurs")
        .select("id, nom, actif, roles_metier(nom)")
        .eq("entreprise_id", entrepriseId)
        .eq("role_systeme", "employe"),
      admin
        .from("notes_performance")
        .select("employe_id, periode_type, periode_debut, note")
        .eq("entreprise_id", entrepriseId)
        .order("periode_debut", { ascending: false })
        .limit(60),
      admin
        .from("rapports")
        .select("employe_id, template_nom, soumis_at, note, avis, contenu")
        .eq("entreprise_id", entrepriseId)
        .order("soumis_at", { ascending: false })
        .limit(25),
      admin
        .from("objectifs")
        .select("contenu, role_metier_id, periode_debut, roles_metier(nom)")
        .eq("entreprise_id", entrepriseId)
        .gte("periode_debut", isoDate(semaine(new Date()).debut)),
    ]);

  type Emp = { id: string; nom: string; actif: boolean; roles_metier: { nom: string } | null };
  type Note = { employe_id: string; periode_type: string; periode_debut: string; note: number };
  type Rap = {
    employe_id: string;
    template_nom: string | null;
    soumis_at: string;
    note: number | null;
    avis: string | null;
    contenu: ValeurChamp[];
  };

  const emps = (employes as unknown as Emp[]) ?? [];
  const ns = (notes as Note[]) ?? [];
  const rs = (rapports as unknown as Rap[]) ?? [];
  const nomParId = new Map(emps.map((e) => [e.id, e.nom]));

  const lignesEmployes = emps
    .map((e) => {
      const derniere = ns.find((n) => n.employe_id === e.id);
      return `- ${e.nom} (${e.roles_metier?.nom ?? "sans rôle"}${e.actif ? "" : ", inactif"}) : dernière note ${derniere ? derniere.note + "/100" : "aucune"}`;
    })
    .join("\n");

  const lignesRapports = rs
    .slice(0, 15)
    .map((r) => {
      const resume = r.contenu
        .slice(0, 5)
        .map((c) => `${c.label}=${valeurLisible(c)}`)
        .join(", ");
      return `- ${nomParId.get(r.employe_id) ?? "?"} · ${r.template_nom ?? "Rapport"} · ${new Date(r.soumis_at).toLocaleDateString("fr-FR")}${r.note !== null ? ` · note ${r.note}/100` : ""}\n  Contenu : ${resume}${r.avis ? `\n  Avis IA : ${r.avis}` : ""}`;
    })
    .join("\n");

  const objs = (objectifs as unknown as { contenu: string; roles_metier: { nom: string } | null }[]) ?? [];
  const lignesObjectifs = objs.length
    ? objs.map((o) => `- [${o.roles_metier?.nom ?? "entreprise"}] ${o.contenu}`).join("\n")
    : "Aucun objectif défini cette semaine.";

  return `EMPLOYÉS ET DERNIÈRES NOTES :
${lignesEmployes || "Aucun employé."}

OBJECTIFS DE LA SEMAINE :
${lignesObjectifs}

RAPPORTS RÉCENTS (15 derniers) :
${lignesRapports || "Aucun rapport."}`;
}

export async function repondreManager(
  entrepriseId: string,
  question: string,
  historique: MessageChat[] = []
): Promise<string> {
  const contexte = await construireContexte(entrepriseId);

  const conversation = historique
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Manager" : "Assistant"} : ${m.content}`)
    .join("\n");

  const prompt = `Tu es l'assistant IA d'un manager. Réponds à ses questions sur son équipe UNIQUEMENT à partir des données ci-dessous. Sois concret, synthétique et actionnable. Si une information n'est pas disponible dans les données, dis-le clairement plutôt que d'inventer. Réponds en français.

=== DONNÉES DE L'ENTREPRISE ===
${contexte}
=== FIN DES DONNÉES ===

${conversation ? `Historique récent :\n${conversation}\n` : ""}
Question du manager : ${question}`;

  return genererTexte(prompt);
}
