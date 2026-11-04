import type { Metadata, Viewport } from "next";
import "./globals.css";
import ShellController from "@/app/components/ShellController";
import ConnectivityBanner from "@/app/components/ConnectivityBanner";
import RouteProgressBar from "@/components/layout/RouteProgressBar";
import ClientOnly from "@/lib/ClientOnly";
import { Toaster } from "@/components/molecules/Toast";
import { AppProviders } from "@/providers/app-providers";
import { primaryFont, secondaryFont } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "SADUCI Plataforma",
  description: "Plataforma de gestión Saduci",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      {/*
        Global layout: the app font is applied here using the `inter` instance
        imported from `src/lib/fonts.ts`. This makes it explicit where the
        global font is defined so form controls (select/option) inherit it.
      */}
      <body
        className={`${primaryFont.className} ${primaryFont.variable} ${secondaryFont.variable} overflow-x-hidden bg-zinc-50 text-zinc-900 antialiased`}
      >
        <AppProviders>
          <ClientOnly fallback={<div className="min-h-screen" />}>
            <ShellController>{children}</ShellController>
            <Toaster />
            <ConnectivityBanner />
            <RouteProgressBar />
          </ClientOnly>
        </AppProviders>
      </body>
    </html>
  );
}
