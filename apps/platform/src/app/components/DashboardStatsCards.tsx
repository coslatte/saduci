"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiRefreshCw } from "react-icons/fi";
import { StatsCardsSkeleton } from "@/components/molecules/StatsCardsSkeleton";
import { Text } from "@/components/atoms/Text";
import { useAuth } from "@/lib/auth";
import { useProgressiveStatus } from "@/hooks/useProgressiveStatus";
import { fetchPredictionCount, fetchSimulationCount } from "@/lib/dashboardApi";
import { routes } from "@/lib/routes";

export function DashboardStatsCards() {
  const { token, isLoading: authLoading } = useAuth();
  const [simulationCount, setSimulationCount] = useState<number | null>(null);
  const [predictionCount, setPredictionCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const { message: loadingMessage } = useProgressiveStatus(
    loading || authLoading,
  );

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setSimulationCount(0);
      setPredictionCount(0);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCounts() {
      setLoading(true);
      setError(null);

      try {
        const [simulations, predictions] = await Promise.all([
          fetchSimulationCount(token!),
          fetchPredictionCount(token!),
        ]);

        if (cancelled) return;

        setSimulationCount(simulations);
        setPredictionCount(predictions);
      } catch (err) {
        if (cancelled) return;
        setSimulationCount(null);
        setPredictionCount(null);
        // Sin toast global: el fallo se muestra inline con reintento para no
        // spamear notificaciones al entrar al dashboard.
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los totales.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCounts();

    return () => {
      cancelled = true;
    };
  }, [authLoading, token, retryKey]);

  if (loading || authLoading) {
    return <StatsCardsSkeleton label={loadingMessage} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 border-y border-amber-300 bg-amber-50/70 px-4 py-6 text-left">
        <Text as="p" size="sm" weight="semibold" className="text-amber-800">
          No se pudieron cargar los totales
        </Text>
        <Text as="p" size="xs" muted>
          {error}
        </Text>
        <button
          type="button"
          onClick={() => setRetryKey((key) => key + 1)}
          className="inline-flex items-center gap-1.5 border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100"
        >
          <FiRefreshCw className="size-4" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="grid border-y border-slate-300 bg-white sm:grid-cols-2 sm:divide-x sm:divide-slate-300">
      <Link
        href={routes.recordsSimulations}
        className="group block border-b border-slate-300 px-6 py-6 no-underline transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary-600 sm:border-b-0 sm:px-8 sm:py-8"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Simulaciones
            </p>
            <Text
              as="p"
              size="4xl"
              weight="semibold"
              className="mt-3 tabular-nums tracking-tight text-slate-950"
            >
              {simulationCount ?? "—"}
            </Text>
            <p className="mt-2 text-sm text-slate-600">Evoluciones simuladas</p>
          </div>
          <span
            aria-hidden="true"
            className="mb-1 text-lg text-primary-700 transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </div>
      </Link>

      <Link
        href={routes.recordsPredictions}
        className="group block px-6 py-6 no-underline transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary-600 sm:px-8 sm:py-8"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Predicciones
            </p>
            <Text
              as="p"
              size="4xl"
              weight="semibold"
              className="mt-3 tabular-nums tracking-tight text-slate-950"
            >
              {predictionCount ?? "—"}
            </Text>
            <p className="mt-2 text-sm text-slate-600">
              Evaluaciones de riesgo
            </p>
          </div>
          <span
            aria-hidden="true"
            className="mb-1 text-lg text-primary-700 transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </div>
      </Link>
    </div>
  );
}
