export const EXPERIMENT_VARIABLE_LABELS: string[] = [
  "Tiempo Pre VAM",
  "Tiempo VAM",
  "Tiempo Post VAM",
  "Estadía UCI",
  "Estadía Post UCI",
];

export interface StatisticalTestResult {
  statistic: number;
  p_value: number;
  interpretation?: string;
}

export interface WilcoxonRequest {
  sample_a: number[];
  sample_b: number[];
  alternative?: "two-sided" | "less" | "greater";
}

export type WilcoxonResponse = StatisticalTestResult;

export interface FriedmanRequest {
  groups: Record<string, number[]>;
}

export type FriedmanResponse = StatisticalTestResult;

export interface StatisticalTestRecord {
  id: string;
  testType: "wilcoxon" | "friedman";
  variable: string;
  statistic: number;
  pValue: number;
  interpretation?: string;
  createdBy: string;
  createdAt: string;
}
