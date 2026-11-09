"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { Button } from "@/components/atoms/Buttons";
import { normalizeRole } from "@/entities/user";
import { getRecordPermissions } from "@/lib/recordPermissions";
import {
  downloadCsv,
  downloadPdf,
  downloadXlsx,
  type SpreadsheetSheet,
} from "@/lib/recordDownloads";
import { RecordDateForm } from "../../components/RecordDateForm";
import { PREDICTION_WORKFLOW_COPY } from "@/constants/prediction";
import { Badge } from "@/components/atoms/Badge";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Alert } from "@/components/molecules/Alert";
import { ErrorState } from "@/components/molecules/ErrorState";
import { showToast } from "@/components/molecules/Toast";
import { useAuth } from "@/lib/auth";
import { useBreadcrumbLabel } from "@/context/breadcrumb";
import { friendlyErrorMessage } from "@/lib/apiErrors";
import {
  fetchPredictionDetail,
  formatRecordDate,
  updatePredictionRecord,
  type PredictionDetail,
} from "@/lib/recordsApi";
import type { PredictionRecordStatus } from "@/lib/recordsMockData";
import {
  EXPLANATION_METHODS,
  runExplicacion,
  type ExplanationMethod,
  type ExplicacionResponse,
  type PredictionRequest,
} from "@/lib/prediction";
import { PredictionResultCard } from "@/app/prediction/components/PredictionResultCard";
import { ExplicacionPanel } from "@/app/prediction/components/ExplicacionPanel";
import { diagnosisDetailLabel } from "@/lib/diagnosisLabels";
import { RecordsPageHeader } from "../../components/RecordsPageHeader";
import { SimulationRecordDialog } from "../../components/SimulationRecordDialog";

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

interface PredictionModelProvenance {
  model_version: string;
  artifact_sha256: string;
}

function getPredictionModelProvenance(
  prediction: Record<string, unknown>,
): PredictionModelProvenance | null {
  const { model_version, artifact_sha256 } = prediction;
  if (
    typeof model_version !== "string" ||
    model_version.trim().length === 0 ||
    typeof artifact_sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(artifact_sha256)
  ) {
    return null;
  }
  return { model_version, artifact_sha256 };
}

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

function featureNumber(
  features: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = features[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function toPredictionRequest(
  features: Record<string, unknown>,
  patientId: string,
): PredictionRequest | null {
  const request = {
    patient_id: patientId,
    edad: features.edad,
    diag_ing1: features.diag_ing1,
    diag_ing2: features.diag_ing2,
    diag_egr2: features.diag_egr2,
    apache: features.apache,
    tiempo_vam: features.tiempo_vam,
  };
  const values = Object.values(request).filter(
    (value) => typeof value !== "string",
  );
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
  const pathname = usePathname();
  const { setCurrentLabel } = useBreadcrumbLabel();
  const [detail, setDetail] = useState<PredictionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explicacion, setExplicacion] = useState<ExplicacionResponse | null>(
    null,
  );
  const [explanationUnavailableMessage, setExplanationUnavailableMessage] =
    useState<string | null>(null);
  const explanationRequestSequence = useRef(0);
  const [explanationMethod, setExplanationMethod] = useState<ExplanationMethod>(
    EXPLANATION_METHODS[0],
  );
  const [editing, setEditing] = useState(false);
  const [resimulating, setResimulating] = useState(false);
  const permissions = getRecordPermissions(
    normalizeRole(user?.role),
    "predictions",
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
    setExplicacion(null);
    setExplanationUnavailableMessage(null);
    setLoadingExplain(false);
    explanationRequestSequence.current += 1;
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

  useEffect(
    () => () => {
      explanationRequestSequence.current += 1;
    },
    [],
  );

  async function handleExplain(method: ExplanationMethod): Promise<void> {
    if (!detail) return;
    const sourceModel = getPredictionModelProvenance(detail.prediction);
    const request = toPredictionRequest(
      detail.features,
      detail.record.patientId,
    );
    if (!request || !sourceModel) return;
    const requestSequence = ++explanationRequestSequence.current;
    setExplicacion(null);
    setExplanationUnavailableMessage(null);
    setLoadingExplain(true);
    try {
      const result = await runExplicacion({
        ...request,
        method,
        include_narrative: true,
      });
      if (requestSequence !== explanationRequestSequence.current) return;
      if (
        result.model_version !== sourceModel.model_version ||
        result.artifact_sha256 !== sourceModel.artifact_sha256
      ) {
        setExplanationUnavailableMessage(
          PREDICTION_WORKFLOW_COPY.activeModelChanged,
        );
        return;
      }
      setExplicacion(result);
    } catch (err) {
      if (requestSequence !== explanationRequestSequence.current) return;
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
      if (requestSequence === explanationRequestSequence.current) {
        setLoadingExplain(false);
      }
    }
  }

  const featureEntries = detail ? Object.entries(detail.features) : [];
  const explainRequest = detail
    ? toPredictionRequest(detail.features, detail.record.patientId)
    : null;
  const sourceModel = detail
    ? getPredictionModelProvenance(detail.prediction)
    : null;
  const explanationUnavailable =
    explanationUnavailableMessage ??
    (detail && !explainRequest
      ? PREDICTION_WORKFLOW_COPY.missingStoredInputs
      : detail && !sourceModel
        ? PREDICTION_WORKFLOW_COPY.missingModelProvenance
        : null);
  const exportRows: [string, string][] = detail
    ? [
        ["Paciente", detail.record.patientId],
        ["Resultado", detail.record.outcome],
        ["Probabilidad", `${(detail.record.probability * 100).toFixed(1)}%`],
        ["Estado", STATUS_LABELS[detail.record.status]],
        ["Creado por", detail.record.createdBy],
        ["Fecha", formatRecordDate(detail.record.createdAt)],
        ...featureEntries.map(
          ([key, value]) =>
            [FEATURE_LABELS[key] ?? key, featureValue(key, value)] as [
              string,
              string,
            ],
        ),
      ]
    : [];

  async function handleDownloadXlsx(): Promise<void> {
    if (!detail) return;
    const sheets: SpreadsheetSheet[] = [
      {
        title: "Registro",
        columns: ["Campo", "Valor"],
        rows: [
          ...exportRows.slice(0, 6),
          ["Modelo", detail.modelName || "No disponible"],
        ],
      },
      {
        title: "Datos clínicos",
        columns: ["Variable", "Valor"],
        rows: exportRows.slice(6),
      },
    ];
    if (explicacion) {
      sheets.push({
        title: "Explicación del modelo",
        columns: ["Variable", "Valor del paciente", "Contribución"],
        rows: explicacion.rows.map((row) => [
          row.feature_name,
          row.patient_value_display,
          row.contribution,
        ]),
      });
    }
    try {
      await downloadXlsx(
        `prediccion-${detail.record.id}.xlsx`,
        "Informe de predicción",
        sheets,
      );
    } catch {
      showToast({
        title: "Error al exportar",
        description: "No se pudo generar el archivo XLSX.",
        type: "error",
      });
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0">
      <Link
        href="/records/predictions"
        className="mb-2 inline-flex items-center gap-1.5 text-(length:--font-size-sm) text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-primary-600"
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
              downloadPdf("Informe de predicción", [
                {
                  title: "Datos y resultado",
                  rows: [
                    ...exportRows.slice(0, 6),
                    ["Modelo", detail.modelName || "No disponible"],
                  ],
                },
                {
                  title: "Datos clínicos de entrada",
                  rows: exportRows.slice(6),
                },
                ...(explicacion
                  ? [
                      {
                        title: "Explicación del modelo local",
                        rows: explicacion.rows.map(
                          (row) =>
                            [
                              row.feature_name,
                              `Valor: ${row.patient_value_display} · Contribución: ${row.contribution.toFixed(3)}`,
                            ] as [string, string],
                        ),
                      },
                    ]
                  : []),
              ])
            }
          >
            Descargar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadXlsx}>
            Descargar XLSX
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(`prediccion-${detail.record.id}.csv`, exportRows)
            }
          >
            Descargar CSV
          </Button>
        </div>
      )}
      {editing && detail && token && (
        <RecordDateForm
          kind="prediction"
          recordId={detail.record.id}
          token={token}
          createdAt={detail.record.createdAt}
          submitting={false}
          error={null}
          onSubmit={async (createdAt) => {
            try {
              await updatePredictionRecord(token, detail.record.id, {
                createdAt,
              });
              setEditing(false);
              await loadDetail();
            } catch (err) {
              showToast({
                title: "Error al guardar",
                description: friendlyErrorMessage(
                  err,
                  "No se pudo guardar la predicción.",
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
            void loadDetail();
          }}
          initialValues={{
            patientId: detail.record.patientId,
            age: featureNumber(detail.features, "edad"),
            apache: featureNumber(detail.features, "apache"),
            diagIng1: featureNumber(detail.features, "diag_ing1"),
            diagIng2: featureNumber(detail.features, "diag_ing2"),
            diagEgreso2: featureNumber(detail.features, "diag_egr2"),
            vamTime: featureNumber(detail.features, "tiempo_vam"),
          }}
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
          title="No se encontró la predicción"
          description={error ?? "El registro solicitado no existe."}
          onRetry={() => void loadDetail()}
        />
      ) : (
        <div className="grid w-full items-start gap-3 lg:grid-cols-2">
          <section className="lg:col-span-2 border border-slate-300 bg-white p-3 sm:p-4">
            <h2 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">
              Resumen
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
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
                  Resultado
                </dt>
                <dd className="break-words font-medium text-slate-900">
                  {detail.record.outcome}
                </dd>
              </div>
              <div>
                <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-500">
                  Probabilidad
                </dt>
                <dd className="break-words font-medium text-slate-900">
                  {(detail.record.probability * 100).toFixed(1)}%
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

          <section className="border border-slate-300 bg-white p-3 sm:p-4 lg:col-span-2">
            <PredictionResultCard probability={detail.record.probability} />
          </section>

          <section className="border border-slate-300 bg-white p-3 sm:p-4 lg:col-span-2">
            <h2 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">
              Datos de entrada
            </h2>
            {featureEntries.length > 0 ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-5">
                {featureEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-(length:--font-size-xs) uppercase tracking-wider text-slate-500">
                      {FEATURE_LABELS[key] ?? key}
                    </dt>
                    <dd className="break-words font-medium text-slate-900">
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

          <section className="lg:col-span-2 border border-slate-300 bg-white p-3 sm:p-4">
            <ExplicacionPanel
              hasPrediction={
                explainRequest !== null &&
                sourceModel !== null &&
                explanationUnavailableMessage === null
              }
              loading={loadingExplain}
              onExplain={(method) => void handleExplain(method)}
              method={explanationMethod}
              onMethodChange={(method) => {
                explanationRequestSequence.current += 1;
                setLoadingExplain(false);
                setExplanationMethod(method);
                setExplicacion(null);
              }}
              result={explicacion}
              unavailableMessage={explanationUnavailable}
            />
          </section>
        </div>
      )}
    </main>
  );
}
