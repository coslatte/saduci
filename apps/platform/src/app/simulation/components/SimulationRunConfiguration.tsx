import { FiClock, FiPlay, FiXCircle } from "react-icons/fi";
import { Button } from "@/components/atoms/Buttons";
import { Alert } from "@/components/molecules/Alert";
import { NumberInputField } from "@/components/molecules/NumberInputField";
import { RunProgress } from "@/components/molecules/RunProgress";
import { SIMULATION_LOADING_PHASES } from "@/constants/loading";
import { useProgressiveStatus } from "@/hooks/useProgressiveStatus";

import { SIMULATION_LIMITS } from "@/lib/simulation";

interface SimulationRunConfigurationProps {
  simRuns: number;
  setSimRuns: (value: number) => void;
  loading?: boolean;
  onSimulate: () => void;
  onCancel: () => void;
  showLongRunWarning: boolean;
  estimatedSeconds: number;
  elapsedSeconds: number;
  estimatedProgressPercent: number;
  cancelOnCooldown: boolean;
  cancelCooldownSeconds: number;
}

/**
 * Captures run count configuration and triggers simulation execution.
 * Used in X case: final action panel before starting a simulation batch.
 */
export function SimulationRunConfiguration({
  simRuns,
  setSimRuns,
  loading = false,
  onSimulate,
  onCancel,
  showLongRunWarning,
  estimatedSeconds,
  elapsedSeconds,
  estimatedProgressPercent,
  cancelOnCooldown,
  cancelCooldownSeconds,
}: SimulationRunConfigurationProps) {
  const { message: loadingMessage } = useProgressiveStatus(loading, {
    phases: SIMULATION_LOADING_PHASES,
  });

  return (
    <section className="flex flex-col gap-6 p-5 bg-white border rounded-2xl border-slate-200">
      <h2 className="text-(length:--font-size-sm) font-semibold uppercase tracking-widest text-slate-700">
        {"Configuración de Simulación"}
      </h2>

      <div className="flex flex-col items-center justify-between gap-6">
        <div className="w-full md:w-1/3 flex flex-col gap-1.5">
          <NumberInputField
            id="sim-runs"
            label={"Corridas de la Simulación"}
            min={SIMULATION_LIMITS.simRuns.min}
            max={SIMULATION_LIMITS.simRuns.max}
            step={SIMULATION_LIMITS.simRuns.step}
            value={simRuns}
            onChange={setSimRuns}
            help={
              "Cantidad de corridas de la simulación. Un número mayor mejora la precisión pero incrementa el tiempo de procesamiento. Se recomienda 200 corridas como punto de partida."
            }
            labelClassName="text-center md:text-left"
            fullWidth
          />
          <p className="text-(length:--font-size-xs) text-slate-700 text-center md:text-left">
            {`Mínimo ${SIMULATION_LIMITS.simRuns.min} — máximo ${SIMULATION_LIMITS.simRuns.max.toLocaleString()} iteraciones`}
          </p>
        </div>

        {showLongRunWarning && (
          <Alert
            variant="warning"
            title={"Simulación extensa detectada"}
            className="w-full md:w-1/3"
          >
            {
              "Más de 10,000 iteraciones pueden tardar varios minutos. La simulación continuará hasta completar el proceso."
            }
          </Alert>
        )}

        {loading && (
          <RunProgress
            title="Progreso de simulación"
            message={loadingMessage}
            elapsedSeconds={elapsedSeconds}
            estimatedSeconds={estimatedSeconds}
            progressPercent={estimatedProgressPercent}
            className="w-full md:w-1/3"
          />
        )}

        <div className="flex w-full flex-col gap-2 md:w-1/3">
          <Button
            onClick={onSimulate}
            loading={loading}
            size="lg"
            aria-label="Realizar simulación"
            className="w-full"
            variant="primary"
          >
            <FiPlay className="size-4" />
            {"Realizar Simulación"}
          </Button>
          {loading && (
            <Button
              onClick={onCancel}
              size="lg"
              aria-label={"Cancelar simulación"}
              className="w-full"
              variant="danger"
              disabled={cancelOnCooldown}
            >
              {cancelOnCooldown ? (
                <FiClock className="size-4" />
              ) : (
                <FiXCircle className="size-4" />
              )}
              {cancelOnCooldown
                ? `Enfriamiento activo: ${cancelCooldownSeconds}s`
                : "Cancelar simulación"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
