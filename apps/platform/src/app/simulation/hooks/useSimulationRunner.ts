"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/components/molecules/Toast";
import {
  SIMULATION_LIMITS,
  generatePatientId,
  runSimulation,
  type SimulationRequest,
  type SimulationResponse,
} from "@/lib/simulation";
import { validateSimulationInput, formatErrorForUser } from "../helpers/index";

const LONG_SIMULATION_THRESHOLD = 10_000;
const CANCEL_COOLDOWN_MS = 1_000;
const BASE_ESTIMATED_SIMULATION_MS = 1_200;
const ESTIMATED_MS_PER_RUN = 2.8;

function estimateSimulationDurationMs(simRuns: number): number {
  const estimated =
    BASE_ESTIMATED_SIMULATION_MS + simRuns * ESTIMATED_MS_PER_RUN;
  return Math.max(BASE_ESTIMATED_SIMULATION_MS, Math.round(estimated));
}

interface UseSimulationRunnerOptions {
  /** Called after a run is computed and persisted by the backend. */
  onSuccess?: () => void;
}

/**
 * Owns the whole simulation run workflow: clinical inputs, execution with
 * progress/cancel, result history and toasts. Shared by the simulation page
 * and the "+ Nuevo" dialog in records so both run the same process.
 */
export function useSimulationRunner(options: UseSimulationRunnerOptions = {}) {
  const { onSuccess } = options;
  const [patientId, setPatientId] = useState<string>("");
  const [age, setAge] = useState<number>(SIMULATION_LIMITS.age.default);
  const [apache, setApache] = useState<number>(
    SIMULATION_LIMITS.apache.default,
  );
  const [preutiStay, setPreutiStay] = useState<number>(
    SIMULATION_LIMITS.preutiStay.default,
  );
  const [vamTime, setVamTime] = useState<number>(
    SIMULATION_LIMITS.vamTime.default,
  );
  const [utiStay, setUtiStay] = useState<number>(
    SIMULATION_LIMITS.utiStay.default,
  );
  const [simPercent, setSimPercent] = useState<number>(
    SIMULATION_LIMITS.simPercent.default,
  );
  const [diagIng1, setDiagIng1] = useState<number>(2);
  const [diagIng2, setDiagIng2] = useState<number>(0);
  const [diagIng3, setDiagIng3] = useState<number>(0);
  const [diagIng4, setDiagIng4] = useState<number>(0);
  const [diagEgreso2, setDiagEgreso2] = useState<number>(2);
  const [respInsuf, setRespInsuf] = useState<number>(2);
  const [ventType, setVentType] = useState<number>(0);

  const [simRuns, setSimRuns] = useState<number>(
    SIMULATION_LIMITS.simRuns.default,
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [resultHistory, setResultHistory] = useState<SimulationResponse[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState<number>(-1);
  const [simulationStartedAt, setSimulationStartedAt] = useState<number | null>(
    null,
  );
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [clockNowMs, setClockNowMs] = useState<number>(() => Date.now());
  const [cancelCooldownEndsAt, setCancelCooldownEndsAt] = useState<number>(0);
  const simulationController = useRef<AbortController | null>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const estimatedDurationMs = estimateSimulationDurationMs(simRuns);

  const estimatedProgressPercent = loading
    ? Math.min((elapsedMs / estimatedDurationMs) * 100, 95)
    : 0;
  const cancelOnCooldown = loading && clockNowMs < cancelCooldownEndsAt;
  const cancelCooldownSeconds = cancelOnCooldown
    ? Math.ceil((cancelCooldownEndsAt - clockNowMs) / 1000)
    : 0;

  useEffect(() => {
    setPatientId(generatePatientId());
  }, []);

  useEffect(() => {
    const shouldTick = loading || Date.now() < cancelCooldownEndsAt;
    if (!shouldTick) return;

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      setClockNowMs(now);
      if (loading && simulationStartedAt !== null) {
        setElapsedMs(now - simulationStartedAt);
      }
    }, 200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loading, simulationStartedAt, cancelCooldownEndsAt]);

  function handleNewPatient(): void {
    setPatientId(generatePatientId());
    setResultHistory([]);
    setActiveResultIndex(-1);
  }

  async function handleSimulate(): Promise<void> {
    if (loading) return;

    const payload: SimulationRequest = {
      patient_id: patientId,
      age,
      apache,
      d1: diagIng1,
      d2: diagIng2,
      d3: diagIng3,
      d4: diagIng4,
      diag_egreso2: diagEgreso2,
      artif_vent: ventType,
      vam_time: vamTime,
      uti_stay: utiStay,
      preuti_stay: preutiStay,
      resp_insuf: respInsuf,
      percent: simPercent,
      n_runs: simRuns,
    };

    const validationErrors = validateSimulationInput(payload);
    if ([diagIng1, diagIng2, diagIng3, diagIng4].every((d) => d === 0)) {
      validationErrors.unshift(
        "Todos los diagnósticos de ingreso están vacíos. Incluya al menos uno para la simulación.",
      );
    }
    if (respInsuf === 0) {
      validationErrors.unshift(
        "Seleccione un tipo de Insuficiencia Respiratoria.",
      );
    }

    if (validationErrors.length > 0) {
      showToast({
        title: "Error en la simulación",
        description: validationErrors.join(" \n"),
        type: "error",
      });
      return;
    }

    setLoading(true);
    const startedAt = Date.now();
    setSimulationStartedAt(startedAt);
    setClockNowMs(startedAt);
    setElapsedMs(0);

    const controller = new AbortController();
    simulationController.current = controller;

    try {
      const data = await runSimulation(payload, { signal: controller.signal });
      setResultHistory((previous) => {
        const next = [...previous, data];
        setActiveResultIndex(next.length - 1);
        return next;
      });
      showToast({
        title: "Simulación completada",
        description: `La simulación de ${patientId} se guardó correctamente.`,
        type: "success",
      });
      onSuccessRef.current?.();
    } catch (err) {
      const message = formatErrorForUser(err);
      console.error("Simulación fallida:", err);
      showToast({
        title: "Error en la simulación",
        description: message,
        type: "error",
      });
    } finally {
      simulationController.current = null;
      setSimulationStartedAt(null);
      setElapsedMs(0);
      setLoading(false);
    }
  }

  function handleCancelSimulation(): void {
    if (!loading || !simulationController.current || cancelOnCooldown) return;

    simulationController.current.abort();
    showToast({
      title: "Simulación cancelada",
      description: "La simulación fue cancelada por el usuario.",
      type: "info",
    });
    setCancelCooldownEndsAt(Date.now() + CANCEL_COOLDOWN_MS);
  }

  return {
    patientId,
    setPatientId,
    handleNewPatient,
    age,
    setAge,
    apache,
    setApache,
    preutiStay,
    setPreutiStay,
    vamTime,
    setVamTime,
    utiStay,
    setUtiStay,
    simPercent,
    setSimPercent,
    diagIng1,
    setDiagIng1,
    diagIng2,
    setDiagIng2,
    diagIng3,
    setDiagIng3,
    diagIng4,
    setDiagIng4,
    diagEgreso2,
    setDiagEgreso2,
    respInsuf,
    setRespInsuf,
    ventType,
    setVentType,
    simRuns,
    setSimRuns,
    loading,
    resultHistory,
    activeResultIndex,
    setActiveResultIndex,
    handleSimulate,
    handleCancelSimulation,
    showLongRunWarning: simRuns > LONG_SIMULATION_THRESHOLD,
    estimatedSeconds: Math.round(estimatedDurationMs / 1000),
    elapsedSeconds: Math.round(elapsedMs / 1000),
    estimatedProgressPercent,
    cancelOnCooldown,
    cancelCooldownSeconds,
  };
}

export type SimulationRunner = ReturnType<typeof useSimulationRunner>;
