import "server-only";

import { cookies } from "next/headers";
import { resolveCoreApiUrl } from "@/lib/apiProxy";
import { SESSION_COOKIE } from "@/lib/session";
import { extractErrorMessage } from "@/lib/types/normalize";
import { HttpError } from "@/lib/types/http-error";
import {
  UPSTREAM_TIMEOUTS_MS,
  type UpstreamTimeoutKey,
} from "@/lib/server/timeouts";

export type ServerApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  timeoutKey?: UpstreamTimeoutKey;
  /** Skip Authorization header (login/register before a token exists). */
  anonymous?: boolean;
  signal?: AbortSignal;
  next?: NextRequestCache;
};

type NextRequestCache = "no-store" | "force-cache" | "default";

/**
 * Server-only HTTP client for Server Actions and Server Components.
 * Talks exclusively to the API Gateway (`API_URL`) — never to internal
 * microservice ports (8001–8004).
 */
export async function serverApiRequest<T>(
  path: string,
  options: ServerApiOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    timeoutKey = "default",
    anonymous = false,
    signal,
    next,
  } = options;

  const timeoutMs = options.timeoutMs ?? UPSTREAM_TIMEOUTS_MS[timeoutKey];
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (!anonymous && token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${resolveCoreApiUrl()}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: next ?? "no-store",
    });

    if (!response.ok) {
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      throw new HttpError(
        response.status,
        extractErrorMessage(payload, `Error ${response.status}`),
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return (await response.text()) as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new HttpError(504, "El servicio tardó demasiado en responder.");
    }
    throw new HttpError(
      502,
      "No se pudo conectar con el API Gateway de saduci-core.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export const serverApi = {
  get: <T>(path: string, options?: Omit<ServerApiOptions, "method" | "body">) =>
    serverApiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<ServerApiOptions, "method" | "body">,
  ) => serverApiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(
    path: string,
    body?: unknown,
    options?: Omit<ServerApiOptions, "method" | "body">,
  ) => serverApiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<ServerApiOptions, "method" | "body">,
  ) => serverApiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(
    path: string,
    options?: Omit<ServerApiOptions, "method" | "body">,
  ) => serverApiRequest<T>(path, { ...options, method: "DELETE" }),
};
