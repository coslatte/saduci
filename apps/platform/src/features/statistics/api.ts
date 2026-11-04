"use server";

import { serverApi } from "@/lib/server-api";
import { HttpError } from "@/lib/types/http-error";
import {
  type WilcoxonRequest,
  type FriedmanRequest,
  type StatisticalTestResult,
} from "@/entities/statistics";

export async function runWilcoxon(
  input: WilcoxonRequest,
): Promise<StatisticalTestResult> {
  try {
    return await serverApi.post<StatisticalTestResult>(
      "/api/statistics/wilcoxon",
      input,
      { timeoutKey: "statistics" },
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "Error en test Wilcoxon");
  }
}

export async function runFriedman(
  input: FriedmanRequest,
): Promise<StatisticalTestResult> {
  try {
    return await serverApi.post<StatisticalTestResult>(
      "/api/statistics/friedman",
      input,
      { timeoutKey: "statistics" },
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "Error en test Friedman");
  }
}

export async function listStatisticalTests(params?: {
  skip?: number;
  limit?: number;
}): Promise<{ items: unknown[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.set("skip", String(params.skip));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const path = `/api/statistical-tests${searchParams.toString() ? `?${searchParams}` : ""}`;
  try {
    return await serverApi.get<{ items: unknown[]; total: number }>(path, {
      timeoutKey: "records",
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "No se pudo listar tests estadísticos");
  }
}
