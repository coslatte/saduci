import { PREDICTION_LIMITS } from "@/lib/prediction";
import { PREUCI_DIAG } from "@/lib/simulation";

export interface DiagnosisOption {
  value: string;
  label: string;
}

export function buildIndexOptions(min: number, max: number): DiagnosisOption[] {
  return Array.from({ length: max - min + 1 }, (_, offset) => {
    const index = min + offset;
    const diagnosisLabel = PREUCI_DIAG[index];

    return {
      value: String(index),
      label: diagnosisLabel
        ? `${index} — ${diagnosisLabel}`
        : `Código ${index}`,
    };
  });
}

export const PREDICTION_DIAG_ING1_OPTIONS = buildIndexOptions(
  PREDICTION_LIMITS.diagIng1.min,
  PREDICTION_LIMITS.diagIng1.max,
);

export const PREDICTION_DIAG_ING2_OPTIONS = buildIndexOptions(
  PREDICTION_LIMITS.diagIng2.min,
  PREDICTION_LIMITS.diagIng2.max,
);

export const PREDICTION_DIAG_EGR2_OPTIONS = buildIndexOptions(
  PREDICTION_LIMITS.diagEgr2.min,
  PREDICTION_LIMITS.diagEgr2.max,
);
