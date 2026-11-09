"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Spinner } from "@/components/atoms/Spinner";
import { Alert } from "@/components/molecules/Alert";
import { showToast } from "@/components/molecules/Toast";
import { PageLayout } from "@/components/layout/PageLayout";
import { PREDICTION_LOADING_PHASES } from "@/constants/loading";
import { PREDICTION_WORKFLOW_COPY } from "@/constants/prediction";
import {
  RECORD_WORKSPACE_COPY,
  RECORD_HISTORY_COPY,
} from "@/constants/recordHistory";
import { useProgressiveStatus } from "@/hooks/useProgressiveStatus";
import { PredictionForm } from "./PredictionForm";
import { PredictionResultCard } from "./PredictionResultCard";
import { ExplicacionPanel } from "./ExplicacionPanel";
import { useAuth } from "@/lib/auth";
import { friendlyErrorMessage } from "@/lib/apiErrors";
import {
  fetchDiagnosisCatalog,
  fetchPredictionRecords,
  formatRecordDate,
} from "@/lib/recordsApi";
import type { DiagnosisOption } from "@/lib/predictionDiagnoses";
import type { PredictionRecord } from "@/lib/recordsMockData";
import { FiRefreshCw } from "react-icons/fi";
import {
  EXPLANATION_METHODS,
  runExplicacion,
  type ExplanationMethod,
  type ExplicacionResponse,
} from "@/lib/prediction";
import { usePredictionRunner } from "../hooks/usePredictionRunner";

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
  const { user, token } = useAuth();
  const [savedPredictions, setSavedPredictions] = useState<PredictionRecord[]>(
    [],
  );
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savedPredictionsError, setSavedPredictionsError] = useState<
    string | null
  >(null);
  const [diagnosisOptions, setDiagnosisOptions] = useState<DiagnosisOption[]>(
    [],
  );
  const [diagnosisLoading, setDiagnosisLoading] = useState(true);

  const fallbackUser = user?.username ?? "";

  const loadSavedPredictions = useCallback(async () => {
    if (!token) return;
    setLoadingSaved(true);
    setSavedPredictionsError(null);
    try {
      const records = await fetchPredictionRecords(token, fallbackUser);
      setSavedPredictions(records);
    } catch (error) {
      setSavedPredictionsError(
        friendlyErrorMessage(error, RECORD_HISTORY_COPY.predictions.loadError),
      );
    } finally {
      setLoadingSaved(false);
    }
  }, [token, fallbackUser]);

  const runner = usePredictionRunner({ onSuccess: loadSavedPredictions });
  const {
    edad,
    setEdad,
    diagIng1,
    setDiagIng1,
    diagIng2,
    setDiagIng2,
    diagEgr2,
    setDiagEgr2,
    apache,
    setApache,
    tiempoVam,
    setTiempoVam,
    loadingPredict,
    prediction,
    predictionInput,
    patientId,
    patientSkuLoading,
  } = runner;

  const { message: predictMessage } = useProgressiveStatus(loadingPredict, {
    phases: PREDICTION_LOADING_PHASES,
  });

  const [loadingExplain, setLoadingExplain] = useState<boolean>(false);
  const [explicacion, setExplicacion] = useState<ExplicacionResponse | null>(
    null,
  );
  const [explanationMethod, setExplanationMethod] = useState<ExplanationMethod>(
    EXPLANATION_METHODS[0],
  );
  const explanationRequestSequence = useRef(0);

  useEffect(() => {
    if (!token) return;
    void loadSavedPredictions();
  }, [token, loadSavedPredictions]);

  useEffect(() => {
    if (!token) {
      return;
    }
    void fetchDiagnosisCatalog(token)
      .then((diagnoses) => {
        setDiagnosisOptions(
          diagnoses.map(({ id, name }) => ({ value: String(id), label: name })),
        );
      })
      .catch(() => {
        showToast({
          title: "Error al cargar diagnósticos",
          description: "No se pudo obtener el catálogo de diagnósticos.",
          type: "error",
        });
      })
      .finally(() => setDiagnosisLoading(false));
  }, [token]);

  // A new run invalidates the previous explanation.
  useEffect(() => {
    explanationRequestSequence.current += 1;
    setExplicacion(null);
    setLoadingExplain(false);
    return () => {
      explanationRequestSequence.current += 1;
    };
  }, [prediction]);

  const predictionInputsChanged = Boolean(
    predictionInput &&
    (predictionInput.patient_id !== patientId ||
      predictionInput.edad !== edad ||
      predictionInput.diag_ing1 !== diagIng1 ||
      predictionInput.diag_ing2 !== diagIng2 ||
      predictionInput.diag_egr2 !== diagEgr2 ||
      predictionInput.apache !== apache ||
      predictionInput.tiempo_vam !== tiempoVam),
  );

  async function handlePredict(): Promise<void> {
    explanationRequestSequence.current += 1;
    setExplicacion(null);
    setLoadingExplain(false);
    await runner.handlePredict();
  }

  async function handleExplain(method: ExplanationMethod): Promise<void> {
    if (!prediction || !predictionInput) return;

    const requestSequence = ++explanationRequestSequence.current;
    setExplicacion(null);
    setLoadingExplain(true);

    try {
      const result = await runExplicacion({
        ...predictionInput,
        method,
        include_narrative: true,
      });

      if (requestSequence !== explanationRequestSequence.current) return;
      if (
        result.model_version !== prediction.model_version ||
        result.artifact_sha256 !== prediction.artifact_sha256
      ) {
        showToast({
          title: "El modelo activo cambió",
          description:
            PREDICTION_WORKFLOW_COPY.activeModelChangedForCurrentResult,
          type: "error",
        });
        return;
      }

      setExplicacion(result);
    } catch (err) {
      if (requestSequence !== explanationRequestSequence.current) return;
      const message = friendlyErrorMessage(
        err,
        "No se pudo generar la explicación.",
      );
      showToast({
        title: "Error en la explicación",
        description: message,
        type: "error",
      });
    } finally {
      if (requestSequence === explanationRequestSequence.current) {
        setLoadingExplain(false);
      }
    }
  }

  return (
    <PageLayout
      title="Predicción de Supervivencia"
      description="Herramienta de ayuda para estimar la supervivencia de pacientes en UCI."
      main={
        <section className="border border-slate-300 bg-white p-5 sm:p-6">
          <PredictionForm
            patientId={patientId}
            patientSkuLoading={patientSkuLoading}
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
            onPredict={() => void handlePredict()}
            diagnosisOptions={diagnosisOptions}
            diagnosisLoading={diagnosisLoading}
          />
        </section>
      }
      aside={
        <section className="border border-slate-300 bg-white p-5 sm:p-6">
          {loadingPredict ? (
            <div className="flex h-full min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
              <Spinner size="lg" label={predictMessage} />
              <p
                role="status"
                aria-live="polite"
                className="text-(length:--font-size-sm) text-slate-500"
              >
                {predictMessage}
              </p>
            </div>
          ) : prediction ? (
            <div className="flex flex-col gap-3">
              {!prediction.persisted && (
                <Alert variant="warning">
                  {PREDICTION_WORKFLOW_COPY.notPersisted}
                </Alert>
              )}
              <PredictionResultCard probability={prediction.probability} />
            </div>
          ) : (
            <div className="flex h-full min-h-44 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-(length:--font-size-sm) text-slate-500">
              Realice una predicción para visualizar el resultado del modelo.
            </div>
          )}
        </section>
      }
      below={
        <>
          <section className="border border-slate-300 bg-white p-5 sm:p-6">
            {predictionInputsChanged && (
              <Alert variant="warning" className="mb-4">
                {PREDICTION_WORKFLOW_COPY.changedInputs}
              </Alert>
            )}
            <ExplicacionPanel
              hasPrediction={prediction !== null}
              loading={loadingExplain}
              onExplain={(method) => void handleExplain(method)}
              method={explanationMethod}
              onMethodChange={(method) => {
                explanationRequestSequence.current += 1;
                setLoadingExplain(false);
                setExplanationMethod(method);
                setExplicacion(null);
              }}
              result={explicacion}
            />
          </section>

          {token && (
            <section className="border border-slate-300 bg-white p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <h2 className="min-w-0 text-(length:--font-size-sm) font-semibold uppercase tracking-widest text-slate-700">
                  {RECORD_HISTORY_COPY.predictions.title}
                </h2>
                <Link
                  href="/records/predictions"
                  className="text-sm font-medium text-primary-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary-600"
                >
                  {RECORD_WORKSPACE_COPY.all}
                </Link>
                <button
                  onClick={loadSavedPredictions}
                  disabled={loadingSaved}
                  className="flex cursor-pointer items-center gap-1 text-(length:--font-size-sm) text-slate-500 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={RECORD_HISTORY_COPY.retry}
                >
                  <FiRefreshCw
                    className={`size-4 ${loadingSaved ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
              {loadingSaved ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : savedPredictionsError ? (
                <p role="alert" className="text-sm text-red-700">
                  {savedPredictionsError}
                </p>
              ) : savedPredictions.length === 0 ? (
                <p role="status" className="text-sm text-slate-500">
                  {RECORD_HISTORY_COPY.predictions.empty}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {savedPredictions
                    .slice()
                    .reverse()
                    .slice(0, 5)
                    .map((record) => (
                      <Link
                        key={record.id}
                        href={`/records/predictions/${encodeURIComponent(record.id)}`}
                        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-(length:--font-size-sm) transition-colors hover:border-slate-300 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-primary-500"
                      >
                        <span className="min-w-0 truncate font-medium text-slate-700">
                          {record.patientId}
                        </span>
                        <span className="text-slate-500">
                          {record.outcome} (
                          {(record.probability * 100).toFixed(0)}
                          %)
                        </span>
                        <span className="whitespace-nowrap text-slate-400">
                          {formatRecordDate(record.createdAt)}
                        </span>
                      </Link>
                    ))}
                </div>
              )}
            </section>
          )}
        </>
      }
    />
  );
}
