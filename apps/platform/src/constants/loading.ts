/**
 * Copy for loading surfaces, centralized so every screen speaks the same
 * language and the messages can evolve as an operation drags on.
 *
 * The idea is that a loading state is never a frozen "Cargando…": after a
 * second it says what it is doing, and after several seconds it acknowledges
 * that the wait is long. `resolveLoadingMessage` owns that progression.
 */

export interface LoadingPhase {
  /** Elapsed whole seconds at or after which this message is shown. */
  atSeconds: number;
  message: string;
}

/** Default progression for data loads inside the app. */
export const GENERIC_LOADING_PHASES: readonly LoadingPhase[] = [
  { atSeconds: 0, message: "Cargando…" },
  { atSeconds: 1, message: "Cargando datos…" },
  { atSeconds: 3, message: "Aún trabajando, gracias por esperar…" },
  { atSeconds: 8, message: "El servidor está tardando más de lo esperado…" },
];

/** Progression used while the session is being verified on app entry. */
export const SESSION_LOADING_PHASES: readonly LoadingPhase[] = [
  { atSeconds: 0, message: "Verificando tu sesión…" },
  { atSeconds: 1, message: "Cargando la aplicación…" },
  {
    atSeconds: 4,
    message: "El servidor tarda en responder. Seguimos intentando…",
  },
  {
    atSeconds: 10,
    message: "La conexión está lenta. Puedes esperar o reintentar la conexión.",
  },
];

/** Progression used while a simulation batch runs. */
export const SIMULATION_LOADING_PHASES: readonly LoadingPhase[] = [
  { atSeconds: 0, message: "Ejecutando simulación, por favor espere…" },
  { atSeconds: 5, message: "Procesando las corridas de la simulación…" },
  { atSeconds: 15, message: "Casi listo, consolidando resultados…" },
  {
    atSeconds: 30,
    message:
      "La simulación es extensa; puedes seguir esperando o cancelarla si lo necesitas.",
  },
];

/** Progression used while a single prediction runs. */
export const PREDICTION_LOADING_PHASES: readonly LoadingPhase[] = [
  { atSeconds: 0, message: "Ejecutando predicción, por favor espere…" },
  { atSeconds: 3, message: "El modelo está calculando el riesgo…" },
  {
    atSeconds: 10,
    message: "El servidor está tardando más de lo esperado…",
  },
];

/** Progression used while an explainability run is computed. */
export const EXPLANATION_LOADING_PHASES: readonly LoadingPhase[] = [
  { atSeconds: 0, message: "Generando explicación…" },
  { atSeconds: 3, message: "Calculando la importancia de cada variable…" },
  {
    atSeconds: 10,
    message: "El servidor está tardando más de lo esperado…",
  },
];

/** Progression used while a statistical test runs. */
export const STATISTICS_LOADING_PHASES: readonly LoadingPhase[] = [
  { atSeconds: 0, message: "Ejecutando la prueba…" },
  {
    atSeconds: 3,
    message: "Procesando los archivos y calculando el estadístico…",
  },
  {
    atSeconds: 10,
    message: "El servidor está tardando más de lo esperado…",
  },
];

/** Static labels for surfaces that do not need a time-based progression. */
export const LOADING_LABELS = {
  generic: "Cargando…",
  data: "Cargando datos…",
  users: "Cargando usuarios…",
  totals: "Cargando totales…",
  session: "Verificando tu sesión…",
  loginPage: "Cargando la página de inicio de sesión…",
  executing: "Ejecutando…",
  generating: "Generando…",
  saving: "Guardando…",
  predicting: "Ejecutando predicción, por favor espere…",
  simulating: "Ejecutando simulación, por favor espere…",
  /** Suffix appended when the elapsed seconds are shown next to a message. */
  elapsedSuffix: "s",
} as const;

/**
 * Picks the message for the given elapsed time. Phases must be ordered by
 * `atSeconds` ascending; the last one whose threshold has passed wins.
 */
export function resolveLoadingMessage(
  elapsedSeconds: number,
  phases: readonly LoadingPhase[] = GENERIC_LOADING_PHASES,
): string {
  const safeSeconds = Math.max(0, Math.floor(elapsedSeconds));
  let message = phases[0]?.message ?? LOADING_LABELS.generic;

  for (const phase of phases) {
    if (safeSeconds < phase.atSeconds) break;
    message = phase.message;
  }

  return message;
}
