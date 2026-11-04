"use server";

import { runWilcoxon, runFriedman } from "./api";
import { HttpError } from "@/lib/types/http-error";

export async function wilcoxon(input: {
  sample_a: number[];
  sample_b: number[];
  alternative?: "two-sided" | "less" | "greater";
}): Promise<{ statistic: number; p_value: number }> {
  try {
    return await runWilcoxon(input);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error en test Wilcoxon");
  }
}

export async function friedman(input: {
  groups: Record<string, number[]>;
}): Promise<{ statistic: number; p_value: number }> {
  try {
    return await runFriedman(input);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error en test Friedman");
  }
}
