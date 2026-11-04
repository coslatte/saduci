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
  fetchSimulationDetail,
  formatRecordDate,
  type SimulationDetail,
} from "@/lib/recordsApi";
import type { SimulationRecordStatus } from "@/lib/recordsMockData";
import {
  RESP_INSUF,
  VENTILATION_TYPE,
  type SimulationResponse,
} from "@/lib/simulation";
import { diagnosisDetailLabel } from "@/lib/diagnosisLabels";
import { SimulationResultTable } from "@/app/simulation/components/SimulationResultTable";
import { RecordsPageHeader } from "../../components/RecordsPageHeader";

const STATUS_LABELS: Record<SimulationRecordStatus, string> = {
  completada: "Completada",
  cancelada: "Cancelada",
  en_proceso: "En proceso",
};

const STATUS_BADGE: Record<
  SimulationRecordStatus,
  "success" | "warning" | "danger"
> = {
  completada: "success",
  cancelada: "danger",
  en_proceso: "warning",
};

type TimeKey = keyof SimulationResponse["simulation"];

const TIME_KEYS: TimeKey[] = ["pre_vam", "vam", "post_vam", "uci", "post_uci"];

function isTimeStats(value: unknown): value is {
  mean: number;
  std: number;
  ci_lower: number;
  ci_upper: number;
} {
  if (typeof value !== "object" || value === null) return false;
  const stats = value as Record<string, unknown>;
  return (
    typeof stats.mean === "number" &&
    typeof stats.std === "number" &&
    typeof stats.ci_lower === "number" &&
    typeof stats.ci_upper === "number"
  );
}

function toSimulationTable(
  results: Record<string, unknown>,
): SimulationResponse["simulation"] | null {
  const simulation = results.simulation;
  if (typeof simulation !== "object" || simulation === null) return null;
  const table = simulation as Record<string, unknown>;
  if (!TIME_KEYS.every((key) => isTimeStats(table[key]))) return null;
  return table as unknown as SimulationResponse["simulation"];
}

function toPrediction(results: Record<string, unknown>): {
  class: number;
  probability: number;
} | null {
  const prediction = results.prediction;
  if (typeof prediction !== "object" || prediction === null) return null;
  const data = prediction as Record<string, unknown>;
  if (typeof data.class !== "number" || typeof data.probability !== "number") {
    return null;
  }
  return { class: data.class, probability: data.probability };
}

function ventName(code: unknown): string {
  if (typeof code !== "number" || !Number.isFinite(code)) return "—";
  return VENTILATION_TYPE[code] ?? String(code);
}

function respName(code: unknown): string {
  if (typeof code !== "number" || !Number.isFinite(code)) return "—";
  return RESP_INSUF[code] ?? String(code);
}

function num(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : "—";
}

export default function SimulationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, token, isLoading: authLoading } = useAuth();
  const [detail, setDetail] = useState<SimulationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSimulationDetail(token, id, user?.username ?? "");
      setDetail(data);
    } catch (err) {
      setDetail(null);
      const message = friendlyErrorMessage(
        err,
        "No se pudo cargar la simulación.",
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

  const table = detail ? toSimulationTable(detail.results) : null;
  const prediction = detail ? toPrediction(detail.results) : null;

  const inputRows: { label: string; value: string }[] = detail
    ? [
        { label: "Edad", value: num(detail.parameters.age) },
        { label: "APACHE II", value: num(detail.parameters.apache) },
        {
          label: "Diag. Ingreso 1",
          value: diagnosisDetailLabel(detail.parameters.d1),
        },
        {
          label: "Diag. Ingreso 2",
          value: diagnosisDetailLabel(detail.parameters.d2),
        },
        {
          label: "Diag. Ingreso 3",
          value: diagnosisDetailLabel(detail.parameters.d3),
        },
        {
          label: "Diag. Ingreso 4",
          value: diagnosisDetailLabel(detail.parameters.d4),
        },
        {
          label: "Diag. Egreso 2",
          value: diagnosisDetailLabel(detail.parameters.diag_egreso2),
        },
        {
          label: "Ventilación artificial",
          value: ventName(detail.parameters.artif_vent),
        },
        { label: "Tiempo VAM", value: num(detail.parameters.vam_time) },
        { label: "Estadía UCI", value: num(detail.parameters.uti_stay) },
        {
          label: "Estadía Pre UCI",
          value: num(detail.parameters.preuti_stay),
        },
        {
          label: "Insuficiencia respiratoria",
          value: respName(detail.parameters.resp_insuf),
        },
        { label: "Porcentaje", value: num(detail.parameters.percent) },
        { label: "Corridas", value: num(detail.parameters.n_runs) },
      ]
    : [];

  return (
    <main>
      <Link
        href="/records/simulations"
        className="mb-4 inline-flex items-center gap-1.5 text-(length:--font-size-sm) text-slate-500 transition-colors hover:text-slate-800"
      >
        <FiArrowLeft className="size-4" />
        Volver a registros
      </Link>

      <RecordsPageHeader
        title="Detalles de Simulación"
        description={
          detail
            ? `Simulación de ${detail.record.patientId} · ${formatRecordDate(detail.record.createdAt)}`
            : "Consulta el detalle de la simulación registrada."
        }
        roleHint={
          detail
            ? `Creada por ${detail.record.createdBy}${detail.scenario ? ` · Escenario ${detail.scenario}` : ""}`
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
          title="No se encontró la simulación"
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
                  Corridas
                </dt>
                <dd className="font-medium text-slate-800">
                  {detail.record.runs.toLocaleString("es-ES")}
                </dd>
              </div>
              <div>
                <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-400">
                  Resultado
                </dt>
                <dd className="font-medium text-slate-800">
                  {detail.record.result}
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
            <h2 className="mb-3 text-(length:--font-size-sm) font-semibold uppercase tracking-widest text-slate-700">
              Datos de entrada
            </h2>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {inputRows.map((row) => (
                <div key={row.label}>
                  <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-400">
                    {row.label}
                  </dt>
                  <dd className="font-medium text-slate-800">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-(length:--font-size-sm) font-semibold uppercase tracking-widest text-slate-700">
              Resultados
            </h2>
            {table ? (
              <SimulationResultTable result={table} />
            ) : (
              <Alert variant="info">
                Este registro no conserva el detalle de tiempos de la
                simulación.
              </Alert>
            )}
            {prediction && (
              <p className="mt-4 text-(length:--font-size-sm) text-slate-600">
                Predicción del modelo: clase {prediction.class} · probabilidad
                de fallecer {(prediction.probability * 100).toFixed(1)}%.
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
