"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  fetchDiagnosisCatalog,
  fetchRespiratoryInsufficiencyCatalog,
} from "@/lib/recordsApi";
import type { DiagnosisOption } from "@/lib/predictionDiagnoses";
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
  const { token } = useAuth();
  const [diagnosisOptions, setDiagnosisOptions] = useState<DiagnosisOption[]>(
    [],
  );
  const [respiratoryOptions, setRespiratoryOptions] = useState<
    DiagnosisOption[]
  >([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogRetry, setCatalogRetry] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void Promise.all([
      fetchDiagnosisCatalog(token).then(
        (diagnoses) => ({ diagnoses, error: null as string | null }),
        (error: unknown) => ({
          diagnoses: [],
          error:
            error instanceof Error
              ? `Diagnósticos: ${error.message}`
              : "No se pudo cargar el catálogo de diagnósticos.",
        }),
      ),
      fetchRespiratoryInsufficiencyCatalog(token).then(
        (respiratoryTypes) => ({
          respiratoryTypes,
          error: null as string | null,
        }),
        (error: unknown) => ({
          respiratoryTypes: [],
          error:
            error instanceof Error
              ? `Insuficiencia respiratoria: ${error.message}`
              : "No se pudo cargar el catálogo de insuficiencia respiratoria.",
        }),
      ),
    ])
      .then(([diagnosisResult, respiratoryResult]) => {
        if (cancelled) return;
        setDiagnosisOptions(
          diagnosisResult.diagnoses.map(({ id, name }) => ({
            value: String(id),
            label: name,
          })),
        );
        setRespiratoryOptions(
          respiratoryResult.respiratoryTypes.map(({ id, name }) => ({
            value: String(id),
            label: name,
          })),
        );
        setCatalogError(
          [diagnosisResult.error, respiratoryResult.error]
            .filter(Boolean)
            .join(" "),
        );
      })
      .finally(() => {
        if (!cancelled) setCatalogsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, catalogRetry]);

  function retryCatalogs() {
    setCatalogError(null);
    setCatalogsLoading(true);
    setCatalogRetry((attempt) => attempt + 1);
  }

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
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <SimulationPatientSection
        patientId={patientId}
        setPatientId={setPatientId}
        handleNewPatient={handleNewPatient}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
        diagnosisOptions={diagnosisOptions}
        respiratoryOptions={respiratoryOptions}
        catalogsLoading={catalogsLoading}
        catalogError={catalogError}
        onRetryCatalogs={retryCatalogs}
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
