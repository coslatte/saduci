"use client";

import { FiInfo } from "react-icons/fi";
import { Alert } from "@/components/molecules/Alert";
import { Button } from "@/components/atoms/Buttons";
import { Spinner } from "@/components/atoms/Spinner";
import type { ExplicacionResponse } from "@/lib/prediction";

interface ExplicacionPanelProps {
  loading: boolean;
  onExplain: () => void;
  result: ExplicacionResponse | null;
  error: string | null;
}

const labels: Record<string, string> = {
  edad: "Edad",
  diag_ing1: "Diagnóstico de ingreso 1",
  diag_ing2: "Diagnóstico de ingreso 2",
  diag_egr2: "Diagnóstico de egreso 2",
  apache: "APACHE",
  tiempo_vam: "Tiempo de ventilación mecánica",
};

export function ExplicacionPanel({
  loading,
  onExplain,
  result,
  error,
}: ExplicacionPanelProps) {
  const rows = result
    ? [...result.rows].sort(
        (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
      )
    : [];
  const max = Math.max(0, ...rows.map((row) => Math.abs(row.contribution)));

  return (
    <section
      aria-labelledby="prediction-explain-section-title"
      className="flex flex-col gap-5"
      aria-busy={loading}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <FiInfo className="size-5 text-primary-600" aria-hidden="true" />
        <h2
          id="prediction-explain-section-title"
          className="font-semibold text-zinc-800"
        >
          ¿Qué influyó en este resultado?
        </h2>
      </div>
      <p className="text-sm text-slate-600">
        Para cada variable se compara la predicción del caso con otra en la que
        solo esa variable se sustituye por un valor de referencia. Las barras
        muestran la diferencia en puntos porcentuales.
      </p>
      {loading && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-slate-600"
        >
          <Spinner size="sm" /> Calculando la explicación…
        </p>
      )}
      {error && (
        <Alert variant="danger" title="No se pudo generar la explicación">
          {error}
        </Alert>
      )}
      {error && (
        <div>
          <Button variant="secondary" onClick={onExplain}>
            Reintentar explicación
          </Button>
        </div>
      )}
      {result && (
        <>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
            <span>
              <span className="font-semibold text-rose-700">+ Aumenta</span> la
              probabilidad estimada
            </span>
            <span>
              <span className="font-semibold text-teal-700">− Disminuye</span>{" "}
              la probabilidad estimada
            </span>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-600">
              No hay contribuciones disponibles para este caso.
            </p>
          ) : (
            <ul className="space-y-4" aria-label="Contribuciones por variable">
              {rows.map((row) => {
                const points = row.contribution * 100;
                const direction =
                  points > 0
                    ? "Aumenta"
                    : points < 0
                      ? "Disminuye"
                      : "Sin diferencia";
                return (
                  <li
                    key={row.feature_key}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
                      <span className="font-medium text-slate-800">
                        {labels[row.feature_key] ?? row.feature_name}
                      </span>
                      <span className="font-semibold tabular-nums text-slate-700">
                        {direction}: {points > 0 ? "+" : ""}
                        {points.toFixed(2)} puntos porcentuales
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Valor del caso: {row.patient_value_display}
                      {row.patient_value_display !== String(row.patient_value)
                        ? ` (código ${row.patient_value})`
                        : ""}{" "}
                      · Referencia: {row.baseline_value}
                      {row.feature_key.startsWith("diag_") ? " (código)" : ""}
                    </p>
                    <div
                      aria-hidden="true"
                      className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100"
                    >
                      <div
                        className={
                          points < 0
                            ? "bg-teal-600"
                            : points > 0
                              ? "bg-rose-600"
                              : "bg-slate-400"
                        }
                        style={{
                          width: `${max ? (Math.abs(row.contribution) / max) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs leading-relaxed text-slate-500">
            La referencia es el punto medio del rango configurado para cada
            variable; en diagnósticos es un código numérico y puede no
            corresponder a una categoría clínica. Las diferencias se calculan
            por separado y no deben sumarse. Describen el comportamiento del
            modelo, no una relación causal. El resultado requiere interpretación
            clínica.
          </p>
        </>
      )}
    </section>
  );
}
