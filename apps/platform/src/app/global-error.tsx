"use client";

import { useEffect } from "react";
import type { CSSProperties } from "react";

export interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const styles: Record<string, CSSProperties> = {
  body: { margin: 0 },
  wrapper: {
    display: "flex",
    minHeight: "100vh",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1.5rem",
    padding: "0 1.5rem",
    textAlign: "center",
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: "#18181b",
    background: "#fafafa",
  },
  code: {
    margin: 0,
    fontSize: "6rem",
    fontWeight: 700,
    lineHeight: 1,
    color: "#d4d4d8",
  },
  textBlock: { maxWidth: "24rem" },
  title: { margin: 0, fontSize: "1.5rem", fontWeight: 600 },
  description: {
    margin: "0.5rem 0 0",
    fontSize: "0.875rem",
    lineHeight: 1.5,
    color: "#52525b",
  },
  reference: {
    margin: "0.5rem 0 0",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.75rem",
    color: "#a1a1aa",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "0.75rem",
  },
  primaryButton: {
    cursor: "pointer",
    border: "none",
    borderRadius: "0.5rem",
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#ffffff",
    background: "#0f766e",
  },
  outlineButton: {
    borderRadius: "0.5rem",
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#18181b",
    textDecoration: "none",
    border: "1px solid #d4d4d8",
    background: "#ffffff",
  },
};

/**
 * Last-resort fallback rendered when the root layout itself fails (the
 * route-level `error.tsx` cannot catch those). Replaces the whole document,
 * so it must define its own `<html>` and `<body>` and cannot rely on the
 * root layout providers or imported styles.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="es">
      <body style={styles.body}>
        <div style={styles.wrapper}>
          <p style={styles.code} aria-label="Error">
            500
          </p>
          <div style={styles.textBlock}>
            <h1 style={styles.title}>No se pudo cargar la aplicación</h1>
            <p style={styles.description}>
              El servidor no respondió correctamente. Puedes intentar de nuevo o
              volver al inicio.
            </p>
            {error.digest && (
              <p style={styles.reference}>Referencia: {error.digest}</p>
            )}
          </div>
          <div style={styles.actions}>
            <button type="button" onClick={reset} style={styles.primaryButton}>
              Reintentar
            </button>
            {/* Plain anchor forces a full reload, which recovers a broken
                client router state that a soft Link navigation would not. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={styles.outlineButton}>
              Volver al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
