"use client";

import { useState } from "react";
import type * as React from "react";
import { Button } from "@/components/atoms/Buttons";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Select } from "@/components/atoms/Select";
import { Alert } from "@/components/molecules/Alert";
import { Card } from "@/components/molecules/Card";
import type { StatisticalTestType } from "@/lib/recordsMockData";
import type { StatisticsRecordInput } from "@/lib/recordsApi";

export interface StatisticsFormValues {
  testType: StatisticalTestType;
  variable: string;
  statistic: number;
  pValue: number;
  interpretation: string;
}

interface StatisticsRecordFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<StatisticsFormValues>;
  submitting: boolean;
  error: string | null;
  onSubmit: (values: StatisticsRecordInput) => void;
  onCancel: () => void;
}

const DEFAULT_VALUES: StatisticsFormValues = {
  testType: "wilcoxon",
  variable: "",
  statistic: 0,
  pValue: 0,
  interpretation: "",
};

/**
 * Inline form used to create or edit a persisted statistical test result.
 */
export function StatisticsRecordForm({
  mode,
  initialValues,
  submitting,
  error,
  onSubmit,
  onCancel,
}: StatisticsRecordFormProps) {
  const [values, setValues] = useState<StatisticsFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      testType: values.testType,
      variable: values.variable.trim(),
      statistic: values.statistic,
      pValue: values.pValue,
      interpretation: values.interpretation.trim() || undefined,
    });
  }

  return (
    <Card className="mb-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="font-semibold text-slate-800">
          {mode === "create" ? "Nuevo resultado" : "Editar resultado"}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stat-type">Prueba</Label>
            <Select
              id="stat-type"
              value={values.testType}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                setValues({
                  ...values,
                  testType: event.target.value as StatisticalTestType,
                })
              }
              fullWidth
            >
              <option value="wilcoxon">Wilcoxon</option>
              <option value="friedman">Friedman</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stat-variable">Variable</Label>
            <Input
              id="stat-variable"
              value={values.variable}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setValues({ ...values, variable: event.target.value })
              }
              placeholder="Estancia UCI"
              fullWidth
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stat-statistic">Estadístico</Label>
            <Input
              id="stat-statistic"
              type="number"
              step={0.0001}
              value={values.statistic}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setValues({ ...values, statistic: Number(event.target.value) })
              }
              fullWidth
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stat-pvalue">P</Label>
            <Input
              id="stat-pvalue"
              type="number"
              min={0}
              max={1}
              step={0.0001}
              value={values.pValue}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setValues({ ...values, pValue: Number(event.target.value) })
              }
              fullWidth
              required
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="stat-interpretation">Interpretación</Label>
            <Input
              id="stat-interpretation"
              value={values.interpretation}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setValues({ ...values, interpretation: event.target.value })
              }
              placeholder="Interpretación clínica del resultado"
              fullWidth
            />
          </div>
        </div>

        {error && (
          <Alert variant="danger" title="Error">
            {error}
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            {mode === "create" ? "Crear" : "Guardar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
