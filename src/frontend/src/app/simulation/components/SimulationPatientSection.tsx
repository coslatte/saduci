import type React from "react";
import { FiRefreshCw } from "react-icons/fi";
import { Button } from "@/components/atoms/Buttons";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";

interface SimulationPatientSectionProps {
  patientId: string;
  setPatientId: (value: string) => void;
  handleNewPatient: () => void;
  loading: boolean;
}

// inline classes per styling guideline

/**
 * Handles patient identifier display, editing, and regeneration actions.
 * Used in X case: patient context header in simulation workflow.
 */
export function SimulationPatientSection({
  patientId,
  setPatientId,
  handleNewPatient,
  loading,
}: SimulationPatientSectionProps) {
  return (
    <section className="flex flex-col gap-4 p-5 bg-white border rounded-2xl border-slate-200">
      <div className="flex items-center justify-between">
        <h2 className="text-(length:--font-size-sm) font-semibold uppercase tracking-widest text-slate-700">
          {"Datos del Paciente"}
        </h2>
        <span className="font-mono text-(length:--font-size-xs) uppercase text-slate-700">
          ID: {patientId}
        </span>
      </div>

      <p className="text-sm text-slate-600">
        El identificador etiqueta las exportaciones. Nuevo caso restablece los
        campos y conserva el historial de esta sesión.
      </p>
      <div className="flex flex-col items-end gap-4 md:flex-row">
        <div className="w-full md:w-1/3 flex flex-col gap-1.5">
          <Label htmlFor="patient-id">{"ID Paciente"}</Label>
          <Input
            id="patient-id"
            required
            maxLength={80}
            value={patientId}
            disabled={loading}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setPatientId(event.target.value)
            }
            fullWidth
            aria-label="ID del paciente"
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleNewPatient}
          disabled={loading}
          aria-label="Iniciar un nuevo caso con valores predeterminados"
        >
          <FiRefreshCw className="size-4" />
          {"Nuevo caso"}
        </Button>
      </div>
    </section>
  );
}
