"use client";

import { Dialog } from "@/components/molecules/Dialog";
import { PredictionForm } from "@/app/prediction/components/PredictionForm";
import { PredictionResultCard } from "@/app/prediction/components/PredictionResultCard";
import { usePredictionRunner } from "@/app/prediction/hooks/usePredictionRunner";

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
  const runner = usePredictionRunner({ onSuccess: onSaved });
  const { loadingPredict, prediction } = runner;

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
