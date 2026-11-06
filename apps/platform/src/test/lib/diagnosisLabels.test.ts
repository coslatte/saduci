import "../setup";
import { describe, expect, it } from "bun:test";
import {
  PREDICTION_DIAG_EGR2_OPTIONS,
  PREDICTION_DIAG_ING1_OPTIONS,
  PREDICTION_DIAG_ING2_OPTIONS,
  buildIndexOptions,
} from "@/lib/predictionDiagnoses";
import {
  diagData,
  respInsufData,
  ventTypeData,
} from "@/app/simulation/helpers/options";
import {
  diagnosisDetailLabel,
  diagnosisOptionLabel,
} from "@/lib/diagnosisLabels";
import { PREUCI_DIAG } from "@/lib/simulation";

const startsWithDigits = (label: string) => /^\d/.test(label.trim());
const containsDashPrefix = (label: string) => /^\d+\s*[—–-]/.test(label.trim());

describe("listado de diagnósticos de predicción", () => {
  /**
   * Regression: the pickers rendered "12 — Insuficiencia cardiaca
   * descompensada". A clinician picks the diagnosis, not an index, and the
   * number in front of every option only made the list harder to scan. The
   * code still travels in `value` because the model needs it.
   */
  it("muestra solo el título clínico, sin el código", () => {
    for (const options of [
      PREDICTION_DIAG_ING1_OPTIONS,
      PREDICTION_DIAG_ING2_OPTIONS,
      PREDICTION_DIAG_EGR2_OPTIONS,
    ]) {
      expect(options.length).toBeGreaterThan(0);
      for (const option of options) {
        expect(startsWithDigits(option.label)).toBe(false);
        expect(containsDashPrefix(option.label)).toBe(false);
      }
    }
  });

  it("conserva el código numérico como value", () => {
    const opcion = PREDICTION_DIAG_ING1_OPTIONS.find((o) => o.value === "12");
    expect(opcion).toBeDefined();
    expect(opcion!.label).toBe(PREUCI_DIAG[12]);
    expect(opcion!.label).not.toContain("12");
  });

  it("no incluye códigos sin título en el catálogo", () => {
    const opciones = buildIndexOptions(1, 20);
    for (const option of opciones) {
      expect(PREUCI_DIAG[Number(option.value)]).toBeTruthy();
    }
  });
});

describe("listado de diagnósticos de simulación", () => {
  it("muestra solo el título, igual que predicción", () => {
    const opciones = diagData();
    expect(opciones.length).toBeGreaterThan(0);
    for (const option of opciones) {
      expect(containsDashPrefix(option.label)).toBe(false);
    }
  });

  it("mantiene el código como value", () => {
    expect(diagData().find((o) => o.value === "12")?.label).toBe(
      PREUCI_DIAG[12],
    );
  });

  it("deja insuficiencia respiratoria y ventilación igual que antes", () => {
    // Estas dos ya se mostraban sin código: sirve de control de coherencia.
    for (const option of [...respInsufData(), ...ventTypeData()]) {
      expect(containsDashPrefix(option.label)).toBe(false);
    }
  });
});

describe("detalle del registro", () => {
  it("muestra el título sin el código interno", () => {
    expect(diagnosisDetailLabel(12)).toBe(PREUCI_DIAG[12]);
    expect(diagnosisDetailLabel(0)).toBe("Vacío");
  });

  it("degrada con elegancia ante valores inválidos", () => {
    expect(diagnosisDetailLabel(null)).toBe("—");
    expect(diagnosisDetailLabel("12")).toBe("—");
    expect(diagnosisDetailLabel(Number.NaN)).toBe("—");
    expect(diagnosisDetailLabel(9999)).toBe("9999");
  });

  it("el título del selector no lleva el código", () => {
    expect(diagnosisOptionLabel(12)).toBe(PREUCI_DIAG[12]);
    expect(diagnosisOptionLabel(9999)).toBeNull();
  });
});
