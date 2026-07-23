import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaSetup } from "@/components/pwa/pwa-setup";

export const metadata: Metadata = {
  title: "Rapports — Plateforme de rapports d'activité",
  description:
    "Plateforme SaaS multi-entreprises de digitalisation des rapports d'activité des employés.",
  applicationName: "Rapports",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Rapports" },
  icons: { apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        {children}
        <PwaSetup />
      </body>
    </html>
  );
}
