import { FiPlay, FiXCircle } from "react-icons/fi";
import { Button } from "@/components/atoms/Buttons";
import { NumberInputField } from "@/components/molecules/NumberInputField";
import { SIMULATION_LIMITS } from "@/lib/simulation";

interface SimulationRunConfigurationProps {
  simRuns: number;
  setSimRuns: (value: number) => void;
  loading?: boolean;
  onCancel: () => void;
  elapsedSeconds: number;
}

export function SimulationRunConfiguration({
  simRuns,
  setSimRuns,
  loading = false,
  onCancel,
  elapsedSeconds,
}: SimulationRunConfigurationProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 xl:sticky xl:top-6">
      <h2 className="font-semibold text-slate-900">Ejecutar escenario</h2>
      <NumberInputField
        id="sim-runs"
        label="Número de iteraciones"
        min={SIMULATION_LIMITS.simRuns.min}
        max={SIMULATION_LIMITS.simRuns.max}
        step={SIMULATION_LIMITS.simRuns.step}
        value={simRuns}
        onChange={setSimRuns}
        disabled={loading}
        help="Cada iteración repite el escenario. Empiece con 200; aumentar el número requiere más tiempo de procesamiento."
      />
      <p className="text-sm text-slate-600">
        Entre 50 y 100 000, en incrementos de 50.
      </p>
      {simRuns > 10000 && (
        <p className="text-sm text-amber-800">
          Esta ejecución puede tardar varios minutos. El tiempo máximo de espera
          es de 6 minutos.
        </p>
      )}
      {loading && (
        <div
          role="status"
          className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"
        >
          <p>Procesando escenario…</p>
          <p>Tiempo transcurrido: {elapsedSeconds} s</p>
          <p className="mt-2">
            El servidor no informa del porcentaje de avance.
          </p>
        </div>
      )}
      <Button type="submit" loading={loading} size="lg" className="w-full">
        <FiPlay aria-hidden className="size-4" /> Simular escenario
      </Button>
      {loading && (
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="w-full"
        >
          <FiXCircle aria-hidden className="size-4" /> Cancelar espera
        </Button>
      )}
      <p className="text-xs text-slate-500">
        Los resultados se conservan durante esta sesión de la página. Cancelar
        la espera no garantiza detener el cálculo en el servidor.
      </p>
    </section>
  );
}
