import { HttpError } from "@/lib/types/http-error";

/**
 * Normalize heterogeneous upstream bodies (FastAPI `detail`, BFF `error`,
 * generic `message`) into a single human-readable string.
 */
export function extractErrorMessage(
  payload: unknown,
  fallback: string,
): string {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (!payload || typeof payload !== "object") return fallback;

  const record = payload as Record<string, unknown>;

  for (const key of ["detail", "error", "message"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value) && value.length > 0) {
      return value.map(String).join(" ");
    }
  }

  if (record.detail && typeof record.detail === "object") {
    const detail = record.detail as Record<string, unknown>;
    const parts: string[] = [];
    for (const value of Object.values(detail)) {
      if (typeof value === "string" && value.trim()) parts.push(value.trim());
      if (Array.isArray(value)) {
        parts.push(...value.map(String));
      }
    }
    if (parts.length > 0) return parts.join(" ");
  }

  return fallback;
}

/** Build HttpError from a failed fetch Response (browser or server). */
export async function toHttpError(
  response: Response,
  fallback: string,
): Promise<HttpError> {
  let payload: unknown = null;
  try {
    const contentType = response.headers.get("content-type") ?? "";
    payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch {
    payload = null;
  }

  const message = extractErrorMessage(payload, fallback);

  let fieldErrors: Record<string, string | string[]> | undefined;
  if (payload && typeof payload === "object") {
    const detail = (payload as Record<string, unknown>).detail;
    if (detail && typeof detail === "object" && !Array.isArray(detail)) {
      fieldErrors = detail as Record<string, string | string[]>;
    }
  }

  return new HttpError(response.status, message, fieldErrors);
}
