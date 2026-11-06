"use client";

import { Dialog } from "@/components/molecules/Dialog";
import { PredictionForm } from "@/app/prediction/components/PredictionForm";
import { PredictionResultCard } from "@/app/prediction/components/PredictionResultCard";
import { usePredictionRunner } from "@/app/prediction/hooks/usePredictionRunner";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fetchDiagnosisCatalog } from "@/lib/recordsApi";
import type { DiagnosisOption } from "@/lib/predictionDiagnoses";

interface PredictionRecordDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * "+ Nuevo" popout for prediction records: the same clinical form and run
 * process as the prediction page, executed inside a dialog.
 */
export function PredictionRecordDialog({
  open,
  onClose,
  onSaved,
}: PredictionRecordDialogProps) {
  const runner = usePredictionRunner({ onSuccess: onSaved, enabled: open });
  const { token } = useAuth();
  const [diagnosisOptions, setDiagnosisOptions] = useState<DiagnosisOption[]>(
    [],
  );
  const [diagnosisLoading, setDiagnosisLoading] = useState(true);
  const { loadingPredict, prediction } = runner;

  useEffect(() => {
    if (!token) {
      return;
    }
    void fetchDiagnosisCatalog(token)
      .then((items) => {
        setDiagnosisOptions(
          items.map(({ id, name }) => ({ value: String(id), label: name })),
        );
      })
      .catch(() => setDiagnosisOptions([]))
      .finally(() => setDiagnosisLoading(false));
  }, [token]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nueva predicción"
      description="Complete los datos clínicos y ejecute la predicción. El registro se guarda automáticamente."
    >
      <div className="flex flex-col gap-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <PredictionForm
            patientId={runner.patientId}
            patientSkuLoading={runner.patientSkuLoading}
            edad={runner.edad}
            setEdad={runner.setEdad}
            diagIng1={runner.diagIng1}
            setDiagIng1={runner.setDiagIng1}
            diagIng2={runner.diagIng2}
            setDiagIng2={runner.setDiagIng2}
            diagEgr2={runner.diagEgr2}
            setDiagEgr2={runner.setDiagEgr2}
            apache={runner.apache}
            setApache={runner.setApache}
            tiempoVam={runner.tiempoVam}
            setTiempoVam={runner.setTiempoVam}
            loading={loadingPredict}
            onPredict={() => void runner.handlePredict()}
            diagnosisOptions={diagnosisOptions}
            diagnosisLoading={diagnosisLoading}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          {prediction ? (
            <PredictionResultCard probability={prediction.probability} />
          ) : (
            <div className="flex h-full min-h-44 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-(length:--font-size-sm) text-slate-500">
              {loadingPredict
                ? "Ejecutando predicción, por favor espere..."
                : "Ejecute una predicción para visualizar el resultado del modelo."}
            </div>
          )}
        </section>
      </div>
    </Dialog>
  );
}
