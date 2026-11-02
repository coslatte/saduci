import { Alert } from "@/components/molecules/Alert";
import { DataTable } from "@/components/molecules/DataTable";
import type { StatisticalTestResult } from "@/lib/statistics";

interface StatisticsResultSectionProps {
  result: StatisticalTestResult | null;
  error: string | null;
  warning: string | null;
}

function StatisticsResultTable({ result }: { result: StatisticalTestResult }) {
  const columns = [
    {
      key: "metric",
      label: "Métrica",
      align: "left" as const,
      headerClassName:
        "pr-4 text-(length:--font-size-sm) text-zinc-500 font-medium",
      cellClassName:
        "pr-4 text-left text-(length:--font-size-sm) font-medium text-zinc-500",
    },
    {
      key: "value",
      label: "Valor",
      align: "right" as const,
      headerClassName:
        "pl-4 text-(length:--font-size-sm) text-zinc-700 font-medium",
      cellClassName:
        "pl-4 text-right text-(length:--font-size-sm) font-semibold tabular-nums text-zinc-900",
    },
  ];

  const rows = [
    {
      metric: "Estadístico",
      value: result.statistic.toFixed(4),
    },
    {
      metric: "Valor de P",
      value: result.p_value.toFixed(4),
    },
  ];

  return (
    <DataTable
      ariaLabel="Resultados"
      columns={columns}
      rows={rows}
      bodyRowClassName={(_, index) => (index === 0 ? "" : "last:border-0")}
    />
  );
}

/**
 * Shows statistical outcomes along with warning and error feedback blocks.
 * Used in X case: displaying computed Wilcoxon or Friedman test results.
 */
export function StatisticsResultSection({
  result,
  error,
  warning,
}: StatisticsResultSectionProps) {
  return (
    <>
      {warning && <Alert variant="warning">{warning}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      {result && (
        <section className="flex flex-col gap-4 border-t border-slate-100 pt-6">
          <h3 className="border-b border-slate-200 pb-3 text-(length:--font-size-base) font-semibold text-slate-800">
            Resultados
          </h3>
          <div className="flex flex-col gap-4">
            <StatisticsResultTable result={result} />
            <div className="flex flex-col gap-1 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-(length:--font-size-sm) text-zinc-600">
              <p>
                **Statistic**: Indica cuánto difieren los datos entre sí
                basándose en el orden de las diferencias; un valor más pequeño
                sugiere mayores diferencias entre los grupos comparados.
              </p>
              <p>
                **Valor de P**: Indica qué tan probable es que las diferencias
                observadas se deban al azar; si es menor a 0.05, es probable que
                las diferencias sean estadísticamente significativas.
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
