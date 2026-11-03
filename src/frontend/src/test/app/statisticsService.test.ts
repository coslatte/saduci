import { describe, expect, it } from "bun:test";
import { runFriedmanTest, runWilcoxonTest } from "@/lib/statistics";

describe("statistics service failures", () => {
  it("sends the fields required by the gateway for each test", async () => {
    const originalFetch = globalThis.fetch;
    const sent: unknown[] = [];
    globalThis.fetch = Object.assign(
      async (_input: string | URL | Request, init?: RequestInit) => {
        sent.push(JSON.parse(String(init?.body)));
        return Response.json({ statistic: 2, p_value: 0.25 });
      },
      { preconnect: originalFetch.preconnect },
    );
    try {
      await runWilcoxonTest({ sample_a: [1], sample_b: [2] });
      await runFriedmanTest({ groups: { a: [1], b: [2], c: [3] } });
      expect(sent).toEqual([{ x: [1], y: [2] }, { samples: [[1], [2], [3]] }]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
  it("reports an unavailable service and allows a later retry", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = Object.assign(
      async () => {
        calls++;
        return calls === 1
          ? Response.json({ error: "unavailable" }, { status: 503 })
          : Response.json({ statistic: 2, p_value: 0.25 });
      },
      { preconnect: originalFetch.preconnect },
    );
    try {
      const request = { sample_a: [1, 2], sample_b: [2, 3] };
      await expect(runWilcoxonTest(request)).rejects.toThrow(
        "El servicio de estadísticas no está disponible",
      );
      expect(await runWilcoxonTest(request)).toEqual({
        statistic: 2,
        p_value: 0.25,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("preserves a validation error from Friedman", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = Object.assign(
      async () =>
        Response.json({ detail: "Muestras inválidas" }, { status: 400 }),
      { preconnect: originalFetch.preconnect },
    );
    try {
      await expect(runFriedmanTest({ groups: {} })).rejects.toThrow(
        "Muestras inválidas",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
