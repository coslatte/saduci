"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiRefreshCw } from "react-icons/fi";
import { Card } from "@/components/molecules/Card";
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
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-6 text-center">
        <Text as="p" size="sm" weight="semibold" className="text-amber-800">
          No se pudieron cargar los totales
        </Text>
        <Text as="p" size="xs" muted>
          {error}
        </Text>
        <button
          type="button"
          onClick={() => setRetryKey((key) => key + 1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-100"
        >
          <FiRefreshCw className="size-4" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={routes.recordsSimulations} className="block no-underline">
          <Card className="transition-colors hover:border-primary-200 hover:bg-primary-50/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Text as="p" size="sm" muted>
                  Simulaciones realizadas
                </Text>
                <Text
                  as="p"
                  size="2xl"
                  weight="semibold"
                  className="mt-1 text-slate-900"
                >
                  {simulationCount ?? "—"}
                </Text>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={routes.recordsPredictions} className="block no-underline">
          <Card className="transition-colors hover:border-primary-200 hover:bg-primary-50/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Text as="p" size="sm" muted>
                  Predicciones realizadas
                </Text>
                <Text
                  as="p"
                  size="2xl"
                  weight="semibold"
                  className="mt-1 text-slate-900"
                >
                  {predictionCount ?? "—"}
                </Text>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
