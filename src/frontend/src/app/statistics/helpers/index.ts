/**
 * Parses a CSV file text and returns column data as an object keyed by header.
 */
export function parseCSV(text: string): Record<string, string[]> {
  const normalizedText = text.replace(/^\uFEFF/, "").trim();
  if (!normalizedText) return {};

  const lines = normalizedText.split(/\r?\n/).map((line) => line.trim());

  if (lines.length < 2) return {};

  let delimiter = ",";
  let startIndex = 0;

  const separatorMatch = lines[0].match(/^sep=(.)$/i);
  if (separatorMatch) {
    delimiter = separatorMatch[1];
    startIndex = 1;
  } else if (
    (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0)
  ) {
    delimiter = ";";
  }

  if (lines.length - startIndex < 2) return {};

  const headers = parseCSVRow(lines[startIndex], delimiter).map((h) =>
    h.trim(),
  );
  const result: Record<string, string[]> = Object.create(null);
  const normalizedHeaders = new Set<string>();

  for (const header of headers) {
    const normalized = normalizeColumnLabel(header);
    if (!normalized || normalizedHeaders.has(normalized)) {
      throw new Error(
        "Los encabezados del CSV deben tener nombres únicos y no vacíos.",
      );
    }
    normalizedHeaders.add(normalized);
    result[header] = [];
  }

  for (let i = startIndex + 1; i < lines.length; i++) {
    const cells = parseCSVRow(lines[i], delimiter);
    if (cells.length !== headers.length) {
      throw new Error(
        `La fila ${i + 1} tiene una cantidad de columnas distinta del encabezado.`,
      );
    }
    headers.forEach((header, idx) => {
      result[header].push((cells[idx] ?? "").trim());
    });
  }

  return result;
}

function parseCSVRow(row: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (!insideQuotes && char === delimiter) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (insideQuotes)
    throw new Error(
      "El CSV contiene comillas sin cerrar o campos de varias líneas no admitidos.",
    );
  cells.push(current);
  return cells;
}

function normalizeColumnLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseNumericValue(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return Number.NaN;

  let normalized = trimmed;
  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");

  if (hasComma && !hasDot) {
    normalized = trimmed.replace(/,/g, ".");
  } else if (hasComma && hasDot) return Number.NaN;

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized))
    return Number.NaN;

  return Number(normalized);
}

const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Reads a File object and returns the parsed CSV columns.
 * Rejects files larger than 5 MB.
 */
export async function readCSVFile(
  file: File,
): Promise<Record<string, string[]>> {
  if (file.size > MAX_CSV_SIZE_BYTES) {
    throw new Error(`El archivo "${file.name}" supera el límite de 5 MB.`);
  }
  const text = await file.text();
  try {
    return parseCSV(text);
  } catch (error) {
    throw new Error(
      `Error en "${file.name}": ${error instanceof Error ? error.message : "CSV inválido."}`,
    );
  }
}

/**
 * Extracts a numeric column from parsed CSV data by its label.
 * Returns an empty array if the column is not found.
 */
export function extractNumericColumn(
  csv: Record<string, string[]>,
  columnLabel: string,
): number[] {
  const exactValues = csv[columnLabel];
  const rawValues =
    exactValues ??
    csv[
      Object.keys(csv).find(
        (header) =>
          normalizeColumnLabel(header) === normalizeColumnLabel(columnLabel),
      ) ?? ""
    ];

  if (!rawValues) return [];
  return rawValues.map((value, index) => {
    const number = parseNumericValue(value);
    if (!Number.isFinite(number)) {
      throw new Error(
        `La columna "${columnLabel}" contiene un valor no numérico o vacío en la fila de datos ${index + 1}.`,
      );
    }
    return number;
  });
}
