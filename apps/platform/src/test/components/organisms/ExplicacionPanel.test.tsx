import "../../setup";
import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { ExplicacionPanel } from "@/app/prediction/components/ExplicacionPanel";
import { PredictionModelInfo } from "@/app/prediction/components/PredictionModelInfo";
import type { ExplicacionResponse } from "@/lib/prediction";

const result = {
  method: "Impacto local por referencia",
  explainer_version: "reference-impact-v1",
  reference_strategy: "schema-midpoint-v1",
  reference_warning:
    "Las referencias técnicas no son valores normales clínicos.",
  model_version: "v1",
  artifact_sha256: "a".repeat(64),
  probability: 0.67,
  threshold: 0.5,
  predicted_class: 1,
  predicted_label: "muere",
  feature_names: ["APACHE II"],
  importances: [0.12],
  rows: [
    {
      feature_key: "apache",
      feature_name: "APACHE II",
      patient_value: 22,
      patient_value_display: "22",
      baseline_value: 30,
      baseline_value_display: "30",
      baseline_probability: 0.55,
      contribution: 0.12,
      direction: "increase_risk",
    },
  ],
  narrative: "Resumen de los mismos contrastes numéricos.",
  narrative_provider: "stub",
  narrative_model: "template-reference-v2",
  narrative_status: "fallback",
} satisfies ExplicacionResponse;

describe("ExplicacionPanel evidence", () => {
  it("offers the effective method and identifies fallback and reference limitations", () => {
    const { getByRole, getByText, queryByRole } = render(
      <ExplicacionPanel
        hasPrediction
        loading={false}
        onExplain={() => {}}
        method="Impacto local por referencia"
        onMethodChange={() => {}}
        result={result}
      />,
    );
    expect(
      getByRole("option", { name: "Impacto local por referencia" }),
    ).toBeTruthy();
    expect(queryByRole("option", { name: "SHAP" })).toBeNull();
    expect(queryByRole("option", { name: "LIME" })).toBeNull();
    expect(getByText(result.reference_warning)).toBeTruthy();
    expect(getByText(result.narrative)).toBeTruthy();
    expect(
      getByText(/No se pudo generar el texto con IA/).getAttribute("role"),
    ).toBe("status");
  });

  it("describes the predictor and the narrative without advertising unimplemented methods", () => {
    const { getByText, queryByText } = render(<PredictionModelInfo />);
    expect(getByText("Impacto local por referencia")).toBeTruthy();
    expect(queryByText("SHAP")).toBeNull();
    expect(queryByText("Gradientes Integrados")).toBeNull();
  });
});
