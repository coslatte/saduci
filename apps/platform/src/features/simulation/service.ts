"use server";

import { runSimulation } from "./api";
import { HttpError } from "@/lib/types/http-error";
import { SimulationRequest, SimulationResponse } from "@/entities/simulation";

export async function simulate(
  input: SimulationRequest,
): Promise<SimulationResponse> {
  try {
    return await runSimulation(input);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error en la simulación");
  }
}
