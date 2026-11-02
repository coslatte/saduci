"use client";

import type React from "react";
import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FiChevronDown, FiChevronUp, FiChevronsDown } from "react-icons/fi";
import { HelpTooltipButton } from "@/components/atoms/HelpTooltipButton";
import { cn } from "@/lib/utils";

export interface DataTableColumn {
  key: string;
  label: React.ReactNode;
  align?: "left" | "right" | "center";
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableRow {
  [key: string]: React.ReactNode;
}

interface DataTableProps {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  ariaLabel: string;
  help?: string;
  wrapperClassName?: string;
  tableClassName?: string;
  headerRowClassName?: string;
  bodyRowClassName?: string | ((row: DataTableRow, index: number) => string);
  getRowKey?: (row: DataTableRow, index: number) => React.Key;
  enableSorting?: boolean;
}

/**
 * Reusable table renderer for consistent headers, rows, alignment, and styling.
 *
 * @param props.columns - Column definitions with label, key, alignment and optional classes.
 * @param props.rows - Table rows where each key maps to a rendered cell value.
 * @param props.ariaLabel - Accessible label for screen readers.
 * @param props.help - Optional contextual help shown with the shared help tooltip button.
 * @param props.wrapperClassName - Optional className for the horizontal overflow wrapper.
 * @param props.tableClassName - Optional className for the table element.
 * @param props.headerRowClassName - Optional className for the header row.
 * @param props.bodyRowClassName - Optional static or dynamic className for body rows.
 * @param props.getRowKey - Optional key resolver for stable row keys.
 *
 * @example
 * <DataTable
 *   ariaLabel="Resultados"
 *   columns={[
 *     { key: "metric", label: "Métrica" },
 *     { key: "value", label: "Valor", align: "right" },
 *   ]}
 *   rows={[
 *     { metric: "Estadístico", value: "4.1250" },
 *     { metric: "Valor de P", value: "0.0312" },
 *   ]}
 * />
 */
export function DataTable({
  columns,
  rows,
  ariaLabel,
  help,
  wrapperClassName,
  tableClassName,
  headerRowClassName,
  bodyRowClassName,
  getRowKey,
  enableSorting = true,
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const tableColumns = useMemo<ColumnDef<DataTableRow>[]>(
    () =>
      columns.map((column) => ({
        id: column.key,
        accessorFn: (row) => row[column.key],
        enableSorting,
        header: () => column.label,
        cell: (info) => info.getValue(),
      })),
    [columns, enableSorting],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className={cn("relative", wrapperClassName)}>
      {help && (
        <HelpTooltipButton
          help={help}
          className="absolute right-2 top-2"
          buttonClassName="flex items-center justify-center cursor-help"
        />
      )}

      <div className={cn("overflow-x-auto", help && "pt-8")}>
        <table
          className={cn("w-full text-(length:--font-size-sm)", tableClassName)}
          aria-label={ariaLabel}
        >
          <thead>
            <tr className={cn("border-b border-zinc-200", headerRowClassName)}>
              {table.getFlatHeaders().map((header, headerIndex) => {
                const column = columns[headerIndex];

                return (
                  <th
                    key={header.id}
                    className={cn(
                      "py-2 font-medium",
                      column?.align === "right" && "text-right",
                      column?.align === "center" && "text-center",
                      (!column?.align || column?.align === "left") &&
                        "text-left",
                      column?.headerClassName,
                    )}
                  >
                    {enableSorting ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "inline-flex items-center gap-1",
                          column?.align === "right" && "ml-auto",
                        )}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === "asc" ? (
                          <FiChevronUp className="size-3.5 text-zinc-500" />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <FiChevronDown className="size-3.5 text-zinc-500" />
                        ) : (
                          <FiChevronsDown className="size-3.5 text-zinc-400" />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((tableRow, rowIndex) => {
              const sourceRow = tableRow.original;

              return (
                <tr
                  key={getRowKey ? getRowKey(sourceRow, rowIndex) : tableRow.id}
                  className={cn(
                    "border-b border-zinc-100",
                    typeof bodyRowClassName === "function"
                      ? bodyRowClassName(sourceRow, rowIndex)
                      : bodyRowClassName,
                  )}
                >
                  {tableRow.getVisibleCells().map((cell, cellIndex) => {
                    const column = columns[cellIndex];

                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "py-2",
                          column?.align === "right" && "text-right",
                          column?.align === "center" && "text-center",
                          (!column?.align || column?.align === "left") &&
                            "text-left",
                          column?.cellClassName,
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
