import { PREDICTION_LIMITS } from "@/lib/prediction";
import { diagnosisOptionLabel } from "@/lib/diagnosisLabels";

export interface DiagnosisOption {
  value: string;
  label: string;
}

export function buildIndexOptions(min: number, max: number): DiagnosisOption[] {
  return Array.from({ length: max - min + 1 }, (_, offset) => {
    const index = min + offset;
    const diagnosisLabel = diagnosisOptionLabel(index);

    if (!diagnosisLabel) return null;

    return {
      // The code travels as the value because the model needs it; the label is
      // the clinical title only, so the list is not a column of numbers.
      value: String(index),
      label: diagnosisLabel,
    };
  }).filter((opt): opt is DiagnosisOption => opt !== null);
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
