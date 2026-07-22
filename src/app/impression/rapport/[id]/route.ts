// ============================================================================
// Export PDF d'un rapport (Module 7).
// Génère dynamiquement un document HTML mis en forme (logo + branding de
// l'entreprise, infos employé, date/heure, contenu ordonné). Le navigateur
// l'ouvre et permet « Enregistrer en PDF ». Fonctionne partout (Vercel inclus),
// sans dépendance de rendu binaire.
//
// - Employé : uniquement ses propres rapports.
// - Manager : rapports de son entreprise + version ENRICHIE (note + observations).
// La RLS garantit qu'aucun rapport hors périmètre n'est renvoyé.
// ============================================================================
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { contenuEnHtml, escapeHtml, objetEmail } from "@/lib/rapports/format";
import { formatDateHeure } from "@/lib/utils";
import type { Rapport, ValeurChamp, NotePerformance } from "@/lib/types/rapport";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Non autorisé", { status: 401 });

  const supabase = await createClient();

  const { data } = await supabase.from("rapports").select("*").eq("id", id).maybeSingle();
  if (!data) return new Response("Rapport introuvable", { status: 404 });
  const rapport = data as Rapport;

  const [{ data: employe }, { data: entreprise }] = await Promise.all([
    supabase.from("utilisateurs").select("nom, email").eq("id", rapport.employe_id).maybeSingle(),
    supabase.from("entreprises").select("nom, logo_url, contact_email, contact_tel, adresse").eq("id", rapport.entreprise_id).maybeSingle(),
  ]);

  // Version enrichie (manager) : note de performance de la période du rapport.
  let note: NotePerformance | null = null;
  const enrichi = user.role_systeme === "manager";
  if (enrichi) {
    const d = rapport.soumis_at.slice(0, 10);
    const { data: n } = await supabase
      .from("notes_performance")
      .select("*")
      .eq("employe_id", rapport.employe_id)
      .lte("periode_debut", d)
      .gte("periode_fin", d)
      .order("periode_type", { ascending: true })
      .limit(1)
      .maybeSingle();
    note = (n as NotePerformance) ?? null;
  }

  const ent = entreprise ?? { nom: "Entreprise", logo_url: null, contact_email: null, contact_tel: null, adresse: null };
  const emp = employe ?? { nom: "Employé", email: "" };

  const logo = ent.logo_url
    ? `<img src="${escapeHtml(ent.logo_url)}" alt="" style="height:44px;" />`
    : `<div style="font-weight:800;font-size:22px;color:#4f46e5;">${escapeHtml(ent.nom)}</div>`;

  const contactLignes = [ent.contact_email, ent.contact_tel, ent.adresse]
    .filter(Boolean)
    .map((l) => escapeHtml(String(l)))
    .join(" · ");

  const blocNote =
    enrichi && note
      ? `
      <div style="margin-top:28px;padding:20px;border:1px solid #e7e9f0;border-radius:12px;background:#f8fafc;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 style="margin:0;font-size:16px;">Analyse de performance</h2>
          <span style="font-size:24px;font-weight:800;color:#4f46e5;">${note.note}<span style="font-size:14px;color:#94a3b8;">/100</span></span>
        </div>
        <p style="margin:8px 0 4px;font-size:12px;color:#64748b;">Période ${note.periode_type} du ${escapeHtml(note.periode_debut)} au ${escapeHtml(note.periode_fin)}</p>
        ${(note.observations as string[]).length ? `<p style="margin:12px 0 4px;font-weight:600;font-size:13px;">Observations</p><ul style="margin:0;padding-left:18px;font-size:13px;color:#334155;">${(note.observations as string[]).map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ul>` : ""}
        ${(note.initiatives as string[]).length ? `<p style="margin:12px 0 4px;font-weight:600;font-size:13px;">Initiatives proposées</p><ul style="margin:0;padding-left:18px;font-size:13px;color:#334155;">${(note.initiatives as string[]).map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ul>` : ""}
      </div>`
      : "";

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(objetEmail(emp.nom, rapport.soumis_at))}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:#0f172a; margin:0; background:#eef1f6; }
  .page { max-width:800px; margin:24px auto; background:#fff; border-radius:16px; border:1px solid #e7e9f0; padding:40px; }
  .header { display:flex; align-items:flex-start; justify-content:space-between; border-bottom:2px solid #eef1f6; padding-bottom:20px; }
  table { width:100%; border-collapse:collapse; border:1px solid #eef1f6; border-radius:8px; overflow:hidden; }
  .toolbar { max-width:800px; margin:0 auto; display:flex; justify-content:flex-end; gap:8px; }
  .btn { background:#4f46e5; color:#fff; border:0; padding:10px 16px; border-radius:10px; font-size:14px; cursor:pointer; }
  @media print { body { background:#fff; } .page { border:0; margin:0; border-radius:0; } .toolbar { display:none; } }
</style>
</head>
<body>
  <div class="toolbar"><button class="btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>
  <div class="page">
    <div class="header">
      <div>${logo}</div>
      <div style="text-align:right;font-size:12px;color:#64748b;max-width:280px;">
        <div style="font-weight:600;color:#0f172a;">${escapeHtml(ent.nom)}</div>
        ${contactLignes}
      </div>
    </div>

    <div style="margin-top:24px;">
      <h1 style="margin:0 0 4px;font-size:20px;">Rapport d'activité</h1>
      <p style="margin:0;color:#64748b;font-size:14px;">
        <strong>${escapeHtml(emp.nom)}</strong> — ${escapeHtml(rapport.template_nom ?? "Rapport")}<br/>
        Soumis le ${escapeHtml(formatDateHeure(rapport.soumis_at))}
      </p>
    </div>

    <table style="margin-top:20px;">${contenuEnHtml(rapport.contenu as ValeurChamp[])}</table>
    ${blocNote}

    <p style="margin-top:32px;text-align:center;font-size:11px;color:#94a3b8;">
      Document généré via Rapports — Nextiaa
    </p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
