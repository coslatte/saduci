"use server";

import { serverApi } from "@/lib/server-api";
import { HttpError } from "@/lib/types/http-error";
import {
  type SimulationRequest,
  type SimulationResponse,
} from "@/entities/simulation";

export async function runSimulation(
  input: SimulationRequest,
): Promise<SimulationResponse> {
  try {
    return await serverApi.post<SimulationResponse>("/api/simulation", input, {
      timeoutKey: "simulation",
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "Error en la simulación");
  }
}

export async function listSimulations(params?: {
  skip?: number;
  limit?: number;
}): Promise<{ items: unknown[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.set("skip", String(params.skip));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const path = `/api/simulations${searchParams.toString() ? `?${searchParams}` : ""}`;
  try {
    return await serverApi.get<{ items: unknown[]; total: number }>(path, {
      timeoutKey: "records",
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "No se pudo listar simulaciones");
  }
}
