"use client";

import { SimulationDiagnosesSection } from "./SimulationDiagnosesSection";
import { SimulationMetricGroups } from "./SimulationMetricGroups";
import { SimulationPatientSection } from "./SimulationPatientSection";
import { SimulationRunConfiguration } from "./SimulationRunConfiguration";
import type { useSimulationRunner } from "../hooks/useSimulationRunner";

type Props = { runner: ReturnType<typeof useSimulationRunner> };

/**
 * Composes patient, metric, diagnosis, and run-configuration simulation inputs.
 * Receives the simulation controller and composes its input sections.
 */
export default function SimulationInputs({ runner }: Props) {
  const {
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
    handleSimulate,
    handleCancelSimulation,
    showLongRunWarning,
    estimatedSeconds,
    elapsedSeconds,
    estimatedProgressPercent,
    cancelOnCooldown,
    cancelCooldownSeconds,
  } = runner;

  return (
    <section className="flex flex-col gap-5">
      <SimulationPatientSection
        patientId={patientId}
        setPatientId={setPatientId}
        handleNewPatient={handleNewPatient}
      />

      <section className="p-5 bg-white border rounded-2xl border-slate-200">
        <SimulationMetricGroups
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
        />
      </section>

      <SimulationDiagnosesSection
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
      />

      <SimulationRunConfiguration
        simRuns={simRuns}
        setSimRuns={setSimRuns}
        loading={loading}
        onSimulate={() => void handleSimulate()}
        onCancel={handleCancelSimulation}
        showLongRunWarning={showLongRunWarning}
        estimatedSeconds={estimatedSeconds}
        elapsedSeconds={elapsedSeconds}
        estimatedProgressPercent={estimatedProgressPercent}
        cancelOnCooldown={cancelOnCooldown}
        cancelCooldownSeconds={cancelCooldownSeconds}
      />
    </section>
  );
}
