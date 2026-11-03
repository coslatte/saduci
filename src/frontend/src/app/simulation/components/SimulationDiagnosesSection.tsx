import { Label } from "@/components/atoms/Label";

import { diagData, respInsufData, ventTypeData } from "../helpers";

interface SimulationDiagnosesSectionProps {
  diagIng1: number;
  setDiagIng1: (value: number) => void;
  diagIng2: number;
  setDiagIng2: (value: number) => void;
  diagIng3: number;
  setDiagIng3: (value: number) => void;
  diagIng4: number;
  setDiagIng4: (value: number) => void;
  diagEgreso2: number;
  setDiagEgreso2: (value: number) => void;
  respInsuf: number;
  setRespInsuf: (value: number) => void;
  ventType: number;
  setVentType: (value: number) => void;
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  help,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: Array<{ value: string; label: string }>;
  help: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-zinc-800">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-describedby={`${id}-help`}
        className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-primary-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p id={`${id}-help`} className="text-xs text-slate-500">
        {help}
      </p>
    </div>
  );
}

/**
 * Collects diagnosis and ventilation categorical variables for simulation.
 * Used in X case: selecting diagnosis codes before running patient simulation.
 */
export function SimulationDiagnosesSection({
  diagIng1,
  setDiagIng1,
  diagIng2,
  setDiagIng2,
  diagIng3,
  setDiagIng3,
  diagIng4,
  setDiagIng4,
  diagEgreso2,
  setDiagEgreso2,
  respInsuf,
  setRespInsuf,
  ventType,
  setVentType,
}: SimulationDiagnosesSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="mb-4 text-(length:--font-size-sm) font-semibold uppercase tracking-widest text-slate-700">
        {"Diagnósticos de Ingreso y Egreso"}
      </p>

      <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2 lg:grid-cols-2">
        <SelectField
          id="diag-ing-1"
          label="Diagnóstico principal de ingreso"
          value={diagIng1}
          onChange={setDiagIng1}
          options={diagData()}
          help={
            "Seleccione la categoría clínica correspondiente. Los diagnósticos adicionales son opcionales."
          }
        />
        <SelectField
          id="diag-ing-2"
          label="Diagnóstico adicional 1 (opcional)"
          value={diagIng2}
          onChange={setDiagIng2}
          options={diagData()}
          help={
            "Seleccione la categoría clínica correspondiente. Los diagnósticos adicionales son opcionales."
          }
        />
        <SelectField
          id="diag-ing-3"
          label="Diagnóstico adicional 2 (opcional)"
          value={diagIng3}
          onChange={setDiagIng3}
          options={diagData()}
          help={
            "Seleccione la categoría clínica correspondiente. Los diagnósticos adicionales son opcionales."
          }
        />
        <SelectField
          id="diag-ing-4"
          label="Diagnóstico adicional 3 (opcional)"
          value={diagIng4}
          onChange={setDiagIng4}
          options={diagData()}
          help={
            "Seleccione la categoría clínica correspondiente. Los diagnósticos adicionales son opcionales."
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SelectField
          id="resp-insuf"
          label={"Causa de insuficiencia respiratoria"}
          value={respInsuf}
          onChange={setRespInsuf}
          options={respInsufData()}
          help={
            "Clasificación del tipo de insuficiencia respiratoria presente en el paciente."
          }
        />
        <SelectField
          id="vent-type"
          label={"Ventilación Artificial"}
          value={ventType}
          onChange={setVentType}
          options={ventTypeData()}
          help={
            "Tipo de soporte de ventilación mecánica aplicado durante la atención del paciente."
          }
        />
        <SelectField
          id="diag-egreso-2"
          label={"Diagnóstico de egreso"}
          value={diagEgreso2}
          onChange={setDiagEgreso2}
          options={diagData()}
          help={
            "Diagnóstico clínico al egreso del paciente. Se usa para contextualizar la evolución y el desenlace."
          }
        />
      </div>
    </section>
  );
}
