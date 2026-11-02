import AccessibleSelect from "@/components/atoms/AccessibleSelect";
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
      <AccessibleSelect
        id={id}
        value={String(value)}
        onChange={(nextValue) => onChange(Number(nextValue))}
        options={options}
        help={help}
        fullWidth
      />
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

      <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2 lg:grid-cols-4">
        <SelectField
          id="diag-ing-1"
          label={`Diag. Ingreso ${1}`}
          value={diagIng1}
          onChange={setDiagIng1}
          options={diagData()}
          help={
            "Diagnóstico principal de ingreso del paciente a la unidad. Seleccione la categoría clínica que mejor describe el estado inicial."
          }
        />
        <SelectField
          id="diag-ing-2"
          label={`Diag. Ingreso ${2}`}
          value={diagIng2}
          onChange={setDiagIng2}
          options={diagData()}
          help={
            "Diagnóstico principal de ingreso del paciente a la unidad. Seleccione la categoría clínica que mejor describe el estado inicial."
          }
        />
        <SelectField
          id="diag-ing-3"
          label={`Diag. Ingreso ${3}`}
          value={diagIng3}
          onChange={setDiagIng3}
          options={diagData()}
          help={
            "Diagnóstico principal de ingreso del paciente a la unidad. Seleccione la categoría clínica que mejor describe el estado inicial."
          }
        />
        <SelectField
          id="diag-ing-4"
          label={`Diag. Ingreso ${4}`}
          value={diagIng4}
          onChange={setDiagIng4}
          options={diagData()}
          help={
            "Diagnóstico principal de ingreso del paciente a la unidad. Seleccione la categoría clínica que mejor describe el estado inicial."
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SelectField
          id="resp-insuf"
          label={"Insuf. Respiratoria"}
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
          label={"Diagnóstico Egreso 2"}
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
