import type { ExplanationMethod } from "@/entities/prediction";
export { EXPLANATION_METHODS } from "@/entities/prediction";
export type { ExplanationMethod } from "@/entities/prediction";

export const PREDICTION_LIMITS = {
  edad: { min: 14, max: 61, default: 20 },
  diagIng1: { min: 1, max: 20, default: 1 },
  // PREUCI_DIAG catalog shared with the simulation flow (0 = Vacío).
  diagIng2: { min: 0, max: 40, default: 0 },
  diagEgr2: { min: 18, max: 40, default: 30 },
  apache: { min: 18, max: 40, default: 30 },
  tiempoVam: { min: 18, max: 40, default: 30 },
} as const;

export interface PredictionRequest {
  patient_id: string;
  edad: number;
  diag_ing1: number;
  diag_ing2: number;
  diag_egr2: number;
  apache: number;
  tiempo_vam: number;
}

export interface PredictionResponse {
  persisted: boolean;
  probability: number;
  probability_percent: number;
  predicted_class: number;
  predicted_label: string;
  threshold: number;
  model_version: string;
  artifact_sha256: string;
}

export interface ExplicacionRequest extends PredictionRequest {
  method: ExplanationMethod;
  include_narrative?: boolean;
  ai_provider?: "stub" | "embedded" | "local" | "gemini" | "huggingface";
}

export interface ExplicacionResponse {
  method: ExplanationMethod;
  explainer_version: string;
  reference_strategy: string;
  reference_warning: string;
  narrative_status: "disabled" | "generated" | "template" | "fallback";
  feature_names: string[];
  importances: number[];
  probability: number;
  threshold: number;
  predicted_class: number;
  predicted_label: string;
  rows: ExplicacionRow[];
  model_version: string;
  artifact_sha256: string;
  narrative?: string | null;
  narrative_provider?: string | null;
  narrative_model?: string | null;
}

export interface ExplicacionRow {
  feature_key: string;
  feature_name: string;
  patient_value: number;
  patient_value_display: string;
  baseline_value: number;
  baseline_value_display: string;
  baseline_probability: number;
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

function hasModelProvenance(value: object): boolean {
  return (
    "model_version" in value &&
    typeof value.model_version === "string" &&
    value.model_version.trim().length > 0 &&
    "artifact_sha256" in value &&
    typeof value.artifact_sha256 === "string" &&
    /^[a-f0-9]{64}$/.test(value.artifact_sha256)
  );
}

function isPredictionResponse(value: unknown): value is PredictionResponse {
  return (
    !!value &&
    typeof value === "object" &&
    hasModelProvenance(value) &&
    "probability" in value &&
    typeof value.probability === "number" &&
    "persisted" in value &&
    typeof value.persisted === "boolean" &&
    "predicted_label" in value &&
    typeof value.predicted_label === "string"
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isExplanationRow(value: unknown): value is ExplicacionRow {
  if (!value || typeof value !== "object") return false;
  return (
    [
      "feature_key",
      "feature_name",
      "patient_value_display",
      "baseline_value_display",
    ].every((key) => typeof Reflect.get(value, key) === "string") &&
    ["patient_value", "baseline_value", "contribution"].every((key) =>
      isFiniteNumber(Reflect.get(value, key)),
    ) &&
    "baseline_probability" in value &&
    isFiniteNumber(value.baseline_probability) &&
    value.baseline_probability >= 0 &&
    value.baseline_probability <= 1 &&
    "direction" in value &&
    (value.direction === "increase_risk" ||
      value.direction === "decrease_risk" ||
      value.direction === "neutral")
  );
}

function isExplicacionResponse(value: unknown): value is ExplicacionResponse {
  return (
    !!value &&
    typeof value === "object" &&
    hasModelProvenance(value) &&
    "method" in value &&
    value.method === "Impacto local por referencia" &&
    "explainer_version" in value &&
    typeof value.explainer_version === "string" &&
    "reference_strategy" in value &&
    typeof value.reference_strategy === "string" &&
    "reference_warning" in value &&
    typeof value.reference_warning === "string" &&
    "narrative_status" in value &&
    (value.narrative_status === "disabled" ||
      value.narrative_status === "generated" ||
      value.narrative_status === "template" ||
      value.narrative_status === "fallback") &&
    "feature_names" in value &&
    Array.isArray(value.feature_names) &&
    value.feature_names.every((name) => typeof name === "string") &&
    "importances" in value &&
    Array.isArray(value.importances) &&
    value.importances.every(isFiniteNumber) &&
    "probability" in value &&
    isFiniteNumber(value.probability) &&
    value.probability >= 0 &&
    value.probability <= 1 &&
    "threshold" in value &&
    isFiniteNumber(value.threshold) &&
    value.threshold >= 0 &&
    value.threshold <= 1 &&
    "predicted_class" in value &&
    (value.predicted_class === 0 || value.predicted_class === 1) &&
    "predicted_label" in value &&
    typeof value.predicted_label === "string" &&
    ["narrative", "narrative_provider", "narrative_model"].every((key) => {
      const field = Reflect.get(value, key);
      return field == null || typeof field === "string";
    }) &&
    "rows" in value &&
    Array.isArray(value.rows) &&
    value.rows.every(isExplanationRow) &&
    value.rows.length === value.feature_names.length &&
    value.rows.length === value.importances.length
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
