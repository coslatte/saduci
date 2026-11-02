import AccessibleSelect from "@/components/atoms/AccessibleSelect";
import { Label } from "@/components/atoms/Label";
import { FormField } from "@/components/molecules/FormField";
import { Button } from "@/components/atoms/Buttons";
import { PREDICTION_LIMITS } from "@/lib/prediction";
import {
  PREDICTION_DIAG_EGR2_OPTIONS,
  PREDICTION_DIAG_ING1_OPTIONS,
  PREDICTION_DIAG_ING2_OPTIONS,
  type DiagnosisOption,
} from "@/lib/predictionDiagnoses";

interface PredictionFormProps {
  edad: number;
  setEdad: (v: number) => void;
  diagIng1: number;
  setDiagIng1: (v: number) => void;
  diagIng2: number;
  setDiagIng2: (v: number) => void;
  diagEgr2: number;
  setDiagEgr2: (v: number) => void;
  apache: number;
  setApache: (v: number) => void;
  tiempoVam: number;
  setTiempoVam: (v: number) => void;
  loading: boolean;
  onPredict: () => void;
}

interface DiagnosisSelectFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: DiagnosisOption[];
  help: string;
}

/**
 * Renders a labeled prediction diagnosis selector backed by numeric indices.
 *
 * Props:
 * - id: HTML identifier used to connect the label and the control.
 * - label: Visible field label.
 * - value: Currently selected numeric diagnosis index.
 * - onChange: Callback fired with the selected numeric index.
 * - options: Selectable index options shown to the user.
 * - help: Contextual help text displayed in the field helper button.
 *
 * Example:
 * - <DiagnosisSelectField id="pred-diag-ing1" label="Diag.Ing1" value={1} onChange={setDiagIng1} options={[]} help="..." />
 */
function DiagnosisSelectField({
  id,
  label,
  value,
  onChange,
  options,
  help,
}: DiagnosisSelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <AccessibleSelect
        id={id}
        value={value}
        onChange={(next) => onChange(Number(next))}
        options={options}
        fullWidth
        help={help}
      />
    </div>
  );
}

/**
 * Collects prediction input metrics and triggers the model request action.
 * Used in X case: patient data entry step for mortality prediction.
 */
export function PredictionForm({
  edad,
  setEdad,
  diagIng1,
  setDiagIng1,
  diagIng2,
  setDiagIng2,
  diagEgr2,
  setDiagEgr2,
  apache,
  setApache,
  tiempoVam,
  setTiempoVam,
  loading,
  onPredict,
}: PredictionFormProps) {
  const { edad: edadL, apache: apL, tiempoVam: tvL } = PREDICTION_LIMITS;

  return (
    <section
      aria-labelledby="prediction-patient-section-title"
      className="flex flex-col gap-5"
    >
      <h2
        id="prediction-patient-section-title"
        className="font-semibold text-zinc-800"
      >
        "Características del Paciente"
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField
          id="pred-edad"
          label="Edad"
          help={
            "Edad del paciente en años cumplidos al momento de la evaluación clínica."
          }
          inputProps={{
            type: "number",
            value: edad,
            min: edadL.min,
            max: edadL.max,
            step: 1,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setEdad(Number(e.target.value)),
          }}
        />
        <FormField
          id="pred-apache"
          label="APACHE II"
          help={
            "Valor del APACHE (Acute Physiology and Chronic Health Evaluation): puntaje clínico para cuidados intensivos que mide la gravedad del paciente crítico y estima su riesgo de mortalidad. Un riesgo bajo sería 0 y un riesgo alto sería 36."
          }
          inputProps={{
            type: "number",
            value: apache,
            min: apL.min,
            max: apL.max,
            step: 1,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setApache(Number(e.target.value)),
          }}
        />
        <FormField
          id="pred-tiempo-vam"
          label="TiempoVAM"
          help={"Tiempo en Ventilación Asistida Mecánica (VAM) en horas."}
          inputProps={{
            type: "number",
            value: tiempoVam,
            min: tvL.min,
            max: tvL.max,
            step: 1,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setTiempoVam(Number(e.target.value)),
          }}
        />
        <DiagnosisSelectField
          id="pred-diag-ing1"
          label="Diag.Ing1"
          help={
            "Diagnóstico principal de ingreso del paciente a la unidad. Seleccione la categoría clínica que mejor describe el estado inicial."
          }
          value={diagIng1}
          onChange={setDiagIng1}
          options={PREDICTION_DIAG_ING1_OPTIONS}
        />
        <DiagnosisSelectField
          id="pred-diag-ing2"
          label="Diag.Ing2"
          help={
            "Diagnóstico principal de ingreso del paciente a la unidad. Seleccione la categoría clínica que mejor describe el estado inicial."
          }
          value={diagIng2}
          onChange={setDiagIng2}
          options={PREDICTION_DIAG_ING2_OPTIONS}
        />
        <DiagnosisSelectField
          id="pred-diag-egr2"
          label="Diag.Egr2"
          help={
            "Diagnóstico principal de ingreso del paciente a la unidad. Seleccione la categoría clínica que mejor describe el estado inicial."
          }
          value={diagEgr2}
          onChange={setDiagEgr2}
          options={PREDICTION_DIAG_EGR2_OPTIONS}
        />
      </div>
      <div className="flex justify-end mt-5">
        <Button variant="glass" disabled={loading} onClick={onPredict}>
          {loading ? "Prediciendo..." : "Predecir"}
        </Button>
      </div>
    </section>
  );
}
