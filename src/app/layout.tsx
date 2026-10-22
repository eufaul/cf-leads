import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "CF Leads — Prospecção Ativa",
  description: "Sistema interno de prospecção ativa da Agência C&F",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-6 antialiased">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
