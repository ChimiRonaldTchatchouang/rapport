import type { MetadataRoute } from "next";

// Manifeste PWA — permet l'installation sur mobile (« Ajouter à l'écran d'accueil »).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rapports — Nextiaa",
    short_name: "Rapports",
    description: "Rapports d'activité, performance et suivi d'équipe.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#eef1f6",
    theme_color: "#4f46e5",
    lang: "fr",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
