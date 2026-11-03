import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { PredictionPageContent } from "@/app/prediction/components/PredictionPageContent";

const originalFetch = globalThis.fetch;
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

describe("explicación de la predicción", () => {
  it("solicita y presenta las contribuciones del mismo caso junto al umbral del servicio", async () => {
    const requests: { url: string; body: Record<string, unknown> }[] = [];
    globalThis.fetch = Object.assign(
      async (url: unknown, options?: RequestInit) => {
        requests.push({
          url: String(url),
          body: JSON.parse(String(options?.body)),
        });
        if (String(url).endsWith("/explain")) {
          return Response.json({
            feature_names: ["Age"],
            importances: [-0.125],
            probability: 0.6,
            predicted_class: 0,
            predicted_label: "vive",
            rows: [
              {
                feature_key: "edad",
                feature_name: "Age",
                patient_value: 20,
                patient_value_display: "20",
                baseline_value: 37.5,
                contribution: -0.125,
                direction: "decrease_risk",
              },
            ],
          });
        }
        return Response.json({
          probability: 0.6,
          probability_percent: 60,
          predicted_class: 0,
          predicted_label: "vive",
          threshold: 0.7,
        });
      },
      { preconnect: originalFetch.preconnect },
    );
    const view = render(<PredictionPageContent />);
    fireEvent.click(view.getByRole("button", { name: /predecir/i }));
    await waitFor(() =>
      expect(view.container.textContent).toContain(
        "Disminuye: -12.50 puntos porcentuales",
      ),
    );
    expect(view.container.textContent).toContain(
      "Por debajo del umbral del modelo",
    );
    expect(view.container.textContent).toContain(
      "Umbral de clasificación: 70.0%",
    );
    expect(view.container.textContent).toContain(
      "Valor del caso: 20 · Referencia: 37.5",
    );
    expect(requests).toHaveLength(2);
    expect(requests[1].body).toEqual({ ...requests[0].body, method: "LIME" });
  });
});
