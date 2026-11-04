"use server";

import { runPrediction, runExplanation } from "./api";
import { HttpError } from "@/lib/types/http-error";
import { ExplanationMethod } from "@/entities/prediction";

export async function predict(input: {
  edad: number;
  diag_ing1: number;
  diag_ing2: number;
  diag_egr2: number;
  apache: number;
  tiempo_vam: number;
}): Promise<{ probability: number; predicted_label: string }> {
  try {
    return await runPrediction(input);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error en la predicción");
  }
}

export async function explain(input: {
  edad: number;
  diag_ing1: number;
  diag_ing2: number;
  diag_egr2: number;
  apache: number;
  tiempo_vam: number;
  method: ExplanationMethod;
}): Promise<unknown> {
  try {
    return await runExplanation(input);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error generando explicación");
  }
}
