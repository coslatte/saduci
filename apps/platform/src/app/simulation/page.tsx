"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SimulationInputs from "./components/SimulationInputs";
import { SimulationResultsSection } from "./components/SimulationResultsSection";
import { PageLayout } from "@/components/layout/PageLayout";
import { Skeleton } from "@/components/atoms/Skeleton";
import { RECORD_HISTORY_COPY } from "@/constants/recordHistory";
import { useAuth } from "@/lib/auth";
import { friendlyErrorMessage } from "@/lib/apiErrors";
import { fetchSimulationRecords, formatRecordDate } from "@/lib/recordsApi";
import type { SimulationRecord } from "@/lib/recordsMockData";
import { FiRefreshCw } from "react-icons/fi";
import { useSimulationRunner } from "./hooks/useSimulationRunner";
import { downloadSimulationCSV, downloadSimulationSVG } from "./helpers/index";

export default function SimulacionPage() {
  const { user, token } = useAuth();
  const [savedSimulations, setSavedSimulations] = useState<SimulationRecord[]>(
    [],
  );
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savedSimulationsError, setSavedSimulationsError] = useState<
    string | null
  >(null);

  const fallbackUser = user?.username ?? "";

  const loadSavedSimulations = useCallback(async () => {
    if (!token) return;
    setLoadingSaved(true);
    setSavedSimulationsError(null);
    try {
      const records = await fetchSimulationRecords(token, fallbackUser);
      setSavedSimulations(records);
    } catch (error) {
      setSavedSimulationsError(
        friendlyErrorMessage(error, RECORD_HISTORY_COPY.simulations.loadError),
      );
    } finally {
      setLoadingSaved(false);
    }
  }, [token, fallbackUser]);

  const runner = useSimulationRunner({ onSuccess: loadSavedSimulations });
  const {
    patientId,
    loading,
    resultHistory,
    activeResultIndex,
    setActiveResultIndex,
  } = runner;

  useEffect(() => {
    if (!token) return;
    void loadSavedSimulations();
  }, [token, loadSavedSimulations]);

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
    <PageLayout
      title="Simulación de Paciente UCI"
      description="Ingrese los datos clínicos del paciente para simular su evolución en la Unidad de Cuidados Intensivos."
      main={<SimulationInputs runner={runner} />}
      aside={
        (loading || resultHistory.length > 0) && (
          <SimulationResultsSection
            results={resultHistory}
            activeIndex={activeResultIndex}
            onActiveIndexChange={setActiveResultIndex}
            onDownload={handleDownload}
            onDownloadSvg={handleDownloadSvg}
            loading={loading}
          />
        )
      }
      below={
        token ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="min-w-0 text-(length:--font-size-sm) font-semibold uppercase tracking-widest text-slate-700">
                {RECORD_HISTORY_COPY.simulations.title}
              </h2>
              <button
                onClick={loadSavedSimulations}
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
            ) : savedSimulationsError ? (
              <p role="alert" className="text-sm text-red-700">
                {savedSimulationsError}
              </p>
            ) : savedSimulations.length === 0 ? (
              <p role="status" className="text-sm text-slate-500">
                {RECORD_HISTORY_COPY.simulations.empty}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {savedSimulations
                  .slice()
                  .reverse()
                  .slice(0, 5)
                  .map((record) => (
                    <Link
                      key={record.id}
                      href={`/records/simulations/${encodeURIComponent(record.id)}`}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-(length:--font-size-sm) transition-colors hover:border-slate-300 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-primary-500"
                    >
                      <span className="min-w-0 truncate font-medium text-slate-700">
                        {record.patientId}
                      </span>
                      <span className="text-slate-500">{record.result}</span>
                      <span className="whitespace-nowrap text-slate-400">
                        {formatRecordDate(record.createdAt)}
                      </span>
                    </Link>
                  ))}
              </div>
            )}
          </section>
        ) : null
      }
    />
  );
}
