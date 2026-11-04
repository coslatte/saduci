"use client";

import { useState } from "react";
import type * as React from "react";
import { Button } from "@/components/atoms/Buttons";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Select } from "@/components/atoms/Select";
import { Alert } from "@/components/molecules/Alert";
import { Card } from "@/components/molecules/Card";

export interface PredictionFormValues {
  patientId: string;
  age: number;
  severityScore: number;
  outcome: string;
  probability: number;
}

interface PredictionRecordFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<PredictionFormValues>;
  submitting: boolean;
  error: string | null;
  onSubmit: (values: PredictionFormValues) => void;
  onCancel: () => void;
}

const DEFAULT_VALUES: PredictionFormValues = {
  patientId: "",
  age: 50,
  severityScore: 5,
  outcome: "No fallece",
  probability: 0.5,
};

/**
 * Inline form used to create (model input) or edit (outcome/probability) a
 * prediction record from the records page.
 */
export function PredictionRecordForm({
  mode,
  initialValues,
  submitting,
  error,
  onSubmit,
  onCancel,
}: PredictionRecordFormProps) {
  const [values, setValues] = useState<PredictionFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ ...values, patientId: values.patientId.trim() });
  }

  return (
    <Card className="mb-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="font-semibold text-slate-800">
          {mode === "create" ? "Nueva predicción" : "Editar predicción"}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pred-patient">Paciente</Label>
            <Input
              id="pred-patient"
              value={values.patientId}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setValues({ ...values, patientId: event.target.value })
              }
              placeholder="PAC-000"
              fullWidth
              required
            />
          </div>

          {mode === "create" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pred-age">Edad</Label>
                <Input
                  id="pred-age"
                  type="number"
                  min={14}
                  max={100}
                  value={values.age}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setValues({ ...values, age: Number(event.target.value) })
                  }
                  fullWidth
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pred-severity">Gravedad</Label>
                <Input
                  id="pred-severity"
                  type="number"
                  min={0}
                  max={10}
                  value={values.severityScore}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setValues({
                      ...values,
                      severityScore: Number(event.target.value),
                    })
                  }
                  fullWidth
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pred-outcome">Resultado</Label>
                <Select
                  id="pred-outcome"
                  value={values.outcome}
                  onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                    setValues({ ...values, outcome: event.target.value })
                  }
                  fullWidth
                >
                  <option value="No fallece">No fallece</option>
                  <option value="Fallece">Fallece</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pred-probability">Probabilidad (0-1)</Label>
                <Input
                  id="pred-probability"
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={values.probability}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setValues({
                      ...values,
                      probability: Number(event.target.value),
                    })
                  }
                  fullWidth
                  required
                />
              </div>
            </>
          )}
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
