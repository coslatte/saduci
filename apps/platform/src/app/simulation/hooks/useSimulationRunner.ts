"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/components/molecules/Toast";
import { useAuth } from "@/lib/auth";
import { fetchNextPatientSku } from "@/lib/recordsApi";
import {
  SIMULATION_LIMITS,
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
  initialValues?: SimulationInitialValues;
  enabled?: boolean;
}

export interface SimulationInitialValues {
  patientId?: string;
  age?: number;
  apache?: number;
  preutiStay?: number;
  vamTime?: number;
  utiStay?: number;
  simPercent?: number;
  diagIng1?: number;
  diagIng2?: number;
  diagIng3?: number;
  diagIng4?: number;
  diagEgreso2?: number;
  respInsuf?: number;
  ventType?: number;
  simRuns?: number;
}

/**
 * Owns the whole simulation run workflow: clinical inputs, execution with
 * progress/cancel, result history and toasts. Shared by the simulation page
 * and the "+ Nuevo" dialog in records so both run the same process.
 */
export function useSimulationRunner(options: UseSimulationRunnerOptions = {}) {
  const { onSuccess, initialValues, enabled = true } = options;
  const { token } = useAuth();
  const [patientId, setPatientId] = useState<string>(
    initialValues?.patientId ?? "",
  );
  const [age, setAge] = useState<number>(
    initialValues?.age ?? SIMULATION_LIMITS.age.default,
  );
  const [apache, setApache] = useState<number>(
    initialValues?.apache ?? SIMULATION_LIMITS.apache.default,
  );
  const [preutiStay, setPreutiStay] = useState<number>(
    initialValues?.preutiStay ?? SIMULATION_LIMITS.preutiStay.default,
  );
  const [vamTime, setVamTime] = useState<number>(
    initialValues?.vamTime ?? SIMULATION_LIMITS.vamTime.default,
  );
  const [utiStay, setUtiStay] = useState<number>(
    initialValues?.utiStay ?? SIMULATION_LIMITS.utiStay.default,
  );
  const [simPercent, setSimPercent] = useState<number>(
    initialValues?.simPercent ?? SIMULATION_LIMITS.simPercent.default,
  );
  const [diagIng1, setDiagIng1] = useState<number>(
    initialValues?.diagIng1 ?? 2,
  );
  const [diagIng2, setDiagIng2] = useState<number>(
    initialValues?.diagIng2 ?? 0,
  );
  const [diagIng3, setDiagIng3] = useState<number>(
    initialValues?.diagIng3 ?? 0,
  );
  const [diagIng4, setDiagIng4] = useState<number>(
    initialValues?.diagIng4 ?? 0,
  );
  const [diagEgreso2, setDiagEgreso2] = useState<number>(
    initialValues?.diagEgreso2 ?? 2,
  );
  const [respInsuf, setRespInsuf] = useState<number>(
    initialValues?.respInsuf ?? 2,
  );
  const [ventType, setVentType] = useState<number>(
    initialValues?.ventType ?? 0,
  );

  const [simRuns, setSimRuns] = useState<number>(
    initialValues?.simRuns ?? SIMULATION_LIMITS.simRuns.default,
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
  const wasEnabled = useRef(enabled);
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
    if (!enabled) {
      wasEnabled.current = false;
      return;
    }
    if (!wasEnabled.current) {
      wasEnabled.current = true;
      setResultHistory([]);
      setActiveResultIndex(-1);
      if (!initialValues?.patientId) {
        setPatientId("");
      }
    }
    if (initialValues?.patientId || patientId) return;
    let cancelled = false;
    void fetchNextPatientSku(token)
      .then((sku) => {
        if (!cancelled) setPatientId(sku);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          showToast({
            title: "No se pudo asignar el paciente",
            description: error instanceof Error ? error.message : String(error),
            type: "error",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, initialValues?.patientId, patientId, token]);

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

  async function handleNewPatient(): Promise<void> {
    try {
      setPatientId(await fetchNextPatientSku(token));
    } catch (error) {
      showToast({
        title: "No se pudo asignar el paciente",
        description: error instanceof Error ? error.message : String(error),
        type: "error",
      });
      return;
    }
    setResultHistory([]);
    setActiveResultIndex(-1);
  }

  async function handleSimulate(): Promise<void> {
    if (loading) return;
    if (!patientId.trim()) {
      showToast({
        title: "SKU del paciente pendiente",
        description:
          "Espere a que se genere el SKU antes de ejecutar la simulación.",
        type: "error",
      });
      return;
    }

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
