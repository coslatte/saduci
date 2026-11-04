"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/molecules/ErrorState";

export interface RouteErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * RouteErrorPage
 *
 * Shared route-level error boundary. It isolates a failing section so the rest
 * of the shell stays usable, logs the error for diagnostics, and offers retry
 * plus the technical detail behind a disclosure.
 *
 * Used in X case: every `error.tsx` in the App Router.
 */
export default function RouteErrorPage({ error, reset }: RouteErrorPageProps) {
  useEffect(() => {
    console.error("[RouteError]", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col py-8">
      <ErrorState
        title="No se pudo cargar esta sección"
        description="Ocurrió un problema al cargar el contenido. Puedes intentarlo de nuevo."
        reference={error.digest}
        details={error.message}
        onRetry={reset}
      />
    </div>
  );
}
