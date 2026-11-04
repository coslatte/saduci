"use client";

import { useState } from "react";
import { showToast } from "@/components/molecules/Toast";
import {
  PREDICTION_LIMITS,
  runPrediction,
  type PredictionResponse,
} from "@/lib/prediction";

interface UsePredictionRunnerOptions {
  /** Called after a prediction is computed and persisted by the backend. */
  onSuccess?: () => void;
}

/**
 * Owns the prediction run workflow: clinical inputs, execution and toasts.
 * Shared by the prediction page and the "+ Nuevo" dialog in records so both
 * run the same process.
 */
export function usePredictionRunner(options: UsePredictionRunnerOptions = {}) {
  const { onSuccess } = options;
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

  async function handlePredict(): Promise<void> {
    setPrediction(null);
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
      showToast({
        title: "Predicción completada",
        description: `Probabilidad de fallecer: ${(result.probability * 100).toFixed(1)}%. El registro se guardó correctamente.`,
        type: "success",
      });
      onSuccess?.();
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
    handlePredict,
  };
}

export type PredictionRunner = ReturnType<typeof usePredictionRunner>;
