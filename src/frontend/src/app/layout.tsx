import type { Metadata } from "next";
import "./globals.css";
import ShellController from "@/app/components/ShellController";
import ClientOnly from "@/lib/ClientOnly";
import { AuthProvider } from "@/lib/auth";
import { primaryFont, secondaryFont } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Saduci Platform",
  description: "Plataforma de gestión Saduci",
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
        className={`${primaryFont.className} ${primaryFont.variable} ${secondaryFont.variable} antialiased bg-zinc-50 text-zinc-900`}
      >
        <AuthProvider>
          <ClientOnly fallback={<div className="min-h-screen" />}>
            <ShellController>{children}</ShellController>
          </ClientOnly>
        </AuthProvider>
      </body>
    </html>
  );
}
