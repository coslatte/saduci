// ─── Experiment variable labels ───────────────────────────────────────────────

export const EXPERIMENT_VARIABLE_LABELS: string[] = [
  "Tiempo Pre VAM",
  "Tiempo VAM",
  "Tiempo Post VAM",
  "Estadía UCI",
  "Estadía Post UCI",
];

// ─── Shared result ─────────────────────────────────────────────────────────────

export interface StatisticalTestResult {
  statistic: number;
  p_value: number;
  interpretation?: string;
}

// ─── Wilcoxon ──────────────────────────────────────────────────────────────────

export interface WilcoxonRequest {
  sample_a: number[];
  sample_b: number[];
  alternative?: "two-sided" | "less" | "greater";
}

export type WilcoxonResponse = StatisticalTestResult;

async function statisticsError(response: Response): Promise<string> {
  if (response.status >= 500) {
    return "El servicio de estadísticas no está disponible en este momento. Puede seguir utilizando los demás módulos e intentarlo de nuevo más tarde.";
  }
  const payload: unknown = await response.json().catch(() => null);
  if (payload && typeof payload === "object") {
    if ("error" in payload && typeof payload.error === "string")
      return payload.error;
    if ("detail" in payload && typeof payload.detail === "string")
      return payload.detail;
  }
  return `No se pudo realizar la prueba estadística (código ${response.status}).`;
}

export async function runWilcoxonTest(
  data: WilcoxonRequest,
): Promise<WilcoxonResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch("/api/statistics/wilcoxon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x: data.sample_a, y: data.sample_b }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await statisticsError(response));
    }

    return (await response.json()) as WilcoxonResponse;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "La solicitud del test de Wilcoxon excedió el tiempo de espera.",
      );
    }
    if (err instanceof TypeError)
      throw new Error(
        "No se pudo conectar con el servicio de estadísticas. Puede seguir utilizando los demás módulos.",
      );
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Friedman ──────────────────────────────────────────────────────────────────

export interface FriedmanRequest {
  groups: Record<string, number[]>;
}

export type FriedmanResponse = StatisticalTestResult;

export async function runFriedmanTest(
  data: FriedmanRequest,
): Promise<FriedmanResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch("/api/statistics/friedman", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ samples: Object.values(data.groups) }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await statisticsError(response));
    }

    return (await response.json()) as FriedmanResponse;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "La solicitud del test de Friedman excedió el tiempo de espera.",
      );
    }
    if (err instanceof TypeError)
      throw new Error(
        "No se pudo conectar con el servicio de estadísticas. Puede seguir utilizando los demás módulos.",
      );
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  } finally {
    clearTimeout(timeoutId);
  }
}
