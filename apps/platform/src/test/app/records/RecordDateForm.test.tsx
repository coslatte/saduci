import "../../setup";
import { afterEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, within } from "@testing-library/react";
import { RecordDateForm } from "@/app/records/components/RecordDateForm";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("edición de fecha", () => {
  it("carga los datos de la simulación en un formulario y solo permite editar la fecha", async () => {
    globalThis.fetch = Object.assign(
      mock(async () =>
        Response.json({
          id: 5,
          patient_id: "PAC-5",
          created_at: "2025-01-01T12:00:00Z",
          parameters: { age: 53, d1: 12, n_runs: 200 },
          results: {},
        }),
      ),
      { preconnect: originalFetch.preconnect },
    );
    const submit = mock(() => {});
    render(
      <RecordDateForm
        kind="simulation"
        recordId="5"
        token="token"
        createdAt="2025-01-01T12:00:00Z"
        submitting={false}
        error={null}
        onSubmit={submit}
        onCancel={() => {}}
      />,
    );
    const dialog = await within(document.body).findByRole("dialog", {
      name: "Editar simulación",
    });
    const content = within(dialog);
    const patient = await content.findByDisplayValue("PAC-5");
    expect(patient.hasAttribute("readonly")).toBe(true);
    expect(content.getByDisplayValue("53").hasAttribute("readonly")).toBe(true);
    expect(
      content.getByDisplayValue("Insuficiencia cardiaca descompensada"),
    ).toBeTruthy();
    expect(
      content.getByLabelText("Fecha del registro").hasAttribute("readonly"),
    ).toBe(false);
    fireEvent.submit(
      content.getByLabelText("Fecha del registro").closest("form")!,
    );
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("permite reintentar si falla la carga", async () => {
    let calls = 0;
    globalThis.fetch = Object.assign(
      mock(async () => {
        calls += 1;
        return calls === 1
          ? new Response(null, { status: 500 })
          : Response.json({
              id: 5,
              patient_id: "PAC-5",
              parameters: {},
              results: {},
            });
      }),
      { preconnect: originalFetch.preconnect },
    );
    render(
      <RecordDateForm
        kind="simulation"
        recordId="5"
        token="token"
        createdAt="2025-01-01T12:00:00Z"
        submitting={false}
        error={null}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    const content = within(
      await within(document.body).findByRole("dialog", {
        name: "Editar simulación",
      }),
    );
    fireEvent.click(await content.findByText("Reintentar"));
    expect(await content.findByDisplayValue("PAC-5")).toBeTruthy();
  });
});
