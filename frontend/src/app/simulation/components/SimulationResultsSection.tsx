import { FiChevronLeft, FiChevronRight, FiDownload } from "react-icons/fi";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Buttons";
import { Skeleton } from "@/components/atoms/Skeleton";
import { PATIENT_DIES, PATIENT_SURVIVES } from "@/constants/constants";
import type { SimulationResponse } from "@/lib/simulation";
import { SimulationResultTable } from "./SimulationResultTable";

interface SimulationResultsSectionProps {
  results: SimulationResponse[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onDownload: () => void;
  loading?: boolean;
}

/**
 * Displays simulation results, prediction badge, and CSV download action.
 * Used in X case: post-run results panel in the simulation workflow.
 */
export function SimulationResultsSection({
  results,
  activeIndex,
  onActiveIndexChange,
  onDownload,
  loading = false,
}: SimulationResultsSectionProps) {
  const currentResult = results[activeIndex];
  const showSkeleton = loading;

  if (!currentResult && !showSkeleton) {
    return null;
  }

  const totalRuns = results.length;
  const currentRun = activeIndex + 1;
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < totalRuns - 1;

  const patientSurvives = currentResult?.prediction.class === 0;

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5"
      aria-busy={showSkeleton}
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        {showSkeleton ? (
          <Skeleton className="h-4 w-48" />
        ) : (
          <h2 className="text-(length:--font-size-sm) font-semibold uppercase tracking-widest text-slate-700">
            {"Resultados de la Simulación"}
          </h2>
        )}
        {showSkeleton ? (
          <Skeleton className="h-9 w-40 rounded-md" />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            aria-label="Descargar resultados en CSV"
            className="w-full sm:w-auto"
          >
            <FiDownload className="size-4" />
            {"Descargar CSV"}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        {showSkeleton ? (
          <>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col">
              <span className="text-(length:--font-size-xs) font-semibold uppercase tracking-wide text-slate-500">
                {"Historial de ejecuciones"}
              </span>
              <span className="text-(length:--font-size-sm) text-slate-700">
                {`Ejecución ${currentRun} de ${totalRuns}`}
              </span>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoPrevious}
                onClick={() => onActiveIndexChange(activeIndex - 1)}
                aria-label={"Anterior"}
                className="w-full sm:w-auto"
              >
                <FiChevronLeft className="size-4" />
                {"Anterior"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoNext}
                onClick={() => onActiveIndexChange(activeIndex + 1)}
                aria-label={"Siguiente"}
                className="w-full sm:w-auto"
              >
                {"Siguiente"}
                <FiChevronRight className="size-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {showSkeleton ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex flex-col gap-3 overflow-x-auto">
            <Skeleton className="h-4 w-52" />
            <div className="grid gap-3">
              {Array.from({ length: 4 }, (_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid grid-cols-[minmax(7rem,10rem)_repeat(5,minmax(5rem,1fr))] gap-3"
                >
                  <Skeleton className="h-9 w-full rounded-md" />
                  <Skeleton className="h-9 w-full rounded-md" />
                  <Skeleton className="h-9 w-full rounded-md" />
                  <Skeleton className="h-9 w-full rounded-md" />
                  <Skeleton className="h-9 w-full rounded-md" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <SimulationResultTable result={currentResult.simulation} />
      )}

      {showSkeleton ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Skeleton className="mb-3 h-4 w-44" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-(length:--font-size-sm) font-semibold uppercase tracking-widest text-slate-700">
            {"Predicción del modelo"}
          </p>
          <div className="flex items-center gap-3">
            <Badge status={patientSurvives ? "success" : "danger"}>
              {patientSurvives ? PATIENT_SURVIVES : PATIENT_DIES}
            </Badge>
            <span className="text-(length:--font-size-sm) text-slate-600">
              {"Probabilidad de fallecer: "}
              <strong>
                {(currentResult.prediction.probability * 100).toFixed(0)}%
              </strong>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
