"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/Buttons";
import { Dialog } from "@/components/molecules/Dialog";
import { friendlyErrorMessage } from "@/lib/apiErrors";
import { diagnosisDetailLabel } from "@/lib/diagnosisLabels";
import { fetchPredictionDetail, fetchSimulationDetail } from "@/lib/recordsApi";
import { RESP_INSUF, VENTILATION_TYPE } from "@/lib/simulation";

interface Props {
  kind: "simulation" | "prediction";
  recordId: string;
  token: string;
  createdAt: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

type Row = { label: string; value: string };

const SIMULATION_FIELDS: [string, string][] = [
  ["age", "Edad"],
  ["apache", "APACHE II"],
  ["d1", "Diagnóstico de ingreso 1"],
  ["d2", "Diagnóstico de ingreso 2"],
  ["d3", "Diagnóstico de ingreso 3"],
  ["d4", "Diagnóstico de ingreso 4"],
  ["diag_egreso2", "Diagnóstico de egreso 2"],
  ["artif_vent", "Ventilación artificial"],
  ["vam_time", "Tiempo VAM"],
  ["uti_stay", "Estadía UCI"],
  ["preuti_stay", "Estadía pre UCI"],
  ["resp_insuf", "Insuficiencia respiratoria"],
  ["percent", "Porcentaje"],
  ["n_runs", "Corridas"],
];
const PREDICTION_FIELDS: [string, string][] = [
  ["edad", "Edad"],
  ["apache", "APACHE II"],
  ["diag_ing1", "Diagnóstico de ingreso 1"],
  ["diag_ing2", "Diagnóstico de ingreso 2"],
  ["diag_egr2", "Diagnóstico de egreso 2"],
  ["tiempo_vam", "Tiempo VAM"],
];

function inputValue(key: string, value: unknown): string {
  if (key.startsWith("diag_") || /^d[1-4]$/.test(key))
    return diagnosisDetailLabel(value);
  if (key === "artif_vent" && typeof value === "number")
    return VENTILATION_TYPE[value] ?? String(value);
  if (key === "resp_insuf" && typeof value === "number")
    return RESP_INSUF[value] ?? String(value);
  return typeof value === "number" || typeof value === "string"
    ? String(value)
    : "—";
}

export function RecordDateForm({
  kind,
  recordId,
  token,
  createdAt,
  submitting,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const [value, setValue] = useState(() => {
    const date = new Date(createdAt);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (kind === "simulation") {
          const detail = await fetchSimulationDetail(token, recordId);
          if (active)
            setRows([
              { label: "Paciente", value: detail.record.patientId },
              { label: "Resultado", value: detail.record.result },
              ...SIMULATION_FIELDS.map(([key, label]) => ({
                label,
                value: inputValue(key, detail.parameters[key]),
              })),
            ]);
        } else {
          const detail = await fetchPredictionDetail(token, recordId);
          if (active)
            setRows([
              { label: "Paciente", value: detail.record.patientId },
              { label: "Resultado", value: detail.record.outcome },
              {
                label: "Probabilidad",
                value: `${(detail.record.probability * 100).toFixed(1)}%`,
              },
              ...PREDICTION_FIELDS.map(([key, label]) => ({
                label,
                value: inputValue(key, detail.features[key]),
              })),
            ]);
        }
      } catch (err) {
        if (active)
          setLoadError(
            friendlyErrorMessage(
              err,
              "No se pudieron cargar los datos del registro.",
            ),
          );
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [kind, recordId, token, attempt]);

  return (
    <Dialog
      open
      onClose={onCancel}
      title={kind === "simulation" ? "Editar simulación" : "Editar predicción"}
      description="Los datos del registro son de solo lectura. Puede modificar la fecha."
      busy={submitting}
    >
      {loadError ? (
        <div role="alert" className="space-y-3 text-red-700">
          <p>{loadError}</p>
          <Button
            variant="outline"
            onClick={() => {
              setLoadError(null);
              setAttempt((current) => current + 1);
            }}
          >
            Reintentar
          </Button>
        </div>
      ) : !rows ? (
        <p role="status">Cargando datos del registro...</p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(new Date(value).toISOString());
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {rows.map((row) => (
              <label
                key={row.label}
                className="flex min-w-0 flex-col gap-1 text-sm font-medium text-slate-700"
              >
                {row.label}
                <input
                  readOnly
                  value={row.value}
                  className="w-full rounded border border-slate-200 bg-slate-50 p-2 text-slate-700"
                />
              </label>
            ))}
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Fecha del registro
              <input
                type="datetime-local"
                required
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="rounded border border-slate-300 p-2 focus-visible:outline-2 focus-visible:outline-primary-600"
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-red-700">
              {error}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Guardar fecha
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
