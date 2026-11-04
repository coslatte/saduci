import { apiFetch } from "@/lib/http";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function extractCount(payload: unknown): number | null {
  if (typeof payload === "number" && Number.isFinite(payload)) {
    return payload;
  }

  if (!isRecord(payload)) return null;

  for (const key of ["count", "total", "value"]) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function extractApiError(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (!isRecord(payload)) return fallback;

  for (const key of ["error", "detail", "message"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return fallback;
}

export async function fetchSimulationCount(token: string): Promise<number> {
  const response = await apiFetch("/api/simulations/count", {
    headers: authHeaders(token),
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractApiError(payload, "No se pudo obtener el total de simulaciones."),
    );
  }

  return extractCount(payload) ?? 0;
}

export async function fetchPredictionCount(token: string): Promise<number> {
  const response = await apiFetch("/api/predictions/count", {
    headers: authHeaders(token),
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractApiError(payload, "No se pudo obtener el total de predicciones."),
    );
  }

  return extractCount(payload) ?? 0;
}
