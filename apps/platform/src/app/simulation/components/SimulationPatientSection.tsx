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
    <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">
            Identificación
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            Datos del paciente
          </h2>
        </div>
        <span className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs font-medium text-slate-600">
          ID: {patientId}
        </span>
      </div>

      <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-end">
        <div className="flex w-full flex-col gap-2 md:max-w-sm">
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
