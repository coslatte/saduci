"use client";

import { Dialog } from "@/components/molecules/Dialog";
import SimulationInputs from "@/app/simulation/components/SimulationInputs";
import { SimulationResultsSection } from "@/app/simulation/components/SimulationResultsSection";
import {
  useSimulationRunner,
  type SimulationInitialValues,
} from "@/app/simulation/hooks/useSimulationRunner";
import {
  downloadSimulationCSV,
  downloadSimulationSVG,
} from "@/app/simulation/helpers/index";

interface SimulationRecordDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialValues?: SimulationInitialValues;
}

/**
 * "+ Nuevo" popout for simulation records: the same clinical form and run
 * process as the simulation page, executed inside a dialog.
 */
export function SimulationRecordDialog({
  open,
  onClose,
  onSaved,
  initialValues,
}: SimulationRecordDialogProps) {
  const runner = useSimulationRunner({
    onSuccess: onSaved,
    initialValues,
    enabled: open,
  });
  const {
    patientId,
    loading,
    resultHistory,
    activeResultIndex,
    setActiveResultIndex,
  } = runner;

  function handleDownload(): void {
    const selectedResult = resultHistory[activeResultIndex];
    if (!selectedResult) return;
    downloadSimulationCSV(selectedResult, patientId);
  }

  function handleDownloadSvg(): void {
    const selectedResult = resultHistory[activeResultIndex];
    if (!selectedResult) return;
    downloadSimulationSVG(selectedResult, patientId);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nueva simulación"
      description="Complete los datos clínicos y ejecute la simulación. El registro se guarda automáticamente."
    >
      <div className="flex flex-col gap-5">
        <SimulationInputs runner={runner} />

        {(loading || resultHistory.length > 0) && (
          <SimulationResultsSection
            results={resultHistory}
            activeIndex={activeResultIndex}
            onActiveIndexChange={setActiveResultIndex}
            onDownload={handleDownload}
            onDownloadSvg={handleDownloadSvg}
            loading={loading}
          />
        )}
      </div>
    </Dialog>
  );
}
