export type SimulationRecordStatus = "completada" | "cancelada" | "en_proceso";
export type PredictionRecordStatus = "activa" | "archivada";
export type StatisticalTestType = "wilcoxon" | "friedman";

export interface SimulationRecord {
  id: string;
  patientId: string;
  runs: number;
  result: string;
  createdBy: string;
  createdAt: string;
  status: SimulationRecordStatus;
}

export interface PredictionRecord {
  id: string;
  patientId: string;
  outcome: string;
  probability: number;
  createdBy: string;
  createdAt: string;
  status: PredictionRecordStatus;
}

export interface StatisticsRecord {
  id: string;
  testType: StatisticalTestType;
  variable: string;
  statistic: number;
  pValue: number;
  interpretation: string;
  createdBy: string;
  createdAt: string;
}

export function formatRecordDate(isoDate: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoDate));
}
