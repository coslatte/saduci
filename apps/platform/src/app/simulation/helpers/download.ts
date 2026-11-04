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
  downloadBlob(blob, `simulacion-paciente-${safePatientId(patientId)}.csv`);
}

function safePatientId(patientId: string): string {
  return patientId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Standalone SVG export of the simulation results table.
 * Text is emitted as single-line SVG <text> nodes with an explicit UTF-8
 * declaration, so accents never mojibake (Estadístico, Desviación...) and
 * words never wrap when opened in Office or a browser.
 */
export function downloadSimulationSVG(
  result: SimulationResponse,
  patientId: string,
): void {
  const sim = result.simulation;
  const keys = Object.keys(sim) as (keyof typeof sim)[];
  const header = ["Estadístico", ...keys.map((k) => TIME_VARIABLE_LABELS[k])];
  const rows = [
    ["Promedio", ...keys.map((k) => sim[k].mean.toFixed(2))],
    ["Desviación Estándar", ...keys.map((k) => sim[k].std.toFixed(2))],
    ["Límite Inf.", ...keys.map((k) => sim[k].ci_lower.toFixed(2))],
    ["Límite Sup.", ...keys.map((k) => sim[k].ci_upper.toFixed(2))],
  ];

  const fontFamily = "Inter, 'Segoe UI', Arial, sans-serif";
  const pad = 24;
  const titleSize = 20;
  const cellSize = 14;
  const rowH = 34;
  const titleH = 56;
  const footerH = 44;
  // First column fits the longest label ("Desviación Estándar"); value
  // columns fit "Tiempo…" headers. Fixed widths = no wrapping ever.
  const colWidths = [220, ...keys.map(() => 150)];
  const width = pad * 2 + colWidths.reduce((sum, w) => sum + w, 0);
  const gridTop = pad + titleH;
  const gridH = rowH * (rows.length + 1);
  const height = gridTop + gridH + footerH + pad;

  const colX: number[] = [];
  colWidths.reduce((x, w, i) => {
    colX[i] = x;
    return x + w;
  }, pad);

  function cell(
    x: number,
    y: number,
    w: number,
    text: string,
    bold: boolean,
    alignRight: boolean,
  ): string {
    const tx = alignRight ? x + w - 12 : x + 12;
    const anchor = alignRight ? "end" : "start";
    const weight = bold ? " font-weight='600'" : "";
    return (
      `<rect x='${x}' y='${y}' width='${w}' height='${rowH}' fill='${bold ? "#f1f5f9" : "#ffffff"}' stroke='#e2e8f0'/>` +
      `<text x='${tx}' y='${y + rowH / 2 + 5}' font-family='${fontFamily}' font-size='${cellSize}'${weight} fill='#1e293b' text-anchor='${anchor}'>${escapeXml(text)}</text>`
    );
  }

  let svg =
    `<?xml version='1.0' encoding='UTF-8'?>\n` +
    `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>` +
    `<rect x='0' y='0' width='${width}' height='${height}' fill='#ffffff'/>` +
    `<text x='${pad}' y='${pad + 24}' font-family='${fontFamily}' font-size='${titleSize}' font-weight='700' fill='#0f172a'>${escapeXml(`Simulación — Paciente ${patientId}`)}</text>` +
    `<text x='${pad}' y='${pad + 44}' font-family='${fontFamily}' font-size='${cellSize}' fill='#64748b'>${escapeXml("Registros de la Simulación")}</text>`;

  header.forEach((text, i) => {
    svg += cell(colX[i], gridTop, colWidths[i], text, true, i > 0);
  });
  rows.forEach((row, r) => {
    row.forEach((text, i) => {
      svg += cell(
        colX[i],
        gridTop + rowH * (r + 1),
        colWidths[i],
        text,
        i === 0,
        i > 0,
      );
    });
  });

  const footerY = gridTop + gridH + 28;
  svg +=
    `<text x='${pad}' y='${footerY}' font-family='${fontFamily}' font-size='${cellSize}' fill='#334155'>${escapeXml(`Probabilidad de fallecer: ${(result.prediction.probability * 100).toFixed(1)}%`)}</text>` +
    `</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, `simulacion-paciente-${safePatientId(patientId)}.svg`);
}
