"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Text } from "@/components/atoms/Text";
import { Button } from "@/components/atoms/Buttons";

export interface GlobalErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const styles = {
  wrapper:
    "flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center",
  codeText: "font-secondary select-none font-bold leading-none text-zinc-300",
  codeSize: "text-[7rem] md:text-[10rem]",
  textBlock: "flex max-w-sm flex-col gap-2",
  divider: "mx-auto h-px w-12 bg-zinc-200",
  actions: "flex flex-wrap justify-center gap-3",
  digestText: "mt-1 font-mono",
} as const;

/**
 * Displays a global error fallback with retry and home navigation actions.
 * Used in X case: runtime route errors captured by the global error boundary.
 */
export default function GlobalErrorPage({
  error,
  reset,
}: GlobalErrorPageProps) {
  useEffect(() => {
    console.error("[ErrorPage]", error.message);
  }, [error]);

  return (
    <div className={styles.wrapper}>
      <p className={`${styles.codeText} ${styles.codeSize}`} aria-label="Error">
        500
      </p>
      <div className={styles.divider} role="presentation" />
      <div className={styles.textBlock}>
        <Text as="h1" size="2xl" weight="semibold" tracking="tight">
          "Ocurrió un error inesperado"
        </Text>
        <Text size="sm" muted>
          "Algo salió mal al cargar esta sección. Puedes intentar de nuevo o
          volver al inicio."
        </Text>
        {error.digest && (
          <Text size="xs" muted className={styles.digestText}>
            Referencia: {error.digest}
          </Text>
        )}
      </div>
      <div className={styles.actions}>
        <Button variant="primary" onClick={reset}>
          "Reintentar"
        </Button>
        <Link href="/">
          <Button variant="outline">"Volver al inicio"</Button>
        </Link>
      </div>
    </div>
  );
}
