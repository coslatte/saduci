"use server";

import { serverApi } from "@/lib/server-api";
import { HttpError } from "@/lib/types/http-error";
import {
  type PredictionRecord,
  type SimulationRecord,
  type StatisticsRecord,
} from "@/entities/record";

export async function listPredictionsByPatient(
  patientId: string,
  params?: { skip?: number; limit?: number },
): Promise<{ items: PredictionRecord[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.set("skip", String(params.skip));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const path = `/api/records/predictions/${patientId}${searchParams.toString() ? `?${searchParams}` : ""}`;
  try {
    return await serverApi.get<{ items: PredictionRecord[]; total: number }>(
      path,
      { timeoutKey: "records" },
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "No se pudo obtener predicciones del paciente");
  }
}

export async function listSimulationsByPatient(
  patientId: string,
  params?: { skip?: number; limit?: number },
): Promise<{ items: SimulationRecord[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.set("skip", String(params.skip));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const path = `/api/records/simulations/${patientId}${searchParams.toString() ? `?${searchParams}` : ""}`;
  try {
    return await serverApi.get<{ items: SimulationRecord[]; total: number }>(
      path,
      { timeoutKey: "records" },
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "No se pudo obtener simulaciones del paciente");
  }
}

export async function listStatisticsByPatient(
  patientId: string,
  params?: { skip?: number; limit?: number },
): Promise<{ items: StatisticsRecord[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.set("skip", String(params.skip));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const path = `/api/records/statistics/${patientId}${searchParams.toString() ? `?${searchParams}` : ""}`;
  try {
    return await serverApi.get<{ items: StatisticsRecord[]; total: number }>(
      path,
      { timeoutKey: "records" },
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "No se pudo obtener estadísticas del paciente");
  }
}
