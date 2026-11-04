import type React from "react";
import { FiRefreshCw } from "react-icons/fi";
import { Button } from "@/components/atoms/Buttons";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";

interface SimulationPatientSectionProps {
  patientId: string;
  setPatientId: (value: string) => void;
  handleNewPatient: () => void;
}

/**
 * Handles patient identifier display, editing, and regeneration actions.
 * Used in X case: patient context header in simulation workflow.
 */
export function SimulationPatientSection({
  patientId,
  setPatientId,
  handleNewPatient,
}: SimulationPatientSectionProps) {
  return (
    <section className="flex flex-col gap-4 p-5 bg-white border rounded-2xl border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="min-w-0 text-(length:--font-size-sm) font-semibold uppercase tracking-widest text-slate-700">
          {"Datos del Paciente"}
        </h2>
        <span className="font-mono text-(length:--font-size-xs) uppercase text-slate-700">
          ID: {patientId}
        </span>
      </div>

      <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-end">
        <div className="flex w-full flex-col gap-1.5 md:w-1/3">
          <Label htmlFor="patient-id">{"ID Paciente"}</Label>
          <Input
            id="patient-id"
            value={patientId}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setPatientId(event.target.value)
            }
            fullWidth
            aria-label="ID del paciente"
          />
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleNewPatient}
          aria-label="Generar nuevo ID de paciente"
          className="w-full md:w-auto"
        >
          <FiRefreshCw className="size-4" />
          {"Nuevo paciente"}
        </Button>
      </div>
    </section>
  );
}
