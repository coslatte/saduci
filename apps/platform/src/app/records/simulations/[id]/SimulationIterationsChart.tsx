"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TIME_VARIABLE_LABELS } from "@/lib/simulation";

export interface SimulationIteration {
  iteration: number;
  [key: string]: number;
}

const KEYS = ["pre_vam", "vam", "post_vam", "uci", "post_uci"] as const;

export function SimulationIterationsChart({
  iterations,
}: {
  iterations: SimulationIteration[];
}) {
  const [metric, setMetric] = useState<(typeof KEYS)[number]>("pre_vam");
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const pageCount = Math.ceil(iterations.length / pageSize);
  const visible = iterations.slice(page * pageSize, (page + 1) * pageSize);
  const chartRows =
    iterations.length > 1500
      ? iterations.filter(
          (_, index) => index % Math.ceil(iterations.length / 1500) === 0,
        )
      : iterations;

  return (
    <section className="w-full border border-slate-300 bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Evolución por iteración
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {iterations.length.toLocaleString("es-ES")} iteraciones conservadas
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Los valores están en horas; las entradas usadas aparecen arriba.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Variable
          <select
            value={metric}
            onChange={(event) =>
              setMetric(event.target.value as (typeof KEYS)[number])
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            {KEYS.map((key) => (
              <option key={key} value={key}>
                {TIME_VARIABLE_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        className="h-72 w-full"
        role="img"
        aria-label={`Gráfico de ${TIME_VARIABLE_LABELS[metric]} por iteración`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartRows}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="iteration"
              tick={{ fontSize: 12 }}
              label={{
                value: "Iteración",
                position: "insideBottom",
                offset: -4,
              }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [
                Number(value).toFixed(2),
                TIME_VARIABLE_LABELS[metric],
              ]}
              labelFormatter={(label) => `Iteración ${label}`}
            />
            <Line
              type="monotone"
              dataKey={metric}
              name={TIME_VARIABLE_LABELS[metric]}
              stroke="#0f766e"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Iteración</th>
              {KEYS.map((key) => (
                <th key={key} className="px-3 py-2">
                  {TIME_VARIABLE_LABELS[key]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.iteration} className="border-b border-slate-100">
                <td className="px-3 py-2 tabular-nums">{row.iteration}</td>
                {KEYS.map((key) => (
                  <td key={key} className="px-3 py-2 tabular-nums">
                    {typeof row[key] === "number" ? row[key].toFixed(2) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <span>
            Iteraciones {page * pageSize + 1}–
            {Math.min((page + 1) * pageSize, iterations.length)} de{" "}
            {iterations.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((current) => current - 1)}
              className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page + 1 === pageCount}
              onClick={() => setPage((current) => current + 1)}
              className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
