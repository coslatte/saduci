"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { Badge } from "@/components/atoms/Badge";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Alert } from "@/components/molecules/Alert";
import { ErrorState } from "@/components/molecules/ErrorState";
import { showToast } from "@/components/molecules/Toast";
import { useAuth } from "@/lib/auth";
import { friendlyErrorMessage } from "@/lib/apiErrors";
import {
  fetchPredictionDetail,
  formatRecordDate,
  type PredictionDetail,
} from "@/lib/recordsApi";
import type { PredictionRecordStatus } from "@/lib/recordsMockData";
import {
  EXPLANATION_METHODS,
  runExplicacion,
  type ExplicacionResponse,
  type ExplanationMethod,
  type PredictionRequest,
} from "@/lib/prediction";
import { PredictionResultCard } from "@/app/prediction/components/PredictionResultCard";
import { ExplicacionPanel } from "@/app/prediction/components/ExplicacionPanel";
import { diagnosisDetailLabel } from "@/lib/diagnosisLabels";
import { RecordsPageHeader } from "../../components/RecordsPageHeader";

const STATUS_LABELS: Record<PredictionRecordStatus, string> = {
  activa: "Activa",
  archivada: "Archivada",
};

const STATUS_BADGE: Record<PredictionRecordStatus, "success" | "default"> = {
  activa: "success",
  archivada: "default",
};

const FEATURE_LABELS: Record<string, string> = {
  edad: "Edad",
  diag_ing1: "Diag. Ingreso 1",
  diag_ing2: "Diag. Ingreso 2",
  diag_egr2: "Diag. Egreso 2",
  apache: "APACHE II",
  tiempo_vam: "Tiempo VAM",
};

/** Fields whose value is a diagnosis code rather than a plain number. */
const DIAGNOSIS_FEATURES = new Set(["diag_ing1", "diag_ing2", "diag_egr2"]);

function featureValue(key: string, value: unknown): string {
  if (DIAGNOSIS_FEATURES.has(key)) {
    return diagnosisDetailLabel(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return "—";
}

function toPredictionRequest(
  features: Record<string, unknown>,
): PredictionRequest | null {
  const request = {
    edad: features.edad,
    diag_ing1: features.diag_ing1,
    diag_ing2: features.diag_ing2,
    diag_egr2: features.diag_egr2,
    apache: features.apache,
    tiempo_vam: features.tiempo_vam,
  };
  const values = Object.values(request);
  if (
    values.length !== 6 ||
    !values.every((v) => typeof v === "number" && Number.isFinite(v))
  ) {
    return null;
  }
  return request as PredictionRequest;
}

export default function PredictionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, token, isLoading: authLoading } = useAuth();
  const [detail, setDetail] = useState<PredictionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<ExplanationMethod>(
    EXPLANATION_METHODS[0],
  );
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explicacion, setExplicacion] = useState<ExplicacionResponse | null>(
    null,
  );

  const loadDetail = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPredictionDetail(token, id, user?.username ?? "");
      setDetail(data);
    } catch (err) {
      setDetail(null);
      const message = friendlyErrorMessage(
        err,
        "No se pudo cargar la predicción.",
      );
      setError(message);
      showToast({
        title: "Error al cargar datos",
        description: message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [token, id, user?.username]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setLoading(false);
      return;
    }
    void loadDetail();
  }, [authLoading, token, loadDetail]);

  async function handleExplain(): Promise<void> {
    if (!detail) return;
    const request = toPredictionRequest(detail.features);
    if (!request) return;
    setExplicacion(null);
    setLoadingExplain(true);
    try {
      const result = await runExplicacion({ ...request, method });
      setExplicacion(result);
    } catch (err) {
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
      setLoadingExplain(false);
    }
  }

  const featureEntries = detail ? Object.entries(detail.features) : [];
  const explainRequest = detail ? toPredictionRequest(detail.features) : null;

  return (
    <main>
      <Link
        href="/records/predictions"
        className="mb-4 inline-flex items-center gap-1.5 text-(length:--font-size-sm) text-slate-500 transition-colors hover:text-slate-800"
      >
        <FiArrowLeft className="size-4" />
        Volver a registros
      </Link>

      <RecordsPageHeader
        title="Detalles de Predicción"
        description={
          detail
            ? `Predicción de ${detail.record.patientId} · ${formatRecordDate(detail.record.createdAt)}`
            : "Consulta el detalle de la predicción registrada."
        }
        roleHint={
          detail
            ? `Creada por ${detail.record.createdBy}${detail.modelName ? ` · Modelo ${detail.modelName}` : ""}`
            : ""
        }
      />

      {loading || authLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error || !detail ? (
        <ErrorState
          title="No se encontró la predicción"
          description={error ?? "El registro solicitado no existe."}
          onRetry={() => void loadDetail()}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-(length:--font-size-sm) font-semibold uppercase tracking-widest text-slate-700">
              Resumen
            </h2>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-400">
                  Paciente
                </dt>
                <dd className="font-medium text-slate-800">
                  {detail.record.patientId}
                </dd>
              </div>
              <div>
                <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-400">
                  Resultado
                </dt>
                <dd className="font-medium text-slate-800">
                  {detail.record.outcome}
                </dd>
              </div>
              <div>
                <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-400">
                  Probabilidad
                </dt>
                <dd className="font-medium text-slate-800">
                  {(detail.record.probability * 100).toFixed(1)}%
                </dd>
              </div>
              <div>
                <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-400">
                  Estado
                </dt>
                <dd>
                  <Badge status={STATUS_BADGE[detail.record.status]}>
                    {STATUS_LABELS[detail.record.status]}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-400">
                  Creado por
                </dt>
                <dd className="font-medium text-slate-800">
                  {detail.record.createdBy}
                </dd>
              </div>
              <div>
                <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-400">
                  Fecha
                </dt>
                <dd className="font-medium text-slate-800">
                  {formatRecordDate(detail.record.createdAt)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <PredictionResultCard probability={detail.record.probability} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-(length:--font-size-sm) font-semibold uppercase tracking-widest text-slate-700">
              Datos de entrada
            </h2>
            {featureEntries.length > 0 ? (
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {featureEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-400">
                      {FEATURE_LABELS[key] ?? key}
                    </dt>
                    <dd className="font-medium text-slate-800">
                      {featureValue(key, value)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <Alert variant="info">
                Este registro no conserva los datos de entrada de la predicción.
              </Alert>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <ExplicacionPanel
              hasPrediction={explainRequest !== null}
              method={method}
              setMethod={setMethod}
              loading={loadingExplain}
              onExplain={() => void handleExplain()}
              result={explicacion}
            />
          </section>
        </div>
      )}
    </main>
  );
}
