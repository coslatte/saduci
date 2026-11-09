export function downloadCsv(filename: string, rows: [string, string][]) {
  downloadCsvTable(filename, [["Campo", "Valor"], ...rows]);
}

export function downloadCsvTable(
  filename: string,
  rows: readonly (readonly string[])[],
) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value: string): string {
  const isFormula =
    /^[\s]*[=+@\t\r]/.test(value) ||
    (/^[\s]*-/.test(value) && !/^\s*-\d+(?:[.,]\d+)?$/.test(value));
  const safeValue = isFormula ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export interface ReportSection {
  title: string;
  rows: [string, string][];
}

export interface SpreadsheetSheet {
  title: string;
  columns: readonly string[];
  rows: readonly (readonly (string | number)[])[];
  numberFormats?: readonly (string | undefined)[];
}

export async function downloadXlsx(
  filename: string,
  title: string,
  sheets: readonly SpreadsheetSheet[],
): Promise<void> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "SADUCI";
  workbook.created = new Date();

  for (const sheetData of sheets) {
    const sheet = workbook.addWorksheet(sheetData.title.slice(0, 31), {
      views: [{ state: "frozen", ySplit: 4 }],
      properties: { tabColor: { argb: "FF0F766E" } },
    });
    const lastColumn = sheetData.columns.length;
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = `${title} · ${sheetData.title}`;
    sheet.mergeCells(1, 1, 1, lastColumn);
    titleCell.font = {
      name: "Aptos Display",
      size: 16,
      bold: true,
      color: { argb: "FF0F766E" },
    };
    titleCell.alignment = { vertical: "middle" };
    sheet.getRow(1).height = 30;

    const generatedCell = sheet.getCell(2, 1);
    generatedCell.value = `Generado: ${new Date().toLocaleString("es-ES")}`;
    sheet.mergeCells(2, 1, 2, lastColumn);
    generatedCell.font = {
      name: "Aptos",
      size: 10,
      color: { argb: "FF64748B" },
    };
    sheet.getRow(2).height = 20;

    const headerRow = sheet.getRow(4);
    headerRow.values = [undefined, ...sheetData.columns];
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F766E" },
      };
      cell.font = { name: "Aptos", bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", wrapText: true };
    });

    sheetData.rows.forEach((values, index) => {
      const row = sheet.getRow(index + 5);
      row.values = [undefined, ...values];
      row.eachCell((cell, columnNumber) => {
        cell.font = { name: "Aptos", size: 11, color: { argb: "FF1E293B" } };
        cell.alignment = { vertical: "top", wrapText: true };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if (typeof cell.value === "number") {
          cell.numFmt = sheetData.numberFormats?.[columnNumber - 1] ?? "0.00";
        }
        if (index % 2 === 1) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          };
        }
      });
    });

    sheet.columns = sheetData.columns.map((column, columnIndex) => {
      const contentWidths = sheetData.rows.map((row) =>
        String(row[columnIndex] ?? "")
          .split(/\r?\n/)
          .reduce((max, line) => Math.max(max, line.length), 0),
      );
      const width = Math.min(
        56,
        Math.max(14, column.length, ...contentWidths) + 2,
      );
      return { width };
    });
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: Math.max(4, sheetData.rows.length + 4), column: lastColumn },
    };
    sheet.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
