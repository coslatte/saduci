import { apiFetch } from "@/lib/http";
import {
  formatRecordDate,
  type PredictionRecord,
  type PredictionRecordStatus,
  type SimulationRecord,
  type SimulationRecordStatus,
  type StatisticsRecord,
  type StatisticalTestType,
} from "@/lib/recordsMockData";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function normalizeSimulationStatus(value: string): SimulationRecordStatus {
  const normalized = value.trim().toLowerCase();

  if (normalized.includes("cancel")) return "cancelada";
  if (normalized.includes("proceso") || normalized.includes("progress")) {
    return "en_proceso";
  }
  return "completada";
}

function normalizePredictionStatus(value: string): PredictionRecordStatus {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("archiv")) return "archivada";
  return "activa";
}

function normalizeStatisticalTestType(value: string): StatisticalTestType {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("friedman")) return "friedman";
  return "wilcoxon";
}

function unwrapRecordList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  for (const key of [
    "items",
    "data",
    "results",
    "records",
    "simulations",
    "predictions",
    "statistical_tests",
    "statistics",
    "tests",
  ]) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
  }

  return [];
}

function extractNestedString(
  raw: Record<string, unknown>,
  outerKey: string,
  innerKey: string,
): string {
  const outer = raw[outerKey];
  if (isRecord(outer)) {
    const val = outer[innerKey];
    if (typeof val === "string" && val.trim()) return val.trim();
    if (typeof val === "number" && Number.isFinite(val)) return String(val);
  }
  return "";
}

function extractNestedNumber(
  raw: Record<string, unknown>,
  outerKey: string,
  innerKey: string,
): number {
  const outer = raw[outerKey];
  if (isRecord(outer)) {
    const val = outer[innerKey];
    if (typeof val === "number" && Number.isFinite(val)) return val;
  }
  return 0;
}

/**
 * Username shown in "Creado por" when the backend record carries no author.
 * The gateway persists `created_by` on new records, but legacy rows and
 * compute-only flows arrive without it, so pages pass the logged-in username.
 */
export function withAuthorFallback(
  createdBy: string,
  fallbackUser: string,
): string {
  const fallback = fallbackUser.trim();
  if (createdBy) return createdBy;
  return fallback || "—";
}

export function mapSimulationRecord(
  raw: unknown,
  index: number,
  fallbackUser = "",
): SimulationRecord | null {
  if (!isRecord(raw)) return null;

  const patientId = pickString(raw, [
    "patient_id",
    "patientId",
    "id_paciente",
    "paciente",
  ]);

  let runs = pickNumber(raw, ["runs", "sim_runs", "simRuns", "iterations"]);
  if (!runs) {
    runs =
      pickNumber(raw, ["n_runs", "n_replications"]) ||
      extractNestedNumber(raw, "parameters", "n_runs");
  }

  let result = pickString(raw, [
    "result",
    "resultado",
    "summary",
    "outcome",
    "message",
  ]);
  if (!result) {
    result = extractNestedString(raw, "parameters", "result");
  }
  if (!result) {
    const probStr = extractNestedString(raw, "results", "probability");
    result = probStr
      ? `Probabilidad de fallecer: ${(Number(probStr) * 100).toFixed(0)}%`
      : "";
  }
  if (!result) {
    // Platform compute records store { simulation, prediction } in results.
    const results = raw.results;
    if (isRecord(results)) {
      const prediction = results.prediction;
      if (isRecord(prediction)) {
        const prob = prediction.probability;
        if (typeof prob === "number" && Number.isFinite(prob)) {
          result = `Probabilidad de fallecer: ${(prob * 100).toFixed(0)}%`;
        } else {
          const label = prediction.predicted_label;
          if (typeof label === "string" && label.trim()) {
            result = label.trim();
          }
        }
      }
    }
  }

  let createdBy = pickString(raw, [
    "created_by",
    "createdBy",
    "username",
    "user",
    "author",
  ]);
  if (!createdBy) {
    const uid = pickNumber(raw, ["user_id"]);
    createdBy = uid ? `Usuario #${uid}` : "";
  }

  const createdAt = pickString(raw, [
    "created_at",
    "createdAt",
    "fecha",
    "timestamp",
  ]);
  const id = pickString(raw, ["id", "simulation_id", "uuid"]) || `sim-${index}`;
  const status = normalizeSimulationStatus(
    pickString(raw, ["status", "estado", "state"]) ||
      extractNestedString(raw, "parameters", "status") ||
      "completada",
  );

  return {
    id,
    patientId: patientId || "—",
    runs: runs || 0,
    result: result || "Sin resultado",
    createdBy: withAuthorFallback(createdBy, fallbackUser),
    createdAt: createdAt || new Date().toISOString(),
    status,
  };
}

export function mapPredictionRecord(
  raw: unknown,
  index: number,
  fallbackUser = "",
): PredictionRecord | null {
  if (!isRecord(raw)) return null;

  const patientId = pickString(raw, [
    "patient_id",
    "patientId",
    "id_paciente",
    "paciente",
  ]);

  let outcome = pickString(raw, [
    "outcome",
    "result",
    "resultado",
    "prediction",
    "label",
  ]);
  if (!outcome) {
    const label = extractNestedString(raw, "prediction", "predicted_label");
    if (label) {
      outcome =
        label === "vive" ? "No fallece" : label === "muere" ? "Fallece" : label;
    }
  }

  let probability = pickNumber(raw, [
    "probability",
    "probabilidad",
    "prob",
    "score",
  ]);
  if (!probability) {
    probability =
      extractNestedNumber(raw, "prediction", "probability") ||
      pickNumber(raw, ["confidence"]);
  }
  if (probability > 1) probability = probability / 100;

  let createdBy = pickString(raw, [
    "created_by",
    "createdBy",
    "username",
    "user",
    "author",
  ]);
  if (!createdBy) {
    const uid = pickNumber(raw, ["user_id"]);
    createdBy = uid ? `Usuario #${uid}` : "";
  }

  const createdAt = pickString(raw, [
    "created_at",
    "createdAt",
    "fecha",
    "timestamp",
  ]);
  const id =
    pickString(raw, ["id", "prediction_id", "uuid"]) || `pred-${index}`;
  const status = normalizePredictionStatus(
    pickString(raw, ["status", "estado", "state"]) || "activa",
  );

  return {
    id,
    patientId: patientId || "—",
    outcome: outcome || "—",
    probability,
    createdBy: withAuthorFallback(createdBy, fallbackUser),
    createdAt: createdAt || new Date().toISOString(),
    status,
  };
}

export function mapSimulationRecords(
  payload: unknown,
  fallbackUser = "",
): SimulationRecord[] {
  return unwrapRecordList(payload)
    .map((item, index) => mapSimulationRecord(item, index, fallbackUser))
    .filter((item): item is SimulationRecord => item !== null);
}

export function mapPredictionRecords(
  payload: unknown,
  fallbackUser = "",
): PredictionRecord[] {
  return unwrapRecordList(payload)
    .map((item, index) => mapPredictionRecord(item, index, fallbackUser))
    .filter((item): item is PredictionRecord => item !== null);
}

export function mapStatisticsRecord(
  raw: unknown,
  index: number,
  fallbackUser = "",
): StatisticsRecord | null {
  if (!isRecord(raw)) return null;

  const testType = normalizeStatisticalTestType(
    pickString(raw, ["test_type", "testType", "type", "prueba", "test"]) ||
      "wilcoxon",
  );
  const variable = pickString(raw, [
    "variable",
    "column",
    "column_name",
    "columnName",
    "metric",
  ]);
  const statistic = pickNumber(raw, [
    "statistic",
    "estadistico",
    "stat",
    "value",
  ]);
  const pValue = pickNumber(raw, ["p_value", "pValue", "pvalue", "p"]);
  const interpretation = pickString(raw, [
    "interpretation",
    "interpretacion",
    "result",
    "resultado",
    "summary",
  ]);
  const createdBy = pickString(raw, [
    "created_by",
    "createdBy",
    "username",
    "user",
    "author",
  ]);
  const createdAt = pickString(raw, [
    "created_at",
    "createdAt",
    "fecha",
    "timestamp",
  ]);
  const id = pickString(raw, ["id", "test_id", "uuid"]) || `stat-${index}`;

  return {
    id,
    testType,
    variable: variable || "—",
    statistic,
    pValue,
    interpretation: interpretation || "—",
    createdBy: withAuthorFallback(createdBy, fallbackUser),
    createdAt: createdAt || new Date().toISOString(),
  };
}

export function mapStatisticsRecords(
  payload: unknown,
  fallbackUser = "",
): StatisticsRecord[] {
  return unwrapRecordList(payload)
    .map((item, index) => mapStatisticsRecord(item, index, fallbackUser))
    .filter((item): item is StatisticsRecord => item !== null);
}

export function extractApiError(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (!isRecord(payload)) return fallback;

  for (const key of ["error", "detail", "message"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return fallback;
}

export interface SimulationRecordInput {
  patientId: string;
  runs: number;
  result?: string;
  status?: SimulationRecordStatus;
}

export interface PredictionRecordInput {
  patientId: string;
  age: number;
  severityScore: number;
}

export interface PredictionRecordUpdateInput {
  patientId: string;
  outcome: string;
  probability: number;
}

export interface StatisticsRecordInput {
  testType: StatisticalTestType;
  variable: string;
  statistic: number;
  pValue: number;
  interpretation?: string;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function ensureOk(response: Response, fallback: string): Promise<void> {
  if (response.ok) return;
  const payload: unknown = await response.json().catch(() => null);
  throw new Error(extractApiError(payload, fallback));
}

export async function fetchSimulationRecords(
  token: string,
  fallbackUser = "",
): Promise<SimulationRecord[]> {
  const response = await apiFetch("/api/simulations", {
    headers: authHeaders(token),
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractApiError(payload, "No se pudieron cargar las simulaciones."),
    );
  }

  return mapSimulationRecords(payload, fallbackUser);
}

export interface SimulationDetail {
  record: SimulationRecord;
  parameters: Record<string, unknown>;
  results: Record<string, unknown>;
  scenario: string;
}

/**
 * Full payload behind "Detalles de Simulación": mapped row plus the raw
 * `parameters`/`results` the list mapper drops.
 */
export async function fetchSimulationDetail(
  token: string,
  id: string,
  fallbackUser = "",
): Promise<SimulationDetail> {
  const response = await apiFetch(
    `/api/simulations/${encodeURIComponent(id)}`,
    { headers: authHeaders(token) },
  );
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractApiError(payload, "No se pudo cargar la simulación."),
    );
  }

  const record = mapSimulationRecord(payload, 0, fallbackUser);
  if (!record) {
    throw new Error("La simulación no tiene el formato esperado.");
  }

  const raw: Record<string, unknown> =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  const parameters =
    typeof raw.parameters === "object" && raw.parameters !== null
      ? (raw.parameters as Record<string, unknown>)
      : {};
  const results =
    typeof raw.results === "object" && raw.results !== null
      ? (raw.results as Record<string, unknown>)
      : {};
  const scenario = typeof raw.scenario === "string" ? raw.scenario : "";

  return { record, parameters, results, scenario };
}

export async function createSimulationRecord(
  token: string,
  input: SimulationRecordInput,
): Promise<void> {
  const response = await apiFetch("/api/simulations", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      patient_id: input.patientId,
      scenario: "treatment_response",
      parameters: {
        n_runs: input.runs,
        result: input.result,
        status: input.status,
      },
    }),
  });
  await ensureOk(response, "No se pudo crear la simulación.");
}

export async function fetchPredictionRecords(
  token: string,
  fallbackUser = "",
): Promise<PredictionRecord[]> {
  const response = await apiFetch("/api/predictions", {
    headers: authHeaders(token),
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractApiError(payload, "No se pudieron cargar las predicciones."),
    );
  }

  return mapPredictionRecords(payload, fallbackUser);
}

export interface PredictionDetail {
  record: PredictionRecord;
  features: Record<string, unknown>;
  prediction: Record<string, unknown>;
  modelName: string;
}

/**
 * Full payload behind the prediction detail view: mapped row plus the raw
 * `features`/`prediction` the list mapper drops.
 */
export async function fetchPredictionDetail(
  token: string,
  id: string,
  fallbackUser = "",
): Promise<PredictionDetail> {
  const response = await apiFetch(
    `/api/predictions/${encodeURIComponent(id)}`,
    { headers: authHeaders(token) },
  );
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractApiError(payload, "No se pudo cargar la predicción."),
    );
  }

  const record = mapPredictionRecord(payload, 0, fallbackUser);
  if (!record) {
    throw new Error("La predicción no tiene el formato esperado.");
  }

  const raw: Record<string, unknown> =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  const features =
    typeof raw.features === "object" && raw.features !== null
      ? (raw.features as Record<string, unknown>)
      : {};
  const prediction =
    typeof raw.prediction === "object" && raw.prediction !== null
      ? (raw.prediction as Record<string, unknown>)
      : {};
  const modelName = typeof raw.model_name === "string" ? raw.model_name : "";

  return { record, features, prediction, modelName };
}

export async function createPredictionRecord(
  token: string,
  input: PredictionRecordInput,
): Promise<void> {
  const response = await apiFetch("/api/predictions", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      patient_id: input.patientId,
      model_name: "mortality_risk",
      features: { age: input.age, severity_score: input.severityScore },
    }),
  });
  await ensureOk(response, "No se pudo crear la predicción.");
}

export async function fetchStatisticsRecords(
  token: string,
  fallbackUser = "",
): Promise<StatisticsRecord[]> {
  const response = await apiFetch("/api/statistical-tests", {
    headers: authHeaders(token),
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractApiError(
        payload,
        "No se pudieron cargar las pruebas estadísticas.",
      ),
    );
  }

  return mapStatisticsRecords(payload, fallbackUser);
}

export async function createStatisticsRecord(
  token: string,
  input: StatisticsRecordInput,
): Promise<void> {
  const response = await apiFetch("/api/statistical-tests", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      test_type: input.testType,
      variable: input.variable,
      statistic: input.statistic,
      p_value: input.pValue,
      interpretation: input.interpretation,
    }),
  });
  await ensureOk(response, "No se pudo crear la prueba estadística.");
}

export async function updateSimulationRecord(
  token: string,
  id: string,
  input: SimulationRecordInput,
): Promise<void> {
  const response = await apiFetch(`/api/simulations/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({
      patient_id: input.patientId,
      scenario: "treatment_response",
      parameters: {
        n_runs: input.runs,
        result: input.result,
        status: input.status,
      },
    }),
  });
  await ensureOk(response, "No se pudo actualizar la simulación.");
}

export async function deleteSimulationRecord(
  token: string,
  id: string,
): Promise<void> {
  const response = await apiFetch(`/api/simulations/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(
      extractApiError(payload, "No se pudo eliminar la simulación."),
    );
  }
}

export async function updatePredictionRecord(
  token: string,
  id: string,
  input: PredictionRecordUpdateInput,
): Promise<void> {
  const response = await apiFetch(`/api/predictions/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({
      patient_id: input.patientId,
      prediction: { outcome: input.outcome },
      confidence: input.probability,
    }),
  });
  await ensureOk(response, "No se pudo actualizar la predicción.");
}

export async function deletePredictionRecord(
  token: string,
  id: string,
): Promise<void> {
  const response = await apiFetch(`/api/predictions/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(
      extractApiError(payload, "No se pudo eliminar la predicción."),
    );
  }
}

export async function updateStatisticsRecord(
  token: string,
  id: string,
  input: StatisticsRecordInput,
): Promise<void> {
  const response = await apiFetch(`/api/statistical-tests/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({
      test_type: input.testType,
      variable: input.variable,
      statistic: input.statistic,
      p_value: input.pValue,
      interpretation: input.interpretation,
    }),
  });
  await ensureOk(response, "No se pudo actualizar la prueba estadística.");
}

export async function deleteStatisticsRecord(
  token: string,
  id: string,
): Promise<void> {
  const response = await apiFetch(`/api/statistical-tests/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(
      extractApiError(payload, "No se pudo eliminar la prueba estadística."),
    );
  }
}

export { formatRecordDate };
