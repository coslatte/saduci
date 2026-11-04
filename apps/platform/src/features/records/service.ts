"use server";

import {
  listPredictionsByPatient,
  listSimulationsByPatient,
  listStatisticsByPatient,
} from "./api";
import { HttpError } from "@/lib/types/http-error";

export async function getPatientRecords(patientId: string): Promise<{
  predictions: { items: unknown[]; total: number };
  simulations: { items: unknown[]; total: number };
  statistics: { items: unknown[]; total: number };
}> {
  try {
    const [predictions, simulations, statistics] = await Promise.all([
      listPredictionsByPatient(patientId),
      listSimulationsByPatient(patientId),
      listStatisticsByPatient(patientId),
    ]);
    return { predictions, simulations, statistics };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error obteniendo registros");
  }
}
