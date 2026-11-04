import "../setup";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ApiError } from "@/lib/apiErrors";
import {
  SERVER_RETRY_DELAYS_MS,
  SERVER_RETRY_MAX_DELAY_MS,
  defaultShouldRetry,
  fetchWithServerRetry,
  isAbortError,
  probeServer,
  retryDelayMs,
} from "@/lib/serverAvailability";

const originalFetch = globalThis.fetch;

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("retryDelayMs", () => {
  it("follows the 1s, 3s, 5s, 10s, 20s schedule", () => {
    expect(retryDelayMs(1)).toBe(1_000);
    expect(retryDelayMs(2)).toBe(3_000);
    expect(retryDelayMs(3)).toBe(5_000);
    expect(retryDelayMs(4)).toBe(10_000);
    expect(retryDelayMs(5)).toBe(20_000);
  });

  it("stays at 20s after the schedule is exhausted", () => {
    expect(retryDelayMs(6)).toBe(20_000);
    expect(retryDelayMs(100)).toBe(20_000);
    expect(SERVER_RETRY_DELAYS_MS.at(-1)).toBe(SERVER_RETRY_MAX_DELAY_MS);
  });
});

describe("defaultShouldRetry", () => {
  it("retries connection-level failures", () => {
    expect(defaultShouldRetry(null, new TypeError("fetch failed"))).toBe(true);
    expect(defaultShouldRetry(null, new ApiError("down", 0))).toBe(true);
  });

  it("retries gateway answers when the backend is unreachable", () => {
    expect(defaultShouldRetry(jsonResponse({}, 502), null)).toBe(true);
    expect(defaultShouldRetry(jsonResponse({}, 504), null)).toBe(true);
  });

  it("does not retry API answers or user aborts", () => {
    expect(defaultShouldRetry(jsonResponse({}, 401), null)).toBe(false);
    expect(defaultShouldRetry(jsonResponse({}, 429), null)).toBe(false);
    expect(defaultShouldRetry(jsonResponse({}, 200), null)).toBe(false);
    expect(
      defaultShouldRetry(null, new DOMException("Aborted", "AbortError")),
    ).toBe(false);
  });

  it("detects abort errors", () => {
    expect(isAbortError(new DOMException("Aborted", "AbortError"))).toBe(true);
    expect(isAbortError(new Error("No se pudo conectar"))).toBe(false);
  });
});

describe("fetchWithServerRetry", () => {
  it("returns the first response when it is final", async () => {
    let calls = 0;
    const seen: number[] = [];
    globalThis.fetch = (async () => {
      calls += 1;
      return jsonResponse({ ok: true }, 200);
    }) as unknown as typeof fetch;

    const response = await fetchWithServerRetry(
      "/api/auth/login",
      {},
      {
        onRetry: (progress) => seen.push(progress.attempt),
      },
    );

    expect(response.status).toBe(200);
    expect(calls).toBe(1);
    expect(seen).toEqual([]);
  });

  it("retries 502 answers with the incremental schedule", async () => {
    let calls = 0;
    const attempts: number[] = [];
    const delays: number[] = [];
    globalThis.fetch = (async () => {
      calls += 1;
      return calls < 3
        ? jsonResponse({ error: "down" }, 502)
        : jsonResponse({ ok: true }, 200);
    }) as unknown as typeof fetch;

    const response = await fetchWithServerRetry(
      "/api/auth/login",
      {},
      {
        delaysMs: [5, 5, 5],
        isServerAvailable: async () => false,
        onRetry: (progress) => {
          attempts.push(progress.attempt);
          delays.push(progress.nextDelayMs);
        },
      },
    );

    expect(response.status).toBe(200);
    expect(calls).toBe(3);
    expect(attempts).toEqual([1, 2]);
    expect(delays).toEqual([5, 5]);
  });

  it("does not retry invalid credentials", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return jsonResponse({ error: "Credenciales inválidas." }, 401);
    }) as unknown as typeof fetch;

    const response = await fetchWithServerRetry(
      "/api/auth/login",
      {},
      {
        delaysMs: [5],
      },
    );

    expect(response.status).toBe(401);
    expect(calls).toBe(1);
  });

  it("retries network failures and rethrows user aborts", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("fetch failed");
      return jsonResponse({ ok: true }, 200);
    }) as unknown as typeof fetch;

    const ok = await fetchWithServerRetry(
      "/api/auth/login",
      {},
      {
        delaysMs: [5],
        isServerAvailable: async () => false,
      },
    );
    expect(ok.status).toBe(200);
    expect(calls).toBe(2);

    globalThis.fetch = (async () => {
      throw new DOMException("Aborted", "AbortError");
    }) as unknown as typeof fetch;

    await expect(fetchWithServerRetry("/api/auth/login", {})).rejects.toThrow(
      expect.any(DOMException),
    );
  });

  it("fires the next attempt as soon as the probe sees the server", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return calls < 2
        ? jsonResponse({ error: "down" }, 502)
        : jsonResponse({ ok: true }, 200);
    }) as unknown as typeof fetch;

    const startedAt = Date.now();
    const response = await fetchWithServerRetry(
      "/api/auth/login",
      {},
      {
        delaysMs: [10_000],
        isServerAvailable: async () => true,
      },
    );

    expect(response.status).toBe(200);
    expect(calls).toBe(2);
    expect(Date.now() - startedAt).toBeLessThan(5_000);
  });

  it("stops waiting once maxElapsedMs is exceeded", async () => {
    let calls = 0;
    const attempts: number[] = [];
    globalThis.fetch = (async () => {
      calls += 1;
      return jsonResponse({ error: "down" }, 502);
    }) as unknown as typeof fetch;

    const response = await fetchWithServerRetry(
      "/api/auth/login",
      {},
      {
        maxElapsedMs: 0,
        onRetry: (progress) => attempts.push(progress.attempt),
      },
    );

    expect(response.status).toBe(502);
    expect(calls).toBe(1);
    expect(attempts).toEqual([]);
  });

  it("aborts while waiting for the next attempt", async () => {
    globalThis.fetch = (async () =>
      jsonResponse({ error: "down" }, 502)) as unknown as typeof fetch;

    const controller = new AbortController();
    const pending = fetchWithServerRetry(
      "/api/auth/login",
      {},
      {
        signal: controller.signal,
        delaysMs: [5_000],
        isServerAvailable: async () => false,
      },
    );
    setTimeout(() => controller.abort(), 20);

    const error = await pending.then(
      () => null,
      (rejection: unknown) => rejection,
    );
    expect(isAbortError(error)).toBe(true);
  });
});

describe("probeServer", () => {
  it("reports the backend as reachable only on explicit confirmation", async () => {
    globalThis.fetch = (async () =>
      jsonResponse({ reachable: true }, 200)) as unknown as typeof fetch;
    expect(await probeServer()).toBe(true);

    globalThis.fetch = (async () =>
      jsonResponse({ reachable: false }, 502)) as unknown as typeof fetch;
    expect(await probeServer()).toBe(false);

    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await probeServer()).toBe(false);
  });
});
