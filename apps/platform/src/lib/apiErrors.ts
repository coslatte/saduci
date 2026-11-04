export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const NETWORK_ERROR_MESSAGE =
  "No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.";

export function isNetworkFailure(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 0;
  if (error instanceof TypeError) return true;
  return (
    error instanceof Error &&
    /failed to fetch|networkerror|load failed|fetch failed|network request failed/i.test(
      error.message,
    )
  );
}

export function friendlyErrorMessage(error: unknown, fallback: string): string {
  if (isNetworkFailure(error)) return NETWORK_ERROR_MESSAGE;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export type ErrorKind =
  | "network"
  | "auth"
  | "validation"
  | "server"
  | "unknown";

function statusOf(error: unknown): number | null {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  return null;
}

/**
 * Buckets an error so the UI can pick copy and an action: a dead connection,
 * an expired session, bad input, or a failing server all need different words.
 */
export function classifyError(error: unknown): ErrorKind {
  const status = statusOf(error);
  if (status === 401 || status === 403) return "auth";
  if (status === 400 || status === 422) return "validation";
  if (status !== null && status >= 500) return "server";
  if (isNetworkFailure(error) || status === 0) return "network";
  return "unknown";
}

/** User-facing copy per error class, used by `ErrorState`. */
export const ERROR_KIND_COPY: Record<
  ErrorKind,
  { title: string; description: string; retryLabel: string }
> = {
  network: {
    title: "Sin conexión con el servidor",
    description:
      "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
    retryLabel: "Reintentar",
  },
  auth: {
    title: "Tu sesión expiró",
    description: "Vuelve a iniciar sesión para continuar.",
    retryLabel: "Iniciar sesión",
  },
  validation: {
    title: "Revisa los datos ingresados",
    description:
      "Alguno de los datos no es válido. Corrígelo e inténtalo de nuevo.",
    retryLabel: "Reintentar",
  },
  server: {
    title: "El servidor no respondió",
    description:
      "Ocurrió un problema en el servidor. Inténtalo de nuevo en unos momentos.",
    retryLabel: "Reintentar",
  },
  unknown: {
    title: "Ocurrió un error inesperado",
    description: "Algo salió mal. Inténtalo de nuevo.",
    retryLabel: "Reintentar",
  },
};
