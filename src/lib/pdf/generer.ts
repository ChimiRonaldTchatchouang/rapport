import "server-only";

// ============================================================================
// Génération d'un vrai PDF binaire du rapport (Module 7 — pièce jointe email).
// pdf-lib (pur JS) : fonctionne côté serveur sans navigateur (Render/Vercel OK).
// La police standard Helvetica couvre les accents français (encodage WinAnsi).
// ============================================================================
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { valeurLisible, type ValeurChamp } from "@/lib/types/rapport";
import type { Entreprise, Utilisateur } from "@/lib/types/database";
import type { NotePerformance, Rapport } from "@/lib/types/rapport";

const MARGE = 50;
const A4 = { w: 595.28, h: 841.89 };
const BRAND = rgb(0.31, 0.275, 0.898); // indigo
const GRIS = rgb(0.39, 0.45, 0.55);
const NOIR = rgb(0.06, 0.09, 0.16);

// Découpe un texte en lignes tenant dans `maxWidth`.
function wrap(font: PDFFont, taille: number, texte: string, maxWidth: number): string[] {
  const mots = String(texte).replace(/\r/g, "").split(/\s+/);
  const lignes: string[] = [];
  let courante = "";
  for (const mot of mots) {
    const test = courante ? `${courante} ${mot}` : mot;
    if (font.widthOfTextAtSize(test, taille) > maxWidth && courante) {
      lignes.push(courante);
      courante = mot;
    } else {
      courante = test;
    }
  }
  if (courante) lignes.push(courante);
  return lignes.length ? lignes : [""];
}

export async function genererPdfRapport(params: {
  rapport: Pick<Rapport, "template_nom" | "contenu" | "soumis_at">;
  employe: Pick<Utilisateur, "nom" | "email">;
  entreprise: Pick<Entreprise, "nom" | "logo_url" | "contact_email" | "contact_tel" | "adresse">;
  note?: NotePerformance | null; // version enrichie (manager)
}): Promise<Uint8Array> {
  const { rapport, employe, entreprise, note } = params;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([A4.w, A4.h]);
  let y = A4.h - MARGE;
  const largeur = A4.w - 2 * MARGE;

  const sautSiBesoin = (h: number) => {
    if (y - h < MARGE) {
      page = doc.addPage([A4.w, A4.h]);
      y = A4.h - MARGE;
    }
  };

  const texte = (t: string, f: PDFFont, taille: number, couleur = NOIR, x = MARGE) => {
    for (const ligne of wrap(f, taille, t, largeur - (x - MARGE))) {
      sautSiBesoin(taille + 4);
      page.drawText(ligne, { x, y, size: taille, font: f, color: couleur });
      y -= taille + 4;
    }
  };

  // --- En-tête : logo (si PNG/JPG) ou nom, + coordonnées ---
  let logoDessine = false;
  if (entreprise.logo_url) {
    try {
      const res = await fetch(entreprise.logo_url);
      const buf = new Uint8Array(await res.arrayBuffer());
      const ct = res.headers.get("content-type") ?? "";
      const img = ct.includes("png")
        ? await doc.embedPng(buf)
        : ct.includes("jpg") || ct.includes("jpeg")
          ? await doc.embedJpg(buf)
          : null;
      if (img) {
        const h = 40;
        const w = (img.width / img.height) * h;
        page.drawImage(img, { x: MARGE, y: y - h, width: w, height: h });
        logoDessine = true;
      }
    } catch {
      /* logo ignoré si inaccessible */
    }
  }
  if (!logoDessine) {
    page.drawText(entreprise.nom, { x: MARGE, y: y - 22, size: 20, font: bold, color: BRAND });
  }

  const contact = [entreprise.contact_email, entreprise.contact_tel, entreprise.adresse]
    .filter(Boolean)
    .join(" · ");
  if (contact) {
    page.drawText(wrap(font, 9, contact, 260)[0], {
      x: A4.w - MARGE - 260,
      y: y - 12,
      size: 9,
      font,
      color: GRIS,
    });
  }
  y -= 60;

  // Filet
  page.drawLine({
    start: { x: MARGE, y },
    end: { x: A4.w - MARGE, y },
    thickness: 2,
    color: rgb(0.93, 0.94, 0.97),
  });
  y -= 24;

  // --- Titre + méta ---
  texte("Rapport d'activite", bold, 18);
  y -= 2;
  texte(`${employe.nom} — ${rapport.template_nom ?? "Rapport"}`, font, 11, GRIS);
  texte(
    `Soumis le ${new Date(rapport.soumis_at).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    font,
    10,
    GRIS
  );
  y -= 10;

  // --- Champs ---
  for (const c of rapport.contenu as ValeurChamp[]) {
    sautSiBesoin(30);
    texte(c.label, bold, 10, GRIS);
    texte(valeurLisible(c), font, 12, NOIR);
    y -= 8;
  }

  // --- Bloc analyse (version enrichie manager) ---
  if (note) {
    y -= 10;
    sautSiBesoin(60);
    page.drawLine({
      start: { x: MARGE, y },
      end: { x: A4.w - MARGE, y },
      thickness: 1,
      color: rgb(0.93, 0.94, 0.97),
    });
    y -= 20;
    texte(`Analyse de performance — ${note.note}/100`, bold, 13, BRAND);
    texte(`Periode ${note.periode_type} : ${note.periode_debut} → ${note.periode_fin}`, font, 9, GRIS);
    y -= 4;
    if (note.observations.length) {
      texte("Observations", bold, 10, GRIS);
      for (const o of note.observations) texte(`• ${o}`, font, 11, NOIR);
    }
    if (note.initiatives.length) {
      y -= 4;
      texte("Initiatives", bold, 10, GRIS);
      for (const o of note.initiatives) texte(`• ${o}`, font, 11, NOIR);
    }
  }

  return doc.save();
}
