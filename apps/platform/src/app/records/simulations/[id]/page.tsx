"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { Button } from "@/components/atoms/Buttons";
import { normalizeRole } from "@/entities/user";
import { getRecordPermissions } from "@/lib/recordPermissions";
import { downloadCsv, downloadPdf } from "@/lib/recordDownloads";
import { RecordDateForm } from "../../components/RecordDateForm";
import { Badge } from "@/components/atoms/Badge";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Alert } from "@/components/molecules/Alert";
import { ErrorState } from "@/components/molecules/ErrorState";
import { showToast } from "@/components/molecules/Toast";
import { useAuth } from "@/lib/auth";
import { useBreadcrumbLabel } from "@/context/breadcrumb";
import { friendlyErrorMessage } from "@/lib/apiErrors";
import {
  fetchSimulationDetail,
  formatRecordDate,
  updateSimulationRecord,
  type SimulationDetail,
} from "@/lib/recordsApi";
import type { SimulationRecordStatus } from "@/lib/recordsMockData";
import {
  RESP_INSUF,
  TIME_VARIABLE_LABELS,
  VENTILATION_TYPE,
  type SimulationResponse,
} from "@/lib/simulation";
import { diagnosisDetailLabel } from "@/lib/diagnosisLabels";
import { SimulationResultTable } from "@/app/simulation/components/SimulationResultTable";
import { SimulationFlowDiagram } from "@/app/simulation/components/SimulationFlowDiagram";
import {
  SimulationIterationsChart,
  type SimulationIteration,
} from "./SimulationIterationsChart";
import { RecordsPageHeader } from "../../components/RecordsPageHeader";
import { SimulationRecordDialog } from "../../components/SimulationRecordDialog";
import type { SimulationInitialValues } from "@/app/simulation/hooks/useSimulationRunner";

const STATUS_LABELS: Record<SimulationRecordStatus, string> = {
  completada: "Terminado",
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

function hours(value: unknown): string {
  const formatted = num(value);
  return formatted === "—" ? formatted : `${formatted} horas`;
}

function percent(value: unknown): string {
  const formatted = num(value);
  return formatted === "—" ? formatted : `${formatted}%`;
}

function parameterNumber(
  parameters: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = parameters[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export default function SimulationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, token, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const { setCurrentLabel } = useBreadcrumbLabel();
  const [detail, setDetail] = useState<SimulationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [resimulating, setResimulating] = useState(false);
  const permissions = getRecordPermissions(
    normalizeRole(user?.role),
    "simulations",
  );

  useEffect(() => {
    const patientSku = detail?.record.patientId.trim();
    if (!pathname || !patientSku) return;
    setCurrentLabel(pathname, patientSku);
    return () => setCurrentLabel(pathname, null);
  }, [detail?.record.patientId, pathname, setCurrentLabel]);

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
  const iterations: SimulationIteration[] = Array.isArray(
    detail?.results.iterations,
  )
    ? detail.results.iterations.filter(
        (row): row is SimulationIteration =>
          typeof row === "object" &&
          row !== null &&
          typeof (row as Record<string, unknown>).iteration === "number",
      )
    : [];

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
        { label: "Tiempo VAM", value: hours(detail.parameters.vam_time) },
        { label: "Estadía UCI", value: hours(detail.parameters.uti_stay) },
        {
          label: "Estadía Pre UCI",
          value: hours(detail.parameters.preuti_stay),
        },
        {
          label: "Insuficiencia respiratoria",
          value: respName(detail.parameters.resp_insuf),
        },
        { label: "Porcentaje", value: percent(detail.parameters.percent) },
        { label: "Corridas", value: num(detail.parameters.n_runs) },
      ]
    : [];
  const exportRows: [string, string][] = detail
    ? [
        ["Paciente", detail.record.patientId],
        ["Corridas", String(detail.record.runs)],
        ["Resultado", detail.record.result],
        ["Estado", STATUS_LABELS[detail.record.status]],
        ["Creado por", detail.record.createdBy],
        ["Fecha", formatRecordDate(detail.record.createdAt)],
        ...inputRows.map(
          (row) =>
            [row.label, row.value.replace(" horas", " h")] as [string, string],
        ),
        ...(prediction
          ? ([
              ["Clase predicha", String(prediction.class)],
              ["Probabilidad", `${(prediction.probability * 100).toFixed(1)}%`],
            ] as [string, string][])
          : []),
      ]
    : [];

  return (
    <main className="w-full min-w-0">
      <Link
        href="/records/simulations"
        className="mb-2 inline-flex items-center gap-1.5 text-(length:--font-size-sm) text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-primary-600"
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
      />

      {detail && !loading && !error && (
        <div className="mb-3 flex flex-wrap justify-center gap-2 print:hidden">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setResimulating(true)}
          >
            Volver a simular
          </Button>
          {permissions.canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              Editar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadPdf("Informe de simulación", [
                { title: "Datos del registro", rows: exportRows.slice(0, 6) },
                {
                  title: "Datos clínicos y configuración",
                  rows: inputRows.map(({ label, value }) => [
                    label,
                    value.replace(" horas", " h"),
                  ]),
                },
                {
                  title: "Resultados de la simulación",
                  rows: table
                    ? TIME_KEYS.map((key) => [
                        TIME_VARIABLE_LABELS[key],
                        `Media: ${table[key].mean.toFixed(2)} · Desviación: ${table[key].std.toFixed(2)} · Intervalo: ${table[key].ci_lower.toFixed(2)}–${table[key].ci_upper.toFixed(2)}`,
                      ])
                    : [["Detalle", "No disponible"]],
                },
                ...(prediction
                  ? [
                      {
                        title: "Predicción asociada",
                        rows: [
                          ["Clase", String(prediction.class)],
                          [
                            "Probabilidad",
                            `${(prediction.probability * 100).toFixed(1)}%`,
                          ],
                        ] as [string, string][],
                      },
                    ]
                  : []),
              ])
            }
          >
            Descargar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(`simulacion-${detail.record.id}.csv`, exportRows)
            }
          >
            Descargar CSV
          </Button>
        </div>
      )}
      {editing && detail && token && (
        <RecordDateForm
          kind="simulation"
          recordId={detail.record.id}
          token={token}
          createdAt={detail.record.createdAt}
          submitting={false}
          error={null}
          onSubmit={async (createdAt) => {
            try {
              await updateSimulationRecord(token, detail.record.id, {
                createdAt,
              });
              setEditing(false);
              await loadDetail();
            } catch (err) {
              showToast({
                title: "Error al guardar",
                description: friendlyErrorMessage(
                  err,
                  "No se pudo guardar la simulación.",
                ),
                type: "error",
              });
            }
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {detail && (
        <SimulationRecordDialog
          open={resimulating}
          onClose={() => setResimulating(false)}
          onSaved={() => {
            setResimulating(false);
            void loadDetail();
          }}
          initialValues={{
            patientId: detail.record.patientId,
            age: parameterNumber(detail.parameters, "age"),
            apache: parameterNumber(detail.parameters, "apache"),
            preutiStay: parameterNumber(detail.parameters, "preuti_stay"),
            vamTime: parameterNumber(detail.parameters, "vam_time"),
            utiStay: parameterNumber(detail.parameters, "uti_stay"),
            simPercent: parameterNumber(detail.parameters, "percent"),
            diagIng1: parameterNumber(detail.parameters, "d1"),
            diagIng2: parameterNumber(detail.parameters, "d2"),
            diagIng3: parameterNumber(detail.parameters, "d3"),
            diagIng4: parameterNumber(detail.parameters, "d4"),
            diagEgreso2: parameterNumber(detail.parameters, "diag_egreso2"),
            respInsuf: parameterNumber(detail.parameters, "resp_insuf"),
            ventType: parameterNumber(detail.parameters, "artif_vent"),
            simRuns: parameterNumber(detail.parameters, "n_runs"),
          } satisfies SimulationInitialValues}
        />
      )}
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
        <div className="grid w-full items-start gap-3">
          <section className="border border-slate-300 bg-white p-3 sm:p-4">
            <h2 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">
              Resumen
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
              <div>
                <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-500">
                  Paciente
                </dt>
                <dd className="break-words font-medium text-slate-900">
                  {detail.record.patientId}
                </dd>
              </div>
              <div>
                <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-500">
                  Corridas
                </dt>
                <dd className="break-words font-medium text-slate-900">
                  {detail.record.runs.toLocaleString("es-ES")}
                </dd>
              </div>
              <div>
                <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-500">
                  Resultado
                </dt>
                <dd className="break-words font-medium text-slate-900">
                  {detail.record.result}
                </dd>
              </div>
              <div>
                <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-500">
                  Estado
                </dt>
                <dd>
                  <Badge status={STATUS_BADGE[detail.record.status]}>
                    {STATUS_LABELS[detail.record.status]}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-500">
                  Creado por
                </dt>
                <dd className="break-words font-medium text-slate-900">
                  {detail.record.createdBy}
                </dd>
              </div>
              <div>
                <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-500">
                  Fecha
                </dt>
                <dd className="break-words font-medium text-slate-900">
                  {formatRecordDate(detail.record.createdAt)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="border border-slate-300 bg-white p-3 sm:p-4">
            <h2 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">
              Datos de entrada
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-5">
              {inputRows.map((row) => (
                <div key={row.label}>
                  <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-500">
                    {row.label}
                  </dt>
                  <dd className="break-words font-medium text-slate-900">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="border border-slate-300 bg-white p-3 sm:p-4">
            <h2 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">
              Resultados
            </h2>
            {table ? (
              <SimulationResultTable result={table} />
            ) : iterations.length > 0 ? (
              <Alert variant="info">
                Este registro no conserva el detalle de tiempos de la
                simulación.
              </Alert>
            ) : null}
            {!iterations.length && (
              <Alert variant="info">
                {table
                  ? "Este registro conserva el resumen, pero no los resultados individuales de cada iteración."
                  : "Este registro no conserva los resultados detallados de la simulación."}{" "}
                Las simulaciones nuevas mostrarán aquí el gráfico y el detalle
                completo.
              </Alert>
            )}
            {prediction && (
              <p className="mt-4 text-(length:--font-size-sm) text-slate-600">
                Predicción del modelo: clase {prediction.class} · probabilidad
                de fallecer {(prediction.probability * 100).toFixed(1)}%.
              </p>
            )}
          </section>

          {table && <SimulationFlowDiagram times={table} />}

          {iterations.length > 0 && (
            <div className="w-full min-w-0">
              <SimulationIterationsChart iterations={iterations} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
