export const PREDICTION_LIMITS = {
  edad: { min: 14, max: 61, default: 20 },
  diagIng1: { min: 1, max: 20, default: 1 },
  diagIng2: { min: 39, max: 173, default: 60 },
  diagEgr2: { min: 18, max: 40, default: 30 },
  apache: { min: 18, max: 40, default: 30 },
  tiempoVam: { min: 18, max: 40, default: 30 },
} as const;

export type ExplanationMethod =
  | "LIME"
  | "SHAP"
  | "Gradientes Integrados"
  | "Mapas de Saliencia";

export const EXPLANATION_METHODS: ExplanationMethod[] = [
  "LIME",
  "SHAP",
  "Gradientes Integrados",
  "Mapas de Saliencia",
];

export interface PredictionRequest {
  edad: number;
  diag_ing1: number;
  diag_ing2: number;
  diag_egr2: number;
  apache: number;
  tiempo_vam: number;
}

export interface PredictionResponse {
  probability: number;
  probability_percent: number;
  predicted_class: number;
  predicted_label: string;
  threshold: number;
}

export interface ExplicacionRequest extends PredictionRequest {
  method: ExplanationMethod;
}

export interface ExplicacionResponse {
  feature_names: string[];
  importances: number[];
  probability: number;
  predicted_class: number;
  predicted_label: string;
  rows: ExplicacionRow[];
}

export interface ExplicacionRow {
  feature_key: string;
  feature_name: string;
  patient_value: number;
  patient_value_display: string;
  baseline_value: number;
  contribution: number;
  direction: "increase_risk" | "decrease_risk" | "neutral";
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim().length > 0) return payload;
  if (!payload || typeof payload !== "object") return null;

  if (
    "error" in payload &&
    typeof payload.error === "string" &&
    payload.error.trim().length > 0
  ) {
    return payload.error;
  }

  if (
    "detail" in payload &&
    typeof payload.detail === "string" &&
    payload.detail.trim().length > 0
  ) {
    return payload.detail;
  }

  if (
    "message" in payload &&
    typeof payload.message === "string" &&
    payload.message.trim().length > 0
  ) {
    return payload.message;
  }

  return null;
}

async function readErrorPayload(response: Response): Promise<string | null> {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const payload: unknown = await response.json();
      return extractErrorMessage(payload);
    }

    const text = await response.text();
    if (text.trim().length > 0) return text;
    return null;
  } catch {
    return null;
  }
}

async function ensureOkResponse(
  response: Response,
  fallbackPrefix: string,
): Promise<void> {
  if (response.ok) return;

  const detail = await readErrorPayload(response);

  if (response.status === 404) {
    throw new Error(
      detail ??
        "El backend de predicción respondió 404. Esto suele indicar que saduci-core está corriendo una versión antigua sin el endpoint requerido (/prediccion).",
    );
  }

  if (detail) {
    throw new Error(detail);
  }

  throw new Error(
    `${fallbackPrefix}: ${response.status} ${response.statusText}`,
  );
}

function isPredictionResponse(value: unknown): value is PredictionResponse {
  return (
    !!value &&
    typeof value === "object" &&
    "probability" in value &&
    typeof value.probability === "number" &&
    "predicted_label" in value &&
    typeof value.predicted_label === "string"
  );
}

function isExplicacionResponse(value: unknown): value is ExplicacionResponse {
  return (
    !!value &&
    typeof value === "object" &&
    "feature_names" in value &&
    Array.isArray(value.feature_names) &&
    "importances" in value &&
    Array.isArray(value.importances) &&
    "rows" in value &&
    Array.isArray(value.rows)
  );
}

export async function runPrediction(
  data: PredictionRequest,
): Promise<PredictionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("/api/prediction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    await ensureOkResponse(response, "Error en la predicción");

    const payload: unknown = await response.json();
    if (!isPredictionResponse(payload)) {
      throw new Error(
        "La respuesta del backend de predicción no tiene el formato esperado.",
      );
    }

    return payload;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "La solicitud de predicción ha excedido el tiempo de espera.",
      );
    }
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runExplicacion(
  data: ExplicacionRequest,
): Promise<ExplicacionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("/api/prediction/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    await ensureOkResponse(response, "Error generando explicación");

    const payload: unknown = await response.json();
    if (!isExplicacionResponse(payload)) {
      throw new Error(
        "La respuesta del backend de explicabilidad no tiene el formato esperado.",
      );
    }

    return payload;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "La solicitud de explicación ha excedido el tiempo de espera.",
      );
    }
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  } finally {
    clearTimeout(timeoutId);
  }
}
