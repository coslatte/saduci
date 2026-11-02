"use client";

import { useState } from "react";
import { Alert } from "@/components/molecules/Alert";
import { Text } from "@/components/atoms/Text";
import { Stack } from "@/components/layout/Stack";
import { PredictionForm } from "./PredictionForm";
import { PredictionResultCard } from "./PredictionResultCard";
import { ExplicacionPanel } from "./ExplicacionPanel";
import {
  EXPLANATION_METHODS,
  PREDICTION_LIMITS,
  runExplicacion,
  runPrediction,
  type ExplicacionResponse,
  type ExplanationMethod,
  type PredictionResponse,
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
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [explicacion, setExplicacion] = useState<ExplicacionResponse | null>(
    null,
  );
  const [method, setMethod] = useState<ExplanationMethod>(
    EXPLANATION_METHODS[0],
  );

  async function handlePredict(): Promise<void> {
    setPredictError(null);
    setPrediction(null);
    setExplicacion(null);
    setLoadingPredict(true);

    try {
      const result = await runPrediction({
        edad,
        diag_ing1: diagIng1,
        diag_ing2: diagIng2,
        diag_egr2: diagEgr2,
        apache,
        tiempo_vam: tiempoVam,
      });

      setPrediction(result);
    } catch (err) {
      setPredictError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingPredict(false);
    }
  }

  async function handleExplain(): Promise<void> {
    if (!prediction) return;

    setExplainError(null);
    setExplicacion(null);
    setLoadingExplain(true);

    try {
      const result = await runExplicacion({
        edad,
        diag_ing1: diagIng1,
        diag_ing2: diagIng2,
        diag_egr2: diagEgr2,
        apache,
        tiempo_vam: tiempoVam,
        method,
      });

      setExplicacion(result);
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
          "Predicción de No Supervivencia"
        </Text>
        <Text size="sm" className="mt-1 text-zinc-500">
          "Herramienta de apoyo en la predicción de no supervivencia de
          pacientes en UCI."
        </Text>
      </div>

      <div className="flex flex-col gap-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
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
            loading={loadingPredict}
            onPredict={handlePredict}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          {predictError && (
            <Alert variant="danger" title="Error en la predicción">
              {predictError}
            </Alert>
          )}

          {prediction ? (
            <PredictionResultCard probability={prediction.probability} />
          ) : (
            <div className="flex h-full min-h-44 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-(length:--font-size-sm) text-slate-500">
              "Realice una predicción para visualizar el resultado del modelo."
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <ExplicacionPanel
          hasPrediction={prediction !== null}
          method={method}
          setMethod={setMethod}
          loading={loadingExplain}
          onExplain={handleExplain}
          result={explicacion}
          error={explainError}
        />
      </section>
    </Stack>
  );
}
