import { describe, expect, it, afterEach } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import SimulacionPage from "@/app/simulation/page";
import { validateSimulationInput } from "@/app/simulation/helpers/validation";
import { SIMULATION_LIMITS, type SimulationRequest } from "@/lib/simulation";

const stats = { mean: 24, std: 2, ci_lower: 20, ci_upper: 28 };
const result = {
  simulation: {
    pre_vam: stats,
    vam: stats,
    post_vam: stats,
    uci: stats,
    post_uci: stats,
  },
  prediction: { class: 0, probability: 0.2 },
};
const originalFetch = globalThis.fetch;
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

function input(view: ReturnType<typeof render>, id: string) {
  const element = view.container.querySelector<HTMLInputElement>(`#${id}`);
  if (!element) throw new Error(`Missing input ${id}`);
  return element;
}

function submit(view: ReturnType<typeof render>) {
  const form = view.container.querySelector("form");
  if (!form) throw new Error("Missing form");
  fireEvent.submit(form);
}

describe("simulation workflow", () => {
  it("keeps run context when editing the identifier and resets a new case without losing history", async () => {
    const requests: unknown[] = [];
    globalThis.fetch = Object.assign(
      async (_url: unknown, options?: RequestInit) => {
        requests.push(JSON.parse(String(options?.body)));
        return Response.json(result);
      },
      { preconnect: originalFetch.preconnect },
    );
    const view = render(<SimulacionPage />);
    fireEvent.change(input(view, "patient-id"), {
      target: { value: "CASE-A" },
    });
    fireEvent.change(input(view, "age"), { target: { value: "60" } });
    submit(view);
    await waitFor(() =>
      expect(view.container.textContent).toContain("Ejecución 1 de 1"),
    );
    fireEvent.change(input(view, "patient-id"), {
      target: { value: "CASE-B" },
    });
    expect(view.container.textContent).toContain("Caso CASE-A");
    expect(view.container.textContent).toContain("Ejecución 1 de 1");
    fireEvent.click(
      view.getByRole("button", {
        name: "Iniciar un nuevo caso con valores predeterminados",
      }),
    );
    expect(input(view, "age").value).toBe(
      String(SIMULATION_LIMITS.age.default),
    );
    expect(view.container.textContent).toContain("Caso CASE-A");
    expect(requests).toHaveLength(1);
    submit(view);
    await waitFor(() =>
      expect(view.container.textContent).toContain("Ejecución 2 de 2"),
    );
    fireEvent.click(view.getByRole("button", { name: "Anterior" }));
    expect(view.container.textContent).toContain("Caso CASE-A");
  });

  it("locks the scenario and cancels the wait while retaining the form", async () => {
    let signal: AbortSignal | null | undefined;
    globalThis.fetch = Object.assign(
      async (_url: unknown, options?: RequestInit) => {
        signal = options?.signal;
        return await new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
      },
      { preconnect: originalFetch.preconnect },
    );
    const view = render(<SimulacionPage />);
    fireEvent.change(input(view, "age"), { target: { value: "60" } });
    submit(view);
    expect(view.container.querySelector("fieldset")?.disabled).toBe(true);
    fireEvent.click(view.getByRole("button", { name: "Cancelar espera" }));
    await waitFor(() =>
      expect(view.container.querySelector("fieldset")?.disabled).toBe(false),
    );
    expect(signal?.aborted).toBe(true);
    expect(input(view, "age").value).toBe("60");
    expect(view.queryByText("Error en la simulación")).toBeNull();
  });

  it("preserves an empty numeric field and rejects nonfinite, fractional and out-of-contract values", () => {
    const view = render(<SimulacionPage />);
    fireEvent.change(input(view, "age"), { target: { value: "" } });
    expect(input(view, "age").value).toBe("");
    submit(view);
    expect(view.container.textContent).toContain(
      "Complete todos los campos numéricos",
    );
    const payload: SimulationRequest = {
      age: 50,
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
    expect(validateSimulationInput(payload)).toEqual([]);
    for (const change of [
      { age: NaN },
      { age: Infinity },
      { age: 20.5 },
      { apache: 37 },
      { n_runs: 201 },
    ]) {
      expect(
        validateSimulationInput({ ...payload, ...change }).length,
      ).toBeGreaterThan(0);
    }
  });
});
