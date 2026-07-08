import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { Viewport } from "next";
import "./globals.css";
import { getServerLang } from "@/lib/i18n-server";
import CookieConsent from "@/components/CookieConsent";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RunnerAI — Piani di corsa personalizzati con l'AI",
    template: "%s · RunnerAI",
  },
  description:
    "Carica i tuoi allenamenti Garmin e lascia che tre LLM costruiscano, correggano e ottimizzino il tuo piano di corsa. Con rassegna stampa quotidiana sul running mondiale.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "RunnerAI", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f9531f",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getServerLang();
  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CookieConsent />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
