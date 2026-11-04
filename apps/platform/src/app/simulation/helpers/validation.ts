import { SIMULATION_LIMITS, type SimulationRequest } from "@/lib/simulation";

export function validateSimulationInput(payload: SimulationRequest): string[] {
  const errors: string[] = [];
  const { age, apache, n_runs, percent, vam_time, uti_stay, preuti_stay } =
    payload;

  if (age < SIMULATION_LIMITS.age.min || age > SIMULATION_LIMITS.age.max) {
    errors.push(
      `Edad fuera de rango (${SIMULATION_LIMITS.age.min}-${SIMULATION_LIMITS.age.max}).`,
    );
  }
  if (
    apache < SIMULATION_LIMITS.apache.min ||
    apache > SIMULATION_LIMITS.apache.max
  ) {
    errors.push(
      `Apache II fuera de rango (${SIMULATION_LIMITS.apache.min}-${SIMULATION_LIMITS.apache.max}).`,
    );
  }
  if (
    n_runs < SIMULATION_LIMITS.simRuns.min ||
    n_runs > SIMULATION_LIMITS.simRuns.max
  ) {
    errors.push(
      `Número de corridas inválido (${SIMULATION_LIMITS.simRuns.min}-${SIMULATION_LIMITS.simRuns.max}).`,
    );
  }
  if (
    percent < SIMULATION_LIMITS.simPercent.min ||
    percent > SIMULATION_LIMITS.simPercent.max
  ) {
    errors.push(
      `% Tiempo UCI inválido (${SIMULATION_LIMITS.simPercent.min}-${SIMULATION_LIMITS.simPercent.max}).`,
    );
  }
  if (
    vam_time < SIMULATION_LIMITS.vamTime.min ||
    vam_time > SIMULATION_LIMITS.vamTime.max
  ) {
    errors.push(
      `Tiempo VA fuera de rango (${SIMULATION_LIMITS.vamTime.min}-${SIMULATION_LIMITS.vamTime.max}).`,
    );
  }
  if (
    uti_stay < SIMULATION_LIMITS.utiStay.min ||
    uti_stay > SIMULATION_LIMITS.utiStay.max
  ) {
    errors.push(
      `Tiempo UCI fuera de rango (${SIMULATION_LIMITS.utiStay.min}-${SIMULATION_LIMITS.utiStay.max}).`,
    );
  }
  if (
    preuti_stay < SIMULATION_LIMITS.preutiStay.min ||
    preuti_stay > SIMULATION_LIMITS.preutiStay.max
  ) {
    errors.push(
      `Tiempo Pre-UCI fuera de rango (${SIMULATION_LIMITS.preutiStay.min}-${SIMULATION_LIMITS.preutiStay.max}).`,
    );
  }

  return errors;
}
