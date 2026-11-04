"use server";

import { serverApi } from "@/lib/server-api";
import { HttpError } from "@/lib/types/http-error";
import {
  type PredictionRequest,
  type ExplicacionRequest,
  type PredictionResponse,
  type ExplicacionResponse,
} from "@/entities/prediction";

export async function runPrediction(
  input: PredictionRequest,
): Promise<PredictionResponse> {
  try {
    return await serverApi.post<PredictionResponse>("/api/prediction", input, {
      timeoutKey: "prediction",
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "Error en la predicción");
  }
}

export async function runExplanation(
  input: ExplicacionRequest,
): Promise<ExplicacionResponse> {
  try {
    return await serverApi.post<ExplicacionResponse>(
      "/api/prediction/explain",
      input,
      { timeoutKey: "predictionExplain" },
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "Error generando explicación");
  }
}

export async function listPredictions(params?: {
  skip?: number;
  limit?: number;
}): Promise<{ items: unknown[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.set("skip", String(params.skip));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const path = `/api/predictions${searchParams.toString() ? `?${searchParams}` : ""}`;
  try {
    const response = await serverApi.get<{ items: unknown[]; total: number }>(
      path,
      { timeoutKey: "records" },
    );
    return response;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "No se pudo listar predicciones");
  }
}
