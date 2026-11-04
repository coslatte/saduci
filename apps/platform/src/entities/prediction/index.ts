export const PREDICTION_LIMITS = {
  edad: { min: 14, max: 61, default: 20 },
  diagIng1: { min: 1, max: 20, default: 1 },
  diagIng2: { min: 0, max: 40, default: 0 },
  diagEgr2: { min: 18, max: 40, default: 30 },
  apache: { min: 18, max: 40, default: 30 },
  tiempoVam: { min: 18, max: 40, default: 30 },
} as const;

export type ExplanationMethod =
  | "LIME"
  | "SHAP"
  | "Gradientes Integrados"
  | "Mapas de Saliencia";

export const EXPLANATION_METHODS: ExplanationMethod[] = [
  "LIME",
  "SHAP",
  "Gradientes Integrados",
  "Mapas de Saliencia",
];

export interface PredictionRequest {
  edad: number;
  diag_ing1: number;
  diag_ing2: number;
  diag_egr2: number;
  apache: number;
  tiempo_vam: number;
}

export interface PredictionResponse {
  probability: number;
  probability_percent: number;
  predicted_class: number;
  predicted_label: string;
  threshold: number;
}

export interface ExplicacionRequest extends PredictionRequest {
  method: ExplanationMethod;
}

export interface ExplicacionResponse {
  feature_names: string[];
  importances: number[];
  probability: number;
  predicted_class: number;
  predicted_label: string;
  rows: ExplicacionRow[];
}

export interface ExplicacionRow {
  feature_key: string;
  feature_name: string;
  patient_value: number;
  patient_value_display: string;
  baseline_value: number;
  contribution: number;
  direction: "increase_risk" | "decrease_risk" | "neutral";
}
