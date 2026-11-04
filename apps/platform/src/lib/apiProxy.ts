import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Upper bound for a single upstream attempt from the auth BFF routes.
 * Kept short on purpose: the client retries unreachable backends with an
 * incremental backoff (see `lib/serverAvailability.ts`), so a hanging
 * attempt must fail fast instead of blocking the retry loop.
 */
export const AUTH_UPSTREAM_TIMEOUT_MS = 10_000;

export function resolveCoreApiUrl(): string {
  const raw =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:7000";

  return raw.replace(/\/+$/, "").replace(/\/api$/, "");
}

/**
 * Resolves the caller token from the `Authorization` header, falling back to
 * the session cookie.
 *
 * The header wins only when it carries a real token. Callers build it from the
 * client store, which legitimately holds `null` when the session was restored
 * from the cookie alone; string-interpolating that produced the literal
 * `Bearer null`, which the gateway rejects with a 401 even though the request
 * carried a perfectly valid session cookie.
 */
export async function getTokenFromRequest(
  req: NextRequest,
): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const candidate = authHeader.slice("Bearer ".length).trim();
    if (candidate && candidate !== "null" && candidate !== "undefined") {
      return candidate;
    }
  }

  return req.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export async function readJsonBody(req: NextRequest): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export interface CoreJsonResult {
  status: number;
  data: unknown;
}

/**
 * Fetch JSON from the API Gateway keeping the caller auth.
 * Returns status + payload so custom handlers can transform the response
 * (e.g. find one record inside a list endpoint) before answering.
 */
export async function fetchCoreJson(
  req: NextRequest,
  upstreamPath: string,
  init: RequestInit = {},
): Promise<CoreJsonResult> {
  const token = await getTokenFromRequest(req);
  if (!token) {
    return { status: 401, data: { error: "No autenticado" } };
  }

  try {
    const upstream = await fetch(`${resolveCoreApiUrl()}${upstreamPath}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: req.signal,
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const data: unknown = contentType.includes("application/json")
      ? await upstream.json()
      : { detail: await upstream.text() };

    return { status: upstream.status, data };
  } catch (err) {
    const isAborted = err instanceof Error && err.name === "AbortError";
    return {
      status: isAborted ? 504 : 502,
      data: {
        error: isAborted
          ? "El servicio tardó demasiado en responder."
          : "No se pudo conectar con el servicio.",
      },
    };
  }
}

function isCoreRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function collectCoreItems(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!isCoreRecord(data)) return [];
  for (const key of [
    "items",
    "data",
    "results",
    "records",
    "simulations",
    "predictions",
  ]) {
    const value = data[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

/**
 * The gateway exposes history by patient (`/{patient_id}`) but no
 * get-by-id endpoint, so resolving one record means listing and matching
 * `id` server-side instead of leaking the whole list to the browser.
 */
export async function proxyCoreRecordById(
  req: NextRequest,
  listPath: string,
  id: string,
  idKeys: string[] = ["id", "uuid"],
): Promise<NextResponse> {
  const { status, data } = await fetchCoreJson(req, listPath, {
    method: "GET",
  });

  if (status !== 200) {
    return NextResponse.json(data, { status });
  }

  const found = collectCoreItems(data).find((item) => {
    if (!isCoreRecord(item)) return false;
    return idKeys.some((key) => {
      const value = item[key];
      return (
        (typeof value === "string" || typeof value === "number") &&
        String(value) === id
      );
    });
  });

  if (!found) {
    return NextResponse.json(
      { error: "Registro no encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json(found, { status: 200 });
}

export async function proxyCoreJsonRequest(
  req: NextRequest,
  upstreamPath: string,
  init: RequestInit = {},
): Promise<NextResponse> {
  try {
    const token = await getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const upstream = await fetch(`${resolveCoreApiUrl()}${upstreamPath}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: req.signal,
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const data: unknown = contentType.includes("application/json")
      ? await upstream.json()
      : { detail: await upstream.text() };

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const isAborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isAborted
          ? "El servicio tardó demasiado en responder."
          : "No se pudo conectar con el servicio.",
      },
      { status: isAborted ? 504 : 502 },
    );
  }
}
