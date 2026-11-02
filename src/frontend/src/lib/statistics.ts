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

export async function runWilcoxonTest(
  data: WilcoxonRequest,
): Promise<WilcoxonResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch("/api/statistics/wilcoxon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Error al ejecutar el test de Wilcoxon: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<WilcoxonResponse>;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "La solicitud del test de Wilcoxon excedió el tiempo de espera.",
      );
    }
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
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Error al ejecutar el test de Friedman: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<FriedmanResponse>;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "La solicitud del test de Friedman excedió el tiempo de espera.",
      );
    }
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  } finally {
    clearTimeout(timeoutId);
  }
}
