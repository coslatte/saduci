"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/components/molecules/Toast";
import { PREDICTION_WORKFLOW_COPY } from "@/constants/prediction";
import { useAuth } from "@/lib/auth";
import { fetchNextPatientSku } from "@/lib/recordsApi";
import {
  PREDICTION_LIMITS,
  runPrediction,
  type PredictionRequest,
  type PredictionResponse,
} from "@/lib/prediction";

interface UsePredictionRunnerOptions {
  /** Called after a prediction is computed and persisted by the backend. */
  onSuccess?: () => void;
  enabled?: boolean;
}

/**
 * Owns the prediction run workflow: clinical inputs, execution and toasts.
 * Shared by the prediction page and the "+ Nuevo" dialog in records so both
 * run the same process.
 */
export function usePredictionRunner(options: UsePredictionRunnerOptions = {}) {
  const { onSuccess, enabled = true } = options;
  const { token } = useAuth();
  const [patientId, setPatientId] = useState("");
  const [patientSkuLoading, setPatientSkuLoading] = useState(true);
  const wasEnabled = useRef(enabled);
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
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [predictionInput, setPredictionInput] =
    useState<PredictionRequest | null>(null);

  useEffect(() => {
    if (!enabled) {
      wasEnabled.current = false;
      return;
    }
    if (!wasEnabled.current) {
      wasEnabled.current = true;
      setPatientId("");
      setPatientSkuLoading(true);
    }
    if (patientId) return;
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
      })
      .finally(() => {
        if (!cancelled) setPatientSkuLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, patientId, token]);

  async function handlePredict(): Promise<void> {
    if (!patientId) {
      showToast({
        title: "SKU del paciente pendiente",
        description:
          "Espere a que se genere el SKU antes de ejecutar la predicción.",
        type: "error",
      });
      return;
    }
    setPrediction(null);
    setPredictionInput(null);
    setLoadingPredict(true);

    try {
      const request: PredictionRequest = {
        patient_id: patientId,
        edad,
        diag_ing1: diagIng1,
        diag_ing2: diagIng2,
        diag_egr2: diagEgr2,
        apache,
        tiempo_vam: tiempoVam,
      };
      const result = await runPrediction(request);

      setPrediction(result);
      setPredictionInput(request);
      if (result.persisted) {
        showToast({
          title: "Predicción completada",
          description:
            "Probabilidad de fallecer: " +
            (result.probability * 100).toFixed(1) +
            "%. El registro se guardó correctamente.",
          type: "success",
        });
        onSuccess?.();
      } else {
        showToast({
          title: "Predicción calculada sin guardar",
          description: PREDICTION_WORKFLOW_COPY.notPersisted,
          type: "error",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      showToast({
        title: "Error en la predicción",
        description: message,
        type: "error",
      });
    } finally {
      setLoadingPredict(false);
    }
  }

  return {
    patientId,
    patientSkuLoading,
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
    handlePredict,
  };
}

export type PredictionRunner = ReturnType<typeof usePredictionRunner>;
