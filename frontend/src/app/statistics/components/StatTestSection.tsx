"use client";

import { Button } from "@/components/atoms/Buttons";
import AccessibleSelect from "@/components/atoms/AccessibleSelect";
import { Label } from "@/components/atoms/Label";
import { EXPERIMENT_VARIABLE_LABELS } from "@/lib/statistics";
import type { StatisticalTestResult } from "@/lib/statistics";
import { StatisticsFileDropzone } from "./StatisticsFileDropzone";
import { StatisticsResultSection } from "./StatisticsResultSection";

export interface WilcoxonSectionProps {
  file1: File | null;
  file2: File | null;
  selectedColumn: string;
  loading: boolean;
  result: StatisticalTestResult | null;
  error: string | null;
  warning: string | null;
  onFile1Change: (file: File | null) => void;
  onFile2Change: (file: File | null) => void;
  onColumnChange: (col: string) => void;
  onRun: () => void;
  runLabel: string;
  uploadLabel1: string;
  uploadLabel2: string;
}

/**
 * Captures two-sample inputs and runs the Wilcoxon test workflow.
 * Used in X case: non-parametric paired comparison in statistics module.
 */
export function WilcoxonSection({
  file1,
  file2,
  selectedColumn,
  loading,
  result,
  error,
  warning,
  onFile1Change,
  onFile2Change,
  onColumnChange,
  onRun,
  runLabel,
  uploadLabel1,
  uploadLabel2,
}: WilcoxonSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 pb-6 border-b border-slate-100">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatisticsFileDropzone
              label={uploadLabel1}
              files={file1 ? [file1] : []}
              inputId="wilcoxon-file-1"
              onChange={(files) => onFile1Change(files[0] ?? null)}
            />
            <StatisticsFileDropzone
              label={uploadLabel2}
              files={file2 ? [file2] : []}
              inputId="wilcoxon-file-2"
              onChange={(files) => onFile2Change(files[0] ?? null)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wilcoxon-col-select">
              Seleccione una columna para comparar
            </Label>
            <AccessibleSelect
              id="wilcoxon-col-select"
              value={selectedColumn}
              fullWidth
              onChange={(v) => onColumnChange(String(v))}
              options={EXPERIMENT_VARIABLE_LABELS.map((label) => ({
                value: label,
                label,
              }))}
            />
          </div>

          {file1 && file2 && (
            <details className="text-(length:--font-size-sm) text-zinc-500">
              <summary className="font-medium cursor-pointer text-zinc-700">
                Vista previa
              </summary>
              <ul className="mt-2 list-disc list-inside">
                <li>Experimento 1: {file1.name}</li>
                <li>Experimento 2: {file2.name}</li>
              </ul>
            </details>
          )}
        </div>
      </div>

      <Button
        variant="glass"
        fullWidth
        onClick={onRun}
        disabled={loading}
        aria-label={runLabel}
      >
        {loading ? "Ejecutando..." : runLabel}
      </Button>

      <StatisticsResultSection
        result={result}
        error={error}
        warning={warning}
      />
    </div>
  );
}

export interface FriedmanSectionProps {
  files: File[];
  selectedColumn: string;
  loading: boolean;
  result: StatisticalTestResult | null;
  error: string | null;
  warning: string | null;
  onFilesChange: (files: File[]) => void;
  onColumnChange: (col: string) => void;
  onRun: () => void;
  runLabel: string;
  uploadLabel: string;
}

/**
 * Collects multi-experiment inputs and runs the Friedman test workflow.
 * Used in X case: repeated-measures comparison across three or more samples.
 */
export function FriedmanSection({
  files,
  selectedColumn,
  loading,
  result,
  error,
  warning,
  onFilesChange,
  onColumnChange,
  onRun,
  runLabel,
  uploadLabel,
}: FriedmanSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 pb-6 border-b border-slate-100">
        <div className="flex flex-col gap-4">
          <StatisticsFileDropzone
            label={uploadLabel}
            files={files}
            inputId="friedman-files"
            multiple
            onChange={onFilesChange}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="friedman-col-select">
              Seleccione una columna para comparar
            </Label>
            <AccessibleSelect
              id="friedman-col-select"
              value={selectedColumn}
              fullWidth
              onChange={(v) => onColumnChange(String(v))}
              options={EXPERIMENT_VARIABLE_LABELS.map((label) => ({
                value: label,
                label,
              }))}
            />
          </div>

          {files.length > 0 && (
            <details className="text-(length:--font-size-sm) text-zinc-500">
              <summary className="font-medium cursor-pointer text-zinc-700">
                Vista previa
              </summary>
              <ul className="mt-2 list-disc list-inside">
                {files.map((f, idx) => (
                  <li key={idx}>
                    Experimento {idx + 1}: {f.name}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>

      <Button
        variant="glass"
        fullWidth
        onClick={onRun}
        disabled={loading}
        aria-label={runLabel}
      >
        {loading ? "Ejecutando..." : runLabel}
      </Button>

      <StatisticsResultSection
        result={result}
        error={error}
        warning={warning}
      />
    </div>
  );
}
