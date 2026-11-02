"use client";

import { DataTable } from "@/components/molecules";
import { TIME_VARIABLE_LABELS } from "@/lib/simulation";
import type { SimulationResponse } from "@/lib/simulation";
import { dataDisabledProps } from "@/lib/utils";

export interface SimulationResultTableProps {
  result: SimulationResponse["simulation"];
  disabled?: boolean;
}

/**
 * SimulationResultTable
 *
 * Route-local table used by the simulation screen to render summary
 * statistics (mean, std and confidence intervals) for each time variable.
 * Used in X case: tabular summary of simulation outputs per clinical metric.
 */
export function SimulationResultTable({
  result,
  disabled,
}: SimulationResultTableProps) {
  const keys = Object.keys(result) as (keyof typeof result)[];
  const statsRows = [
    { label: "Promedio", key: "mean" as const },
    { label: "Desviación Estándar", key: "std" as const },
    { label: "Límite Inf.", key: "ci_lower" as const },
    { label: "Límite Sup.", key: "ci_upper" as const },
  ];

  const columns = [
    {
      key: "statistic",
      label: "Estadístico",
      align: "left" as const,
      headerClassName: "pr-4 text-zinc-500",
      cellClassName: "pr-4 text-zinc-500",
    },
    ...keys.map((k) => ({
      key: k,
      label: TIME_VARIABLE_LABELS[k],
      align: "right" as const,
      headerClassName: "px-3 text-zinc-700",
      cellClassName: "px-3 tabular-nums",
    })),
  ];

  const rows = statsRows.map(({ label, key }) => {
    const row: Record<string, string> = { statistic: label };

    keys.forEach((k) => {
      row[k] = result[k][key].toFixed(2);
    });

    return row;
  });

  return (
    <div {...dataDisabledProps(disabled)}>
      <DataTable
        ariaLabel="Resultados de simulación"
        columns={columns}
        rows={rows}
        wrapperClassName="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
        tableClassName="min-w-[760px]"
        headerRowClassName="bg-slate-100/80"
        bodyRowClassName={(_, index) =>
          index === rows.length - 1
            ? "last:border-0 bg-white"
            : index % 2 === 0
              ? "bg-white"
              : "bg-slate-50/70"
        }
      />
    </div>
  );
}
