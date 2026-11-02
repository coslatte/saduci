"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/molecules/Alert";
import SimulationInputs from "./components/SimulationInputs";
import { SimulationPageHeader } from "./components/SimulationPageHeader";
import { SimulationResultsSection } from "./components/SimulationResultsSection";
import {
  SIMULATION_LIMITS,
  generatePatientId,
  runSimulation,
  type SimulationRequest,
  type SimulationResponse,
} from "@/lib/simulation";
import {
  validateSimulationInput,
  formatErrorForUser,
  downloadSimulationCSV,
} from "./helpers/index";

import { sileo } from "sileo";

const LONG_SIMULATION_THRESHOLD = 10_000;
const CANCEL_COOLDOWN_MS = 1_000;
const BASE_ESTIMATED_SIMULATION_MS = 1_200;
const ESTIMATED_MS_PER_RUN = 2.8;

function estimateSimulationDurationMs(simRuns: number): number {
  const estimated =
    BASE_ESTIMATED_SIMULATION_MS + simRuns * ESTIMATED_MS_PER_RUN;
  return Math.max(BASE_ESTIMATED_SIMULATION_MS, Math.round(estimated));
}

export default function SimulacionPage() {
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
  const [error, setError] = useState<string | null>(null);
  const [resultHistory, setResultHistory] = useState<SimulationResponse[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState<number>(-1);
  const [simulationStartedAt, setSimulationStartedAt] = useState<number | null>(
    null,
  );
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [clockNowMs, setClockNowMs] = useState<number>(Date.now());
  const [cancelCooldownEndsAt, setCancelCooldownEndsAt] = useState<number>(0);
  const simulationController = useRef<AbortController | null>(null);

  const estimatedDurationMs = useMemo(
    () => estimateSimulationDurationMs(simRuns),
    [simRuns],
  );

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
    setError(null);
  }

  async function handleSimulate(): Promise<void> {
    if (loading) return;
    setError(null);

    const payload: SimulationRequest = {
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
      setError(validationErrors.join(" \n"));
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
    } catch (err) {
      const message = formatErrorForUser(err);
      setError(message);
      console.error("Simulación fallida:", err);
      try {
        sileo.error({ title: "Error en la simulación", description: message });
      } catch {}
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
    setError("La simulación fue cancelada por el usuario.");
    setCancelCooldownEndsAt(Date.now() + CANCEL_COOLDOWN_MS);
  }

  function handleDownload(): void {
    const selectedResult = resultHistory[activeResultIndex];
    if (!selectedResult) return;
    downloadSimulationCSV(selectedResult, patientId);
  }
  return (
    <>
      <SimulationPageHeader />

      <div className="flex flex-col gap-5">
        <SimulationInputs
          patientId={patientId}
          setPatientId={setPatientId}
          handleNewPatient={handleNewPatient}
          age={age}
          setAge={setAge}
          apache={apache}
          setApache={setApache}
          preutiStay={preutiStay}
          setPreutiStay={setPreutiStay}
          vamTime={vamTime}
          setVamTime={setVamTime}
          utiStay={utiStay}
          setUtiStay={setUtiStay}
          simPercent={simPercent}
          setSimPercent={setSimPercent}
          diagIng1={diagIng1}
          setDiagIng1={setDiagIng1}
          diagIng2={diagIng2}
          setDiagIng2={setDiagIng2}
          diagIng3={diagIng3}
          setDiagIng3={setDiagIng3}
          diagIng4={diagIng4}
          setDiagIng4={setDiagIng4}
          diagEgreso2={diagEgreso2}
          setDiagEgreso2={setDiagEgreso2}
          respInsuf={respInsuf}
          setRespInsuf={setRespInsuf}
          ventType={ventType}
          setVentType={setVentType}
          simRuns={simRuns}
          setSimRuns={setSimRuns}
          loading={loading}
          onSimulate={handleSimulate}
          onCancel={handleCancelSimulation}
          showLongRunWarning={simRuns > LONG_SIMULATION_THRESHOLD}
          estimatedSeconds={Math.round(estimatedDurationMs / 1000)}
          elapsedSeconds={Math.round(elapsedMs / 1000)}
          estimatedProgressPercent={estimatedProgressPercent}
          cancelOnCooldown={cancelOnCooldown}
          cancelCooldownSeconds={cancelCooldownSeconds}
        />

        {error && (
          <Alert variant="danger" title={"Error en la simulación"}>
            {error
              .split("\n")
              .map((line, i) =>
                line.trim() ? <div key={i}>{line.trim()}</div> : null,
              )}
          </Alert>
        )}

        {(loading || resultHistory.length > 0) && (
          <SimulationResultsSection
            results={resultHistory}
            activeIndex={activeResultIndex}
            onActiveIndexChange={setActiveResultIndex}
            onDownload={handleDownload}
            loading={loading}
          />
        )}
      </div>
    </>
  );
}
