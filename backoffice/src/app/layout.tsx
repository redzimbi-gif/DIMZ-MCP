import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dimz · Back-office",
  description: "CRM automobile interne — DIMZ",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
