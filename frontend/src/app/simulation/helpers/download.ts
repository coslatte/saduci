import {
  TIME_VARIABLE_LABELS,
  type SimulationResponse,
} from "@/lib/simulation";

const CSV_DELIMITER = ",";

function escapeCSVValue(value: string): string {
  if (
    value.includes(CSV_DELIMITER) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadSimulationCSV(
  result: SimulationResponse,
  patientId: string,
): void {
  const sim = result.simulation;
  const keys = Object.keys(sim) as (keyof typeof sim)[];
  const header = ["Estadístico", ...keys.map((k) => TIME_VARIABLE_LABELS[k])];
  const statsRows = [
    ["Promedio", ...keys.map((k) => sim[k].mean.toFixed(2))],
    ["Desviación Estándar", ...keys.map((k) => sim[k].std.toFixed(2))],
    ["Límite Inf.", ...keys.map((k) => sim[k].ci_lower.toFixed(2))],
    ["Límite Sup.", ...keys.map((k) => sim[k].ci_upper.toFixed(2))],
  ];

  const csvRows = [header, ...statsRows].map((row) =>
    row.map((value) => escapeCSVValue(String(value))).join(CSV_DELIMITER),
  );
  const csv = [`sep=${CSV_DELIMITER}`, ...csvRows].join("\r\n");
  const csvWithBom = `\uFEFF${csv}`;

  const blob = new Blob([csvWithBom], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeId = patientId.replace(/[^a-zA-Z0-9_-]/g, "_");
  a.download = `simulacion-paciente-${safeId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
