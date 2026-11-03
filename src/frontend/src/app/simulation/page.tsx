"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/molecules/Alert";
import SimulationInputs from "./components/SimulationInputs";
import { SimulationPageHeader } from "./components/SimulationPageHeader";
import { SimulationResultsSection } from "./components/SimulationResultsSection";
import {
  SIMULATION_LIMITS,
  generatePatientId,
  runSimulation,
  type SimulationRequest,
  type SimulationRun,
} from "@/lib/simulation";
import {
  validateSimulationInput,
  formatErrorForUser,
  downloadSimulationCSV,
} from "./helpers/index";

import { sileo } from "sileo";

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
  const [resultHistory, setResultHistory] = useState<SimulationRun[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState<number>(-1);
  const [simulationStartedAt, setSimulationStartedAt] = useState<number | null>(
    null,
  );
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const simulationController = useRef<AbortController | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => simulationController.current?.abort(), []);

  useEffect(() => {
    setPatientId(generatePatientId());
  }, []);

  useEffect(() => {
    if (!loading || simulationStartedAt === null) return;
    const timer = window.setInterval(
      () => setElapsedMs(Date.now() - simulationStartedAt),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [loading, simulationStartedAt]);

  function handleNewPatient(): void {
    setPatientId(generatePatientId());
    setAge(SIMULATION_LIMITS.age.default);
    setApache(SIMULATION_LIMITS.apache.default);
    setPreutiStay(SIMULATION_LIMITS.preutiStay.default);
    setVamTime(SIMULATION_LIMITS.vamTime.default);
    setUtiStay(SIMULATION_LIMITS.utiStay.default);
    setSimPercent(SIMULATION_LIMITS.simPercent.default);
    setSimRuns(SIMULATION_LIMITS.simRuns.default);
    setDiagIng1(2);
    setDiagIng2(0);
    setDiagIng3(0);
    setDiagIng4(0);
    setDiagEgreso2(2);
    setRespInsuf(2);
    setVentType(0);
    setError(null);
  }

  async function handleSimulate(): Promise<void> {
    if (simulationController.current) return;
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
    if (!patientId.trim())
      validationErrors.unshift("Ingrese un identificador para el caso.");
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
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    setLoading(true);
    const startedAt = Date.now();
    setSimulationStartedAt(startedAt);
    setElapsedMs(0);

    const controller = new AbortController();
    simulationController.current = controller;

    try {
      const data = await runSimulation(payload, { signal: controller.signal });
      const run: SimulationRun = {
        patientId,
        startedAt: new Date(startedAt).toISOString(),
        input: payload,
        result: data,
      };
      setResultHistory((previous) => [...previous, run]);
      setActiveResultIndex(resultHistory.length);
      requestAnimationFrame(() => {
        resultsRef.current?.focus();
        resultsRef.current?.scrollIntoView({ block: "start" });
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = formatErrorForUser(err);
      setError(message);
      requestAnimationFrame(() => errorRef.current?.focus());
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
    if (!loading || !simulationController.current) return;

    simulationController.current.abort();
    setError(null);
    sileo.info({
      title: "Espera cancelada",
      description: "Se conservan los datos y los resultados anteriores.",
    });
  }

  function handleDownload(): void {
    const selectedResult = resultHistory[activeResultIndex];
    if (!selectedResult) return;
    downloadSimulationCSV(
      selectedResult.result,
      selectedResult.patientId,
      selectedResult,
    );
  }
  return (
    <>
      <SimulationPageHeader />

      <div id="form" className="flex flex-col gap-5">
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
          elapsedSeconds={Math.round(elapsedMs / 1000)}
        />

        {error && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="rounded-xl focus-visible:outline-2 focus-visible:outline-red-500"
          >
            <Alert variant="danger" title={"Error en la simulación"}>
              {error
                .split("\n")
                .map((line, i) =>
                  line.trim() ? <div key={i}>{line.trim()}</div> : null,
                )}
            </Alert>
          </div>
        )}

        <div
          ref={resultsRef}
          tabIndex={-1}
          className="scroll-mt-6 rounded-2xl focus-visible:outline-2 focus-visible:outline-primary-500"
          aria-label="Resultados de simulación"
        >
          <SimulationResultsSection
            id="results"
            results={resultHistory}
            activeIndex={activeResultIndex}
            onActiveIndexChange={setActiveResultIndex}
            onDownload={handleDownload}
            loading={loading}
          />
        </div>
      </div>
    </>
  );
}
