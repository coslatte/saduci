// ─── Numeric limits & defaults ────────────────────────────────────────────────

export const SIMULATION_LIMITS = {
  age: { min: 14, max: 100, default: 22 },
  apache: { min: 0, max: 70, default: 12 },
  vamTime: { min: 24, max: 700, default: 24 },
  utiStay: { min: 0, max: 200, default: 24 },
  preutiStay: { min: 0, max: 34, default: 10 },
  simRuns: { min: 50, max: 100_000, default: 200, step: 50 },
  simPercent: { min: 0, max: 10, default: 3 },
} as const;

// ─── Category mappings ─────────────────────────────────────────────────────────

export const VENTILATION_TYPE: Record<number, string> = {
  0: "Tubo endotraqueal",
  1: "Traqueostomía",
  2: "Ambas",
};

export const PREUCI_DIAG: Record<number, string> = {
  0: "Vacío",
  1: "Intoxicación exógena",
  2: "Coma",
  3: "Trauma craneoencefálico severo",
  4: "SPO de toracotomía",
  5: "SPO de laparotomía",
  6: "SPO de amputación",
  7: "SPO de neurología",
  8: "PCR recuperado",
  9: "Encefalopatía metabólica",
  10: "Encefalopatía hipóxica",
  11: "Ahorcamiento incompleto",
  12: "Insuficiencia cardiaca descompensada",
  13: "Obstétrica grave",
  14: "EPOC descompensada",
  15: "ARDS",
  16: "BNB-EH",
  17: "BNB-IH",
  18: "BNV",
  19: "Miocarditis",
  20: "Leptospirosis",
  21: "Sepsis grave",
  22: "DMO",
  23: "Shock séptico",
  24: "Shock hipovolémico",
  25: "Shock cardiogénico",
  26: "IMA",
  27: "Politraumatizado",
  28: "Crisis miasténica",
  29: "Emergencia hipertensiva",
  30: "Status asmático",
  31: "Status epiléptico",
  32: "Pancreatitis",
  33: "Embolismo graso",
  34: "Accidente cerebrovascular",
  35: "Síndrome de apnea del sueño",
  36: "Sangramiento digestivo",
  37: "Insuficiencia renal crónica",
  38: "Insuficiencia renal aguda",
  39: "Trasplante renal",
  40: "Guillain Barré",
};

export const RESP_INSUF: Record<number, string> = {
  0: "Vacío",
  1: "Respiratorias",
  2: "TCE",
  3: "Estatus posoperatorio",
  4: "Afecciones no traumáticas del SNC",
  5: "Causas extrapulmonares",
};

// ─── API types ─────────────────────────────────────────────────────────────────

export interface SimulationRequest {
  age: number;
  apache: number;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  diag_egreso2: number;
  artif_vent: number;
  vam_time: number;
  uti_stay: number;
  preuti_stay: number;
  resp_insuf: number;
  percent: number;
  n_runs: number;
}

export interface TimeStats {
  mean: number;
  std: number;
  ci_lower: number;
  ci_upper: number;
}

export interface SimulationResponse {
  simulation: {
    pre_vam: TimeStats;
    vam: TimeStats;
    post_vam: TimeStats;
    uci: TimeStats;
    post_uci: TimeStats;
  };
  prediction: {
    class: 0 | 1;
    probability: number;
  };
}

export interface RunSimulationOptions {
  signal?: AbortSignal;
}

// ─── API client ────────────────────────────────────────────────────────────────

export async function runSimulation(
  data: SimulationRequest,
  options: RunSimulationOptions = {},
): Promise<SimulationResponse> {
  try {
    const response = await fetch("/api/simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Error al ejecutar la simulación: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<SimulationResponse>;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("La simulación fue cancelada por el usuario.");
    }
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function generatePatientId(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export const TIME_VARIABLE_LABELS: Record<
  keyof SimulationResponse["simulation"],
  string
> = {
  pre_vam: "Tiempo Pre VAM",
  vam: "Tiempo VAM",
  post_vam: "Tiempo Post VAM",
  uci: "Estadía UCI",
  post_uci: "Estadía Post UCI",
};
