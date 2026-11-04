"use server";

import { serverApi } from "@/lib/server-api";

export async function fetchSimulationCount(): Promise<number> {
  try {
    const response = await serverApi.get<{ count: number }>(
      "/api/simulations/count",
      { timeoutKey: "dashboard" },
    );
    return response.count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchPredictionCount(): Promise<number> {
  try {
    const response = await serverApi.get<{ count: number }>(
      "/api/predictions/count",
      { timeoutKey: "dashboard" },
    );
    return response.count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchStatisticsCount(): Promise<number> {
  try {
    const response = await serverApi.get<{ count: number }>(
      "/api/statistical-tests/count",
      { timeoutKey: "dashboard" },
    );
    return response.count ?? 0;
  } catch {
    return 0;
  }
}
