"use client";

import { useEffect } from "react";
import { Text } from "@/components/atoms/Text";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * AppError
 *
 * Generic error UI shown inside an Error Boundary. Logs the received error
 * to the console and exposes a `reset` callback that should be wired to the
 * nearest error recovery handler (typically Next.js' reset function).
 *
 * @param error - the caught error object
 * @param reset - callback to attempt recovery
 * Used in X case: displaying route-level fallback when a page crashes.
 */
export function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error("[AppError]", error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex flex-col gap-1">
        <Text as="h2" size="lg" weight="semibold" className="text-zinc-900">
          Ocurrió un error inesperado
        </Text>
        <Text as="p" size="sm" muted>
          {error.message || "Inténtalo de nuevo o contacta al administrador."}
        </Text>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-primary-600 px-4 py-2 text-(length:--font-size-sm) font-medium text-white transition-colors hover:bg-primary-700"
      >
        Reintentar
      </button>
    </div>
  );
}

export default AppError;
