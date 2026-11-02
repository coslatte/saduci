import { DataTable } from "@/components/molecules/DataTable";

interface Column {
  key: string;
  label: string;
}

interface TableBlockProps {
  title?: string;
  columnsJson?: string;
  rowsJson?: string;
}

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const SAMPLE_COLUMNS: Column[] = [
  { key: "nombre", label: "Nombre" },
  { key: "valor", label: "Valor" },
  { key: "estado", label: "Estado" },
];

const SAMPLE_ROWS = [
  { nombre: "Paciente A", valor: 42, estado: "Activo" },
  { nombre: "Paciente B", valor: 87, estado: "Inactivo" },
  { nombre: "Paciente C", valor: 65, estado: "Activo" },
];

/**
 * Builds a preview data table from JSON column and row definitions.
 * Used in X case: visualizing tabular block data configured in page builder.
 */
export function TableBlock({ title, columnsJson, rowsJson }: TableBlockProps) {
  const columns = parseJson<Column[]>(columnsJson, SAMPLE_COLUMNS);
  const rows = parseJson<Record<string, unknown>[]>(rowsJson, SAMPLE_ROWS);

  const dataColumns = columns.map((column) => ({
    key: column.key,
    label: column.label,
    align: "left" as const,
    headerClassName: "px-4 text-slate-600 font-semibold",
    cellClassName: "px-4 text-slate-700",
  }));

  const dataRows = rows.map((row) => {
    const normalizedRow: Record<string, string> = {};

    columns.forEach((column) => {
      normalizedRow[column.key] = String(row[column.key] ?? "");
    });

    return normalizedRow;
  });

  return (
    <div className="w-full">
      {title && <p className="mb-3 font-semibold text-slate-700">{title}</p>}
      <DataTable
        ariaLabel={title ?? "Tabla de datos"}
        columns={dataColumns}
        rows={dataRows}
        tableClassName="border-collapse text-sm"
        headerRowClassName="bg-slate-50 border-slate-200"
        bodyRowClassName="hover:bg-slate-50 border-slate-100"
      />
    </div>
  );
}
