import { afterEach, describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/simulation/route";
import { runSimulation, type SimulationRequest } from "@/lib/simulation";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("simulation service boundary", () => {
  it("forwards the compact request to the gateway platform endpoint", async () => {
    let url = "";
    let body: unknown;
    globalThis.fetch = Object.assign(
      async (target: unknown, init?: RequestInit) => {
        url = String(target);
        body = JSON.parse(String(init?.body));
        return Response.json({ simulation: {} });
      },
      { preconnect: originalFetch.preconnect },
    );
    const response = await POST(
      new NextRequest("http://localhost/api/simulation", {
        method: "POST",
        body: JSON.stringify({ age: 40, n_runs: 200 }),
      }),
    );
    expect(new URL(url).pathname).toBe("/simulation");
    expect(body).toEqual({ age: 40, n_runs: 200 });
    expect(response.status).toBe(200);
  });

  it("passes service errors through to the client", async () => {
    globalThis.fetch = Object.assign(
      async () =>
        Response.json(
          { error: "El servicio tardó demasiado." },
          { status: 504 },
        ),
      { preconnect: originalFetch.preconnect },
    );
    const payload: SimulationRequest = {
      age: 40,
      apache: 12,
      d1: 2,
      d2: 0,
      d3: 0,
      d4: 0,
      diag_egreso2: 2,
      artif_vent: 0,
      vam_time: 24,
      uti_stay: 24,
      preuti_stay: 10,
      resp_insuf: 2,
      percent: 3,
      n_runs: 200,
    };
    await expect(runSimulation(payload)).rejects.toThrow(
      "El servicio tardó demasiado.",
    );
  });

  it("aborts the outgoing request when the browser stops waiting", async () => {
    const controller = new AbortController();
    let outgoingSignal: AbortSignal | null | undefined;
    globalThis.fetch = Object.assign(
      async (_target: unknown, init?: RequestInit) => {
        outgoingSignal = init?.signal;
        controller.abort();
        outgoingSignal?.throwIfAborted();
        return Response.json({});
      },
      { preconnect: originalFetch.preconnect },
    );
    const response = await POST(
      new NextRequest("http://localhost/api/simulation", {
        method: "POST",
        body: "{}",
        signal: controller.signal,
      }),
    );
    expect(outgoingSignal?.aborted).toBe(true);
    expect(response.status).toBe(504);
  });
});

it("exports the selected run identifier and original parameters", async () => {
  const { downloadSimulationCSV } =
    await import("@/app/simulation/helpers/download");
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const originalClick = HTMLAnchorElement.prototype.click;
  let exported: Blob | undefined;
  let filename = "";
  URL.createObjectURL = (blob: Blob) => {
    exported = blob;
    return "blob:test";
  };
  URL.revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = function () {
    filename = this.download;
  };
  try {
    const stats = { mean: 24, std: 2, ci_lower: 20, ci_upper: 28 };
    const run = {
      patientId: "CASE-A",
      startedAt: "2026-11-03T18:00:00.000Z",
      input: {
        age: 60,
        apache: 12,
        d1: 2,
        d2: 0,
        d3: 0,
        d4: 0,
        diag_egreso2: 2,
        artif_vent: 0,
        vam_time: 24,
        uti_stay: 24,
        preuti_stay: 10,
        resp_insuf: 2,
        percent: 3,
        n_runs: 200,
      },
      result: {
        simulation: {
          pre_vam: stats,
          vam: stats,
          post_vam: stats,
          uci: stats,
          post_uci: stats,
        },
        prediction: { class: 0 as const, probability: 0.2 },
      },
    };
    downloadSimulationCSV(run.result, run.patientId, run);
    expect(filename).toBe("simulacion-paciente-CASE-A.csv");
    const csv = await exported?.text();
    expect(csv).toContain("Caso,CASE-A");
    expect(csv).toContain("Edad (años),60");
    expect(csv).toContain("Iteraciones,200");
    expect(csv).toContain("IC 95 % inferior");
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    HTMLAnchorElement.prototype.click = originalClick;
  }
});
