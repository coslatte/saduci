import { isNetworkFailure } from "@/lib/apiErrors";

/**
 * Incremental retry policy for requests that depend on the backend being
 * reachable (login, register, session verification).
 *
 * First attempt goes out immediately; when the server cannot be reached the
 * request is retried after 1s, 3s, 5s, 10s and then every 20s (capped).
 * While waiting, the backend is probed every second through `/api/health`
 * so the next attempt fires as soon as the server is back instead of
 * sleeping through the whole backoff delay.
 */

export const SERVER_RETRY_DELAYS_MS = [1_000, 3_000, 5_000, 10_000, 20_000];
export const SERVER_RETRY_MAX_DELAY_MS = 20_000;
export const SERVER_HEALTH_POLL_MS = 1_000;
export const SERVER_PROBE_TIMEOUT_MS = 2_000;
export const SERVER_HEALTH_PATH = "/api/health";

/** Bound for the silent session check so a dead backend cannot block startup. */
export const SESSION_VERIFY_MAX_WAIT_MS = 30_000;

export interface ServerRetryProgress {
  /** Consecutive failed attempts so far (1-based). */
  attempt: number;
  /** How long the current backoff wait lasts before the next attempt. */
  nextDelayMs: number;
}

export interface ServerRetryOptions {
  signal?: AbortSignal;
  delaysMs?: readonly number[];
  pollIntervalMs?: number;
  maxElapsedMs?: number;
  onRetry?: (progress: ServerRetryProgress) => void;
  shouldRetry?: (response: Response | null, error: unknown) => boolean;
  isServerAvailable?: (options?: { signal?: AbortSignal }) => Promise<boolean>;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function retryDelayMs(
  failures: number,
  delaysMs: readonly number[] = SERVER_RETRY_DELAYS_MS,
): number {
  if (delaysMs.length === 0) return SERVER_RETRY_MAX_DELAY_MS;
  const index = Math.min(Math.max(failures - 1, 0), delaysMs.length - 1);
  return delaysMs[index];
}

/** Only connection-level failures are retried; API answers (401, 429…) are final. */
export function defaultShouldRetry(
  response: Response | null,
  error: unknown,
): boolean {
  if (error) {
    if (isAbortError(error)) return false;
    return isNetworkFailure(error);
  }
  if (response) return response.status === 502 || response.status === 504;
  return false;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function probeServer(options?: {
  signal?: AbortSignal;
}): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SERVER_PROBE_TIMEOUT_MS);
  const onAbort = () => controller.abort(options?.signal?.reason);
  options?.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const response = await fetch(SERVER_HEALTH_PATH, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return false;
    const payload: unknown = await response.json().catch(() => null);
    if (payload && typeof payload === "object" && "reachable" in payload) {
      return (payload as { reachable: unknown }).reachable === true;
    }
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener("abort", onAbort);
  }
}

async function waitForNextAttempt(
  delayMs: number,
  options: ServerRetryOptions,
): Promise<void> {
  const pollIntervalMs = options.pollIntervalMs ?? SERVER_HEALTH_POLL_MS;
  const isServerAvailable = options.isServerAvailable ?? probeServer;
  const deadline = Date.now() + Math.max(0, delayMs);

  for (;;) {
    options.signal?.throwIfAborted();
    const remaining = deadline - Date.now();
    if (remaining <= 0) return;
    await sleep(Math.min(pollIntervalMs, remaining), options.signal);
    if (await isServerAvailable({ signal: options.signal })) return;
  }
}

export async function fetchWithServerRetry(
  input: string,
  init: RequestInit = {},
  options: ServerRetryOptions = {},
): Promise<Response> {
  const delaysMs = options.delaysMs ?? SERVER_RETRY_DELAYS_MS;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  const startedAt = Date.now();
  let failures = 0;

  for (;;) {
    options.signal?.throwIfAborted();

    let response: Response | null = null;
    let error: unknown = null;
    try {
      response = await fetch(input, { ...init, signal: options.signal });
    } catch (err) {
      error = err;
    }

    if (options.signal?.aborted) {
      throw (
        error ??
        options.signal.reason ??
        new DOMException("Aborted", "AbortError")
      );
    }

    if (!shouldRetry(response, error)) {
      if (error) throw error;
      return response as Response;
    }

    failures += 1;
    if (
      options.maxElapsedMs !== undefined &&
      Date.now() - startedAt >= options.maxElapsedMs
    ) {
      if (error) throw error;
      return response as Response;
    }

    const nextDelayMs = retryDelayMs(failures, delaysMs);
    options.onRetry?.({ attempt: failures, nextDelayMs });
    await waitForNextAttempt(nextDelayMs, options);
  }
}
