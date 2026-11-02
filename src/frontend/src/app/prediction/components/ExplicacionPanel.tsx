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
import { Label } from "@/components/atoms/Label";
import { AccessibleSelect } from "@/components/atoms/AccessibleSelect";
import { Spinner } from "@/components/atoms/Spinner";
import { Text } from "@/components/atoms/Text";
import type { ExplanationMethod, ExplicacionResponse } from "@/lib/prediction";
import { EXPLANATION_METHODS } from "@/lib/prediction";

interface ExplicacionPanelProps {
  hasPrediction: boolean;
  method: ExplanationMethod;
  setMethod: (m: ExplanationMethod) => void;
  loading: boolean;
  onExplain: () => void;
  result: ExplicacionResponse | null;
  error: string | null;
}

interface ChartEntry {
  feature: string;
  importance: number;
}

function formatChartValue(
  value: number | string | readonly (number | string)[] | undefined,
) {
  if (typeof value === "number") return value.toFixed(4);
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

export function ExplicacionPanel({
  hasPrediction,
  method,
  setMethod,
  loading,
  onExplain,
  result,
  error,
}: ExplicacionPanelProps) {
  const chartData: ChartEntry[] = result
    ? result.feature_names
        .map((name, i) => ({
          feature: name,
          importance: result.importances[i] ?? 0,
        }))
        .sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
    : [];

  return (
    <section
      aria-labelledby="prediction-explain-section-title"
      className="flex flex-col gap-6"
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
            Primero realice una predicción para activar la explicación.
          </Alert>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pred-method">Seleccionar método</Label>
            <AccessibleSelect
              id="pred-method"
              value={method}
              onChange={(value) => setMethod(value as ExplanationMethod)}
              options={EXPLANATION_METHODS.map((m) => ({
                value: m,
                label: m,
              }))}
              fullWidth={false}
              className="min-w-[220px]"
            />
          </div>

          <Button
            variant="secondary"
            disabled={!hasPrediction || loading}
            onClick={onExplain}
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

        {error && <Alert variant="danger">{error}</Alert>}

        {result && (
          <div className="flex flex-col w-full gap-3">
            <h3 className="font-medium text-zinc-700">
              {`Explicación con ${method}`}
            </h3>
            <div className="flex gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-primary-500 rounded-sm" />
                Positiva (aumenta probabilidad)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-slate-400 rounded-sm" />
                Negativa (disminuye probabilidad)
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 80, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => v.toFixed(2)}
                />
                <YAxis
                  type="category"
                  dataKey="feature"
                  width={76}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={formatChartValue} />
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
          </div>
        )}
      </div>
    </section>
  );
}
