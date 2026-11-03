"use client";

import { useState } from "react";
import { Alert } from "@/components/molecules/Alert";
import { Text } from "@/components/atoms/Text";
import { Stack } from "@/components/layout/Stack";
import { PredictionForm } from "./PredictionForm";
import { PredictionResultCard } from "./PredictionResultCard";
import { ExplicacionPanel } from "./ExplicacionPanel";
import {
  PREDICTION_LIMITS,
  runExplicacion,
  runPrediction,
  type ExplicacionResponse,
  type PredictionResponse,
  type PredictionRequest,
} from "@/lib/prediction";

/**
 * Renders the complete prediction workflow, including patient inputs,
 * model information, prediction results, and explainability controls.
 *
 * Props:
 * - None.
 *
 * Example:
 * - <PredictionPageContent />
 */
export function PredictionPageContent() {
  const [edad, setEdad] = useState<number>(PREDICTION_LIMITS.edad.default);
  const [diagIng1, setDiagIng1] = useState<number>(
    PREDICTION_LIMITS.diagIng1.default,
  );
  const [diagIng2, setDiagIng2] = useState<number>(
    PREDICTION_LIMITS.diagIng2.default,
  );
  const [diagEgr2, setDiagEgr2] = useState<number>(
    PREDICTION_LIMITS.diagEgr2.default,
  );
  const [apache, setApache] = useState<number>(
    PREDICTION_LIMITS.apache.default,
  );
  const [tiempoVam, setTiempoVam] = useState<number>(
    PREDICTION_LIMITS.tiempoVam.default,
  );

  const [loadingPredict, setLoadingPredict] = useState<boolean>(false);
  const [loadingExplain, setLoadingExplain] = useState<boolean>(false);
  const [predictError, setPredictError] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [predictionRecord, setPredictionRecord] = useState<{
    result: PredictionResponse;
    inputs: PredictionRequest;
  } | null>(null);
  const [explicacion, setExplicacion] = useState<{
    result: ExplicacionResponse;
    inputs: PredictionRequest;
  } | null>(null);
  const inputs: PredictionRequest = {
    edad,
    diag_ing1: diagIng1,
    diag_ing2: diagIng2,
    diag_egr2: diagEgr2,
    apache,
    tiempo_vam: tiempoVam,
  };
  const prediction =
    predictionRecord &&
    Object.keys(inputs).every(
      (key) =>
        inputs[key as keyof PredictionRequest] ===
        predictionRecord.inputs[key as keyof PredictionRequest],
    )
      ? predictionRecord.result
      : null;

  async function handlePredict(): Promise<void> {
    if (loadingPredict || loadingExplain) return;
    setPredictError(null);
    setExplicacion(null);
    setExplainError(null);
    setLoadingPredict(true);

    try {
      const result = await runPrediction(inputs);
      setPredictionRecord({ result, inputs });
      setLoadingExplain(true);
      try {
        const explanation = await runExplicacion({ ...inputs, method: "LIME" });
        setExplicacion({ result: explanation, inputs });
      } catch (err) {
        setExplainError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoadingExplain(false);
      }
    } catch (err) {
      setPredictError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingPredict(false);
    }
  }

  async function handleExplain(): Promise<void> {
    if (!prediction || loadingPredict || loadingExplain) return;

    setExplainError(null);
    setExplicacion(null);
    setLoadingExplain(true);

    try {
      const result = await runExplicacion({ ...inputs, method: "LIME" });

      setExplicacion({ result, inputs });
    } catch (err) {
      setExplainError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingExplain(false);
    }
  }

  return (
    <Stack space="lg" className="pb-1">
      <div>
        <Text as="h1" size="xl" weight="bold" className="text-zinc-900">
          Predicción de No Supervivencia
        </Text>
        <Text size="sm" className="mt-1 text-zinc-500">
          Herramienta de apoyo en la predicción de no supervivencia de pacientes
          en UCI.
        </Text>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] xl:items-start">
        <section
          id="form"
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <PredictionForm
            edad={edad}
            setEdad={setEdad}
            diagIng1={diagIng1}
            setDiagIng1={setDiagIng1}
            diagIng2={diagIng2}
            setDiagIng2={setDiagIng2}
            diagEgr2={diagEgr2}
            setDiagEgr2={setDiagEgr2}
            apache={apache}
            setApache={setApache}
            tiempoVam={tiempoVam}
            setTiempoVam={setTiempoVam}
            loading={loadingPredict || loadingExplain}
            onPredict={handlePredict}
          />
        </section>

        <section
          id="results"
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 xl:sticky xl:top-6"
          aria-busy={loadingPredict}
          aria-live="polite"
        >
          {loadingPredict && (
            <p role="status" className="mb-4 text-sm text-slate-600">
              Calculando la predicción…
            </p>
          )}
          {predictionRecord && !prediction && (
            <p className="mb-4 text-sm text-amber-800">
              Los datos han cambiado. Calcule una nueva predicción para
              actualizar el resultado.
            </p>
          )}
          {predictError && (
            <Alert variant="danger" title="Error en la predicción">
              {predictError}
            </Alert>
          )}

          {prediction ? (
            <PredictionResultCard
              probability={prediction.probability}
              threshold={prediction.threshold}
            />
          ) : (
            <div
              className="flex min-h-44 flex-col justify-center gap-2 p-2 text-(length:--font-size-sm) text-slate-500"
              role="status"
            >
              <h2 className="text-base font-semibold text-slate-800">
                Resultado
              </h2>
              <p>
                Complete los datos del paciente y seleccione Predecir para ver
                el resultado.
              </p>
            </div>
          )}
        </section>
      </div>

      {prediction && (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
          <ExplicacionPanel
            loading={loadingExplain}
            onExplain={handleExplain}
            result={
              prediction &&
              explicacion &&
              Object.keys(inputs).every(
                (key) =>
                  inputs[key as keyof PredictionRequest] ===
                  explicacion.inputs[key as keyof PredictionRequest],
              )
                ? explicacion.result
                : null
            }
            error={explainError}
          />
        </section>
      )}
    </Stack>
  );
}
