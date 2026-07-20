import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rapports — Plateforme de rapports d'activité",
  description:
    "Plateforme SaaS multi-entreprises de digitalisation des rapports d'activité des employés.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
