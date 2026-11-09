import "../setup";
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import {
  runExplicacion,
  runPrediction,
  type ExplicacionResponse,
  type PredictionResponse,
} from "@/lib/prediction";

const metadata = {
  model_version: "v1",
  artifact_sha256:
    "b58bcf14ff4ad023c608861323bcabca5fa5d9250058af9f1ed1d0e1cf1923ad",
};
const request = {
  patient_id: "SYNTHETIC-001",
  edad: 50,
  diag_ing1: 5,
  diag_ing2: 3,
  diag_egr2: 25,
  apache: 22,
  tiempo_vam: 24,
};
const prediction = {
  probability: 0.9246,
  probability_percent: 92.46,
  predicted_class: 1,
  predicted_label: "muere",
  threshold: 0.5,
  ...metadata,
} satisfies PredictionResponse;
const explanation = {
  method: "Impacto local por referencia",
  explainer_version: "reference-impact-v1",
  reference_strategy: "schema-midpoint-v1",
  reference_warning: "Referencias técnicas, no normalidad clínica.",
  narrative_status: "disabled",
  probability: prediction.probability,
  threshold: prediction.threshold,
  predicted_class: prediction.predicted_class,
  predicted_label: prediction.predicted_label,
  feature_names: ["Edad"],
  importances: [0.0046],
  rows: [
    {
      feature_key: "edad",
      feature_name: "Edad",
      patient_value: 50,
      patient_value_display: "50",
      baseline_value: 38,
      baseline_value_display: "38",
      baseline_probability: 0.92,
      contribution: 0.0046,
      direction: "increase_risk",
    },
  ],
  ...metadata,
} satisfies ExplicacionResponse;

afterEach(() => mock.restore());

describe("prediction model provenance", () => {
  it("preserves model identity returned through the prediction BFF", async () => {
    const fetcher = spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(prediction),
    );
    expect(await runPrediction(request)).toEqual(prediction);
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/prediction");
  });

  it("preserves model identity returned through the explanation BFF", async () => {
    const fetcher = spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(explanation),
    );
    expect(
      await runExplicacion({
        ...request,
        method: "Impacto local por referencia",
      }),
    ).toEqual(explanation);
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/prediction/explain");
  });

  for (const invalid of [
    { method: "SHAP" },
    { reference_warning: undefined },
    { narrative_status: "unknown" },
    { rows: [{ ...explanation.rows[0], baseline_probability: 2 }] },
    { rows: [{ ...explanation.rows[0], baseline_value_display: undefined }] },
    { importances: [] },
  ]) {
    it(`rejects inconsistent explanation evidence ${JSON.stringify(invalid)}`, async () => {
      spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json({ ...explanation, ...invalid }),
      );
      await expect(
        runExplicacion({ ...request, method: "Impacto local por referencia" }),
      ).rejects.toThrow("formato esperado");
    });
  }

  for (const invalid of [
    { model_version: undefined },
    { model_version: "" },
    { artifact_sha256: undefined },
    { artifact_sha256: "invalid" },
  ]) {
    it(`rejects prediction with invalid provenance ${JSON.stringify(invalid)}`, async () => {
      spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json({ ...prediction, ...invalid }),
      );
      await expect(runPrediction(request)).rejects.toThrow("formato esperado");
    });

    it(`rejects explanation with invalid provenance ${JSON.stringify(invalid)}`, async () => {
      spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json({ ...explanation, ...invalid }),
      );
      await expect(
        runExplicacion({ ...request, method: "Impacto local por referencia" }),
      ).rejects.toThrow("formato esperado");
    });
  }
});
