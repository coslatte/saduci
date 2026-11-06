export function downloadCsv(filename: string, rows: [string, string][]) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export interface ReportSection {
  title: string;
  rows: [string, string][];
}

export function downloadPdf(title: string, sections: ReportSection[]) {
  const frame = document.createElement("iframe");
  frame.style.cssText =
    "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const target = frame.contentWindow;
  if (!doc || !target) {
    frame.remove();
    throw new Error("No se pudo preparar el documento para imprimir.");
  }
  doc.open();
  doc.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe SADUCI</title><style>
    @page { size: A4; margin: 18mm; }
    body { font: 11pt/1.5 Arial, sans-serif; color: #1e293b; margin: 0; }
    header { border-bottom: 3px solid #0f766e; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { color: #0f766e; font-size: 10pt; font-weight: bold; letter-spacing: .12em; }
    h1 { color: #0f172a; font-size: 23pt; margin: 8px 0; }
    .meta { color: #64748b; font-size: 9pt; }
    section { margin: 0 0 22px; break-inside: avoid; }
    h2 { color: #0f766e; font-size: 13pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; }
    tr { break-inside: avoid; } th, td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
    th { color: #475569; width: 38%; font-weight: normal; } td { overflow-wrap: anywhere; }
    footer { color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 9pt; }
  </style></head><body></body></html>`);
  doc.close();
  const header = doc.createElement("header");
  const brand = doc.createElement("div");
  brand.className = "brand";
  brand.textContent = "SADUCI · UNIDAD DE CUIDADOS INTENSIVOS";
  const heading = doc.createElement("h1");
  heading.textContent = title;
  const generated = doc.createElement("div");
  generated.className = "meta";
  generated.textContent = `Generado: ${new Date().toLocaleString("es-ES")}`;
  header.append(brand, heading, generated);
  doc.body.append(header);
  for (const section of sections) {
    const element = doc.createElement("section");
    const heading = doc.createElement("h2");
    heading.textContent = section.title;
    const table = doc.createElement("table");
    for (const [label, value] of section.rows) {
      const row = doc.createElement("tr");
      const name = doc.createElement("th");
      name.scope = "row";
      name.textContent = label;
      const data = doc.createElement("td");
      data.textContent = value;
      row.append(name, data);
      table.append(row);
    }
    element.append(heading, table);
    doc.body.append(element);
  }
  const footer = doc.createElement("footer");
  footer.textContent = "SADUCI · Informe de ayuda para la evaluación clínica";
  doc.body.append(footer);
  target.onafterprint = () => frame.remove();
  target.focus();
  target.print();
}
