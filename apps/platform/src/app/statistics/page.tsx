"use client";

import { useState } from "react";
import StatisticsRecordsPage from "@/app/records/statistics/page";
import {
  EXPERIMENT_VARIABLE_LABELS,
  runWilcoxonTest,
  runFriedmanTest,
  type StatisticalTestResult,
} from "@/lib/statistics";
import { Button } from "@/components/atoms/Buttons";
import { Dialog } from "@/components/molecules/Dialog";

import { StatisticsPageHeader } from "./components/StatisticsPageHeader";
import { WilcoxonSection, FriedmanSection } from "./components/StatTestSection";
import { readCSVFile, extractNumericColumn, adjustArraySizes } from "./helpers";

function formatAvailableColumns(csv: Record<string, string[]>): string {
  const columns = Object.keys(csv).filter((column) => column.trim().length > 0);
  return columns.length > 0 ? columns.join(", ") : "No se detectaron columnas";
}

export default function StatisticsPage() {
  const [openTest, setOpenTest] = useState<"wilcoxon" | "friedman" | null>(
    null,
  );

  const defaultColumn = EXPERIMENT_VARIABLE_LABELS[0];

  const [wxFile1, setWxFile1] = useState<File | null>(null);
  const [wxFile2, setWxFile2] = useState<File | null>(null);
  const [wxColumn, setWxColumn] = useState<string>(defaultColumn);
  const [wxLoading, setWxLoading] = useState(false);
  const [wxResult, setWxResult] = useState<StatisticalTestResult | null>(null);
  const [wxError, setWxError] = useState<string | null>(null);
  const [wxWarning, setWxWarning] = useState<string | null>(null);

  const [fmFiles, setFmFiles] = useState<File[]>([]);
  const [fmColumn, setFmColumn] = useState<string>(defaultColumn);
  const [fmLoading, setFmLoading] = useState(false);
  const [fmResult, setFmResult] = useState<StatisticalTestResult | null>(null);
  const [fmError, setFmError] = useState<string | null>(null);
  const [fmWarning, setFmWarning] = useState<string | null>(null);

  async function handleRunWilcoxon(): Promise<void> {
    setWxError(null);
    setWxWarning(null);
    setWxResult(null);

    if (!wxFile1 || !wxFile2) {
      setWxError(
        "Debe proporcionar dos muestras con datos para realizar el test de Wilcoxon.",
      );
      return;
    }

    setWxLoading(true);
    try {
      const [csv1, csv2] = await Promise.all([
        readCSVFile(wxFile1),
        readCSVFile(wxFile2),
      ]);

      const col1 = extractNumericColumn(csv1, wxColumn);
      const col2 = extractNumericColumn(csv2, wxColumn);

      if (col1.length === 0 || col2.length === 0) {
        const missingFileName = col1.length === 0 ? wxFile1.name : wxFile2.name;
        const missingFileColumns =
          col1.length === 0
            ? formatAvailableColumns(csv1)
            : formatAvailableColumns(csv2);

        setWxError(
          `La columna "${wxColumn}" no existe en "${missingFileName}". Columnas detectadas: ${missingFileColumns}.`,
        );
        return;
      }

      let x = col1;
      let y = col2;

      if (col1.length !== col2.length) {
        const { adjusted, minSize } = adjustArraySizes([col1, col2]);
        x = adjusted[0];
        y = adjusted[1];
        setWxWarning(
          `Para realizar correctamente la prueba se ajustaron los tamaños de muestra. Todas las columnas quedaron con el mismo número de filas. (${minSize} filas)`,
        );
      }

      const result = await runWilcoxonTest({ sample_a: x, sample_b: y });
      setWxResult(result);
    } catch (err: unknown) {
      setWxError(
        err instanceof Error
          ? err.message
          : "Error al procesar los archivos CSV.",
      );
    } finally {
      setWxLoading(false);
    }
  }

  async function handleRunFriedman(): Promise<void> {
    setFmError(null);
    setFmWarning(null);
    setFmResult(null);

    if (fmFiles.length < 3) {
      setFmError(
        "Debe proporcionar al menos 3 muestras para realizar el test de Friedman.",
      );
      return;
    }

    setFmLoading(true);
    try {
      const csvData = await Promise.all(fmFiles.map(readCSVFile));
      const columns = csvData.map((csv) => extractNumericColumn(csv, fmColumn));

      const validColumns = columns.filter((col) => col.length > 0);
      if (validColumns.length < 3) {
        const availableColumns = Array.from(
          new Set(csvData.flatMap((csv) => Object.keys(csv))),
        );
        setFmError(
          `La columna "${fmColumn}" no se encontró en suficientes archivos CSV. Columnas detectadas: ${
            availableColumns.length > 0
              ? availableColumns.join(", ")
              : "No se detectaron columnas"
          }.`,
        );
        return;
      }

      const { adjusted, minSize } = adjustArraySizes(validColumns);

      const originalMin = Math.min(...validColumns.map((c) => c.length));
      if (originalMin !== minSize || validColumns.length < columns.length) {
        setFmWarning(
          `Para realizar correctamente la prueba se ajustaron los tamaños de muestra. Todas las columnas quedaron con el mismo número de filas. (${minSize} filas)`,
        );
      }

      const groups: Record<string, number[]> = {};
      adjusted.forEach((arr, i) => {
        groups[`group_${String.fromCharCode(97 + i)}`] = arr;
      });
      const result = await runFriedmanTest({ groups });
      setFmResult(result);
    } catch (err: unknown) {
      setFmError(
        err instanceof Error
          ? err.message
          : "Error al procesar los archivos CSV.",
      );
    } finally {
      setFmLoading(false);
    }
  }

  return (
    <>
      <StatisticsPageHeader />

      <StatisticsRecordsPage />

      <section
        aria-labelledby="statistics-execution-heading"
        className="mt-10 border-t border-slate-200 pt-8"
      >
        <h2
          id="statistics-execution-heading"
          className="mb-2 text-xl font-semibold text-slate-900"
        >
          Realizar una prueba estadística
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col items-start gap-3 border border-slate-200 bg-white p-4">
            <div>
              <h3 className="font-semibold text-slate-900">Wilcoxon</h3>
              <p className="mt-1 text-sm text-slate-600">
                Compara dos muestras relacionadas.
              </p>
            </div>
            <Button variant="outline" onClick={() => setOpenTest("wilcoxon")}>
              Nueva prueba de Wilcoxon
            </Button>
          </div>
          <div className="flex flex-col items-start gap-3 border border-slate-200 bg-white p-4">
            <div>
              <h3 className="font-semibold text-slate-900">Friedman</h3>
              <p className="mt-1 text-sm text-slate-600">
                Compara tres o más muestras relacionadas.
              </p>
            </div>
            <Button variant="outline" onClick={() => setOpenTest("friedman")}>
              Nueva prueba de Friedman
            </Button>
          </div>
        </div>

        <Dialog
          open={openTest !== null}
          onClose={() => setOpenTest(null)}
          title={
            openTest === "wilcoxon"
              ? "Prueba de Wilcoxon"
              : "Prueba de Friedman"
          }
          description="Completa el formulario para ejecutar y guardar el resultado."
          busy={wxLoading || fmLoading}
        >
          {openTest === "wilcoxon" ? (
            <WilcoxonSection
              file1={wxFile1}
              file2={wxFile2}
              selectedColumn={wxColumn}
              loading={wxLoading}
              result={wxResult}
              error={wxError}
              warning={wxWarning}
              onFile1Change={setWxFile1}
              onFile2Change={setWxFile2}
              onColumnChange={setWxColumn}
              onRun={handleRunWilcoxon}
              runLabel="Realizar prueba de Wilcoxon"
              uploadLabel1="Experimento 1 (CSV)"
              uploadLabel2="Experimento 2 (CSV)"
            />
          ) : openTest === "friedman" ? (
            <FriedmanSection
              files={fmFiles}
              selectedColumn={fmColumn}
              loading={fmLoading}
              result={fmResult}
              error={fmError}
              warning={fmWarning}
              onFilesChange={setFmFiles}
              onColumnChange={setFmColumn}
              onRun={handleRunFriedman}
              runLabel="Realizar prueba de Friedman"
              uploadLabel="Experimentos (CSV)"
            />
          ) : null}
        </Dialog>
      </section>
    </>
  );
}
