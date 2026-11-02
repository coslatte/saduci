import type React from "react";
import { NumberInputField } from "@/components/molecules/NumberInputField";
import { SIMULATION_LIMITS } from "@/lib/simulation";

interface SimulationMetricGroupsProps {
  age: number;
  apache: number;
  preutiStay: number;
  vamTime: number;
  utiStay: number;
  simPercent: number;
  setAge: (value: number) => void;
  setApache: (value: number) => void;
  setPreutiStay: (value: number) => void;
  setVamTime: (value: number) => void;
  setUtiStay: (value: number) => void;
  setSimPercent: (value: number) => void;
}

interface MetricSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Groups related simulation fields under a titled visual section.
 * Used in X case: composing demographics, scores, and ventilation blocks.
 */
function MetricSection({ title, children }: MetricSectionProps) {
  return (
    <section className="flex flex-col h-full gap-3 lg:px-6 lg:first:pl-0 lg:last:pr-0">
      <p className="text-(length:--font-size-sm) font-semibold uppercase tracking-widest text-slate-700">
        {title}
      </p>
      {children}
    </section>
  );
}

/**
 * Groups numeric simulation inputs by demographics, scores, and ventilation.
 * Used in X case: core metric entry area of the simulation form.
 */
export function SimulationMetricGroups({
  age,
  apache,
  preutiStay,
  vamTime,
  utiStay,
  simPercent,
  setAge,
  setApache,
  setPreutiStay,
  setVamTime,
  setUtiStay,
  setSimPercent,
}: SimulationMetricGroupsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-slate-200/80">
      <MetricSection title={"Demográficos & Tiempos"}>
        <NumberInputField
          id="age"
          label={"Edad"}
          min={SIMULATION_LIMITS.age.min}
          max={SIMULATION_LIMITS.age.max}
          value={age}
          onChange={setAge}
          help={
            "Edad del paciente en años cumplidos al momento de la evaluación clínica."
          }
        />
        <NumberInputField
          id="preuti-stay"
          label={"Tiempo en Pre-UCI (h)"}
          min={SIMULATION_LIMITS.preutiStay.min}
          max={SIMULATION_LIMITS.preutiStay.max}
          value={preutiStay}
          onChange={setPreutiStay}
          help={
            "Tiempo de estadía pre Unidad de Terapia Intensiva (UTI) antes de ingresar a la unidad, en horas."
          }
        />
      </MetricSection>

      <MetricSection title={"Puntajes Clínicos"}>
        <NumberInputField
          id="apache"
          label={"APACHE"}
          min={SIMULATION_LIMITS.apache.min}
          max={SIMULATION_LIMITS.apache.max}
          value={apache}
          onChange={setApache}
          help={
            "Valor del APACHE (Acute Physiology and Chronic Health Evaluation): puntaje clínico para cuidados intensivos que mide la gravedad del paciente crítico y estima su riesgo de mortalidad. Un riesgo bajo sería 0 y un riesgo alto sería 36."
          }
        />
        <NumberInputField
          id="sim-percent"
          label={"Porciento Tiempo UCI"}
          min={SIMULATION_LIMITS.simPercent.min}
          max={SIMULATION_LIMITS.simPercent.max}
          value={simPercent}
          onChange={setSimPercent}
          help={
            "Proporción de tiempo dentro de la estancia UCI que se espera antes de entrar en Ventilación."
          }
        />
      </MetricSection>

      <MetricSection title={"Ventilación Mecánica"}>
        <NumberInputField
          id="vam-time"
          label={"Tiempo en VA (h)"}
          min={SIMULATION_LIMITS.vamTime.min}
          max={SIMULATION_LIMITS.vamTime.max}
          value={vamTime}
          onChange={setVamTime}
          help={"Tiempo en Ventilación Asistida Mecánica (VAM) en horas."}
        />
        <NumberInputField
          id="uti-stay"
          label={"Tiempo en UCI (h)"}
          min={SIMULATION_LIMITS.utiStay.min}
          max={SIMULATION_LIMITS.utiStay.max}
          value={utiStay}
          onChange={setUtiStay}
          help={
            "Tiempo de estadía en Unidad de Terapia Intensiva (UTI) en horas."
          }
        />
      </MetricSection>
    </div>
  );
}
