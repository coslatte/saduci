"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { FiInfo } from "react-icons/fi";
import { Button } from "@/components/atoms/Buttons";
import { Alert } from "@/components/molecules/Alert";
import { Spinner } from "@/components/atoms/Spinner";
import { EXPLANATION_LOADING_PHASES } from "@/constants/loading";
import { useProgressiveStatus } from "@/hooks/useProgressiveStatus";
import {
  EXPLANATION_METHODS,
  type ExplanationMethod,
  type ExplicacionResponse,
} from "@/lib/prediction";

interface ExplicacionPanelProps {
  hasPrediction: boolean;
  loading: boolean;
  onExplain: (method: ExplanationMethod) => void;
  method: ExplanationMethod;
  onMethodChange: (method: ExplanationMethod) => void;
  result: ExplicacionResponse | null;
  unavailableMessage?: string | null;
}

interface ChartEntry {
  feature: string;
  importance: number;
  patientValue: string;
  referenceValue: string;
}

function formatChartValue(
  value: number | string | readonly (number | string)[] | undefined,
) {
  if (typeof value === "number") return `${value.toFixed(2)} p.p.`;
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

export function ExplicacionPanel({
  hasPrediction,
  loading,
  onExplain,
  method,
  onMethodChange,
  result,
  unavailableMessage,
}: ExplicacionPanelProps) {
  const { message: loadingMessage } = useProgressiveStatus(loading, {
    phases: EXPLANATION_LOADING_PHASES,
  });
  const chartData: ChartEntry[] = result
    ? result.feature_names
        .map((name, i) => ({
          feature: name,
          importance: (result.importances[i] ?? 0) * 100,
          patientValue: result.rows[i]?.patient_value_display ?? "—",
          referenceValue: result.rows[i]?.baseline_value_display ?? "—",
        }))
        .sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
    : [];

  return (
    <section
      aria-labelledby="prediction-explain-section-title"
      className="flex flex-col gap-4"
    >
      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
        <FiInfo className="size-5 text-primary-600" />
        <h2
          id="prediction-explain-section-title"
          className="font-semibold text-zinc-800"
        >
          Explicabilidad del modelo
        </h2>
      </div>

      <div className="flex flex-col w-full gap-4">
        {!hasPrediction && (
          <Alert variant="info">
            {unavailableMessage ??
              "Primero realice una predicción para activar la explicación."}
          </Alert>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label
              htmlFor="prediction-explanation-method"
              className="text-sm font-medium text-slate-700"
            >
              Método de explicabilidad
            </label>
            <select
              id="prediction-explanation-method"
              value={method}
              disabled={loading}
              onChange={(event) => {
                const selected = EXPLANATION_METHODS.find(
                  (item) => item === event.currentTarget.value,
                );
                if (selected) onMethodChange(selected);
              }}
              className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-primary-600 disabled:opacity-60"
            >
              {EXPLANATION_METHODS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="secondary"
            disabled={!hasPrediction || loading}
            onClick={() => onExplain(method)}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" />
                Generando...
              </span>
            ) : (
              "Explicar"
            )}
          </Button>
        </div>

        {loading && (
          <p
            role="status"
            aria-live="polite"
            className="text-(length:--font-size-sm) text-slate-500"
          >
            {loadingMessage}
          </p>
        )}

        {result && (
          <div className="flex w-full flex-col gap-4">
            {result.narrative && (
              <div className="rounded-md border border-primary-200 bg-primary-50 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-zinc-800">
                    Interpretación del resultado
                  </h3>
                  <span className="text-xs font-medium text-slate-600">
                    {result.narrative_provider === "embedded"
                      ? `Qwen local · ${result.narrative_model ?? "Qwen2.5 1.5B"}`
                      : result.narrative_provider === "stub"
                        ? "Plantilla de respaldo"
                        : `Proveedor ${result.narrative_provider ?? "de narrativa"}`}
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-700">
                  {result.narrative}
                </p>
                {result.narrative_status === "fallback" && (
                  <p role="status" className="mt-2 text-xs text-slate-600">
                    No se pudo generar el texto con IA. Se muestra una plantilla
                    basada en los mismos cálculos del predictor.
                  </p>
                )}
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  Es una explicación de señales del predictor, no una causa
                  médica ni una certeza sobre el desenlace.
                </p>
              </div>
            )}
            <div className="flex w-full flex-col gap-2">
              <h3 className="font-medium text-zinc-700">
                Factores asociados al resultado · {result.method}
              </h3>
              <p className="text-xs leading-5 text-slate-600">
                Cada barra muestra cómo cambia la probabilidad estimada de
                muerte al reemplazar una variable por su referencia y volver a
                ejecutar el modelo.
              </p>
              <p className="text-xs leading-5 text-slate-600">
                {result.reference_warning}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-primary-500" />
                  Aumenta probabilidad de muerte
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-slate-400" />
                  Reduce probabilidad de muerte
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(value: number) => value.toFixed(1)}
                  />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    width={112}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={formatChartValue}
                    labelFormatter={(label, payload) => {
                      const point = payload[0]?.payload as
                        | ChartEntry
                        | undefined;
                      return point
                        ? `${label} · actual: ${point.patientValue}; referencia: ${point.referenceValue}`
                        : String(label);
                    }}
                  />
                  <ReferenceLine x={0} stroke="#ef4444" strokeDasharray="4 2" />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.importance >= 0 ? "#14b8a6" : "#94a3b8"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-500">
                Cambios expresados en puntos porcentuales frente al valor de
                referencia; no representan causas ni efectos causales.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
