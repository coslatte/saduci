"use client";

import { SimulationDiagnosesSection } from "./SimulationDiagnosesSection";
import { SimulationMetricGroups } from "./SimulationMetricGroups";
import { SimulationPatientSection } from "./SimulationPatientSection";
import { SimulationRunConfiguration } from "./SimulationRunConfiguration";

interface Props {
  patientId: string;
  setPatientId: (v: string) => void;
  handleNewPatient: () => void;

  age: number;
  setAge: (n: number) => void;
  apache: number;
  setApache: (n: number) => void;
  preutiStay: number;
  setPreutiStay: (n: number) => void;
  vamTime: number;
  setVamTime: (n: number) => void;
  utiStay: number;
  setUtiStay: (n: number) => void;
  simPercent: number;
  setSimPercent: (n: number) => void;

  diagIng1: number;
  setDiagIng1: (n: number) => void;
  diagIng2: number;
  setDiagIng2: (n: number) => void;
  diagIng3: number;
  setDiagIng3: (n: number) => void;
  diagIng4: number;
  setDiagIng4: (n: number) => void;
  diagEgreso2: number;
  setDiagEgreso2: (n: number) => void;

  respInsuf: number;
  setRespInsuf: (n: number) => void;
  ventType: number;
  setVentType: (n: number) => void;

  simRuns: number;
  setSimRuns: (n: number) => void;

  loading?: boolean;
  onSimulate: () => void;
  onCancel: () => void;
  showLongRunWarning: boolean;
  estimatedSeconds: number;
  elapsedSeconds: number;
  estimatedProgressPercent: number;
  cancelOnCooldown: boolean;
  cancelCooldownSeconds: number;
}

/**
 * Composes patient, metric, diagnosis, and run-configuration simulation inputs.
 * Used in X case: main form body on the simulation page.
 */
export default function SimulationInputs({
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
  loading = false,
  onSimulate,
  onCancel,
  showLongRunWarning,
  estimatedSeconds,
  elapsedSeconds,
  estimatedProgressPercent,
  cancelOnCooldown,
  cancelCooldownSeconds,
}: Props) {
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
        onSimulate={onSimulate}
        onCancel={onCancel}
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
