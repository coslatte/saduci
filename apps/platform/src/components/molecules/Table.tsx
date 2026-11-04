"use client";

import type React from "react";
import { Text } from "@/components/atoms/Text";
import { Card } from "@/components/molecules/Card";
import { EmptyState } from "@/components/molecules/EmptyState";
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from "@/components/molecules/DataTable";
import { TableSkeleton } from "@/components/molecules/TableSkeleton";
import { useProgressiveStatus } from "@/hooks/useProgressiveStatus";
import { cn } from "@/lib/utils";

export interface TableProps {
  title?: string;
  description?: string;
  columns: DataTableColumn[];
  rows: DataTableRow[];
  ariaLabel: string;
  help?: string;
  emptyMessage?: string;
  loading?: boolean;
  wrapperClassName?: string;
  tableClassName?: string;
  headerRowClassName?: string;
  bodyRowClassName?: string | ((row: DataTableRow, index: number) => string);
  getRowKey?: (row: DataTableRow, index: number) => React.Key;
  enableSorting?: boolean;
}

/**
 * Table
 *
 * Card-wrapped data table with optional title, loading state, and empty feedback.
 * Used in X case: listing API-backed records with consistent app styling.
 */
export function Table({
  title,
  description,
  columns,
  rows,
  ariaLabel,
  help,
  emptyMessage = "No hay datos para mostrar.",
  loading = false,
  wrapperClassName,
  tableClassName,
  headerRowClassName,
  bodyRowClassName,
  getRowKey,
  enableSorting = true,
}: TableProps) {
  const { message: loadingMessage } = useProgressiveStatus(loading);
  const header = title ? (
    <div className="flex flex-col gap-1">
      <Text as="h2" size="base" weight="semibold" className="text-slate-800">
        {title}
      </Text>
      {description && (
        <Text as="p" size="sm" muted>
          {description}
        </Text>
      )}
    </div>
  ) : undefined;

  return (
    <Card header={header} padded={false} className={wrapperClassName}>
      <div className="px-4 py-4 sm:px-5">
        {loading ? (
          <TableSkeleton
            columns={columns.length}
            rows={6}
            label={loadingMessage}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={emptyMessage}
            className="min-h-40 justify-center"
          />
        ) : (
          <DataTable
            ariaLabel={ariaLabel}
            columns={columns}
            rows={rows}
            help={help}
            enableSorting={enableSorting}
            tableClassName={cn("border-collapse text-sm", tableClassName)}
            headerRowClassName={cn(
              "bg-slate-50 border-slate-200",
              headerRowClassName,
            )}
            bodyRowClassName={
              bodyRowClassName ??
              "border-slate-100 hover:bg-slate-50/80 transition-colors"
            }
            getRowKey={getRowKey}
          />
        )}
      </div>
    </Card>
  );
}
