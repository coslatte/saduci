import type { SimulationResponse } from "@/lib/simulation";
import { FiActivity, FiHome, FiLogIn, FiLogOut, FiWind } from "react-icons/fi";
import type { IconType } from "react-icons";

type SimulationTimes = SimulationResponse["simulation"];

const VENTILATION_PHASES = [
  { key: "pre_vam", label: "Antes de VAM", icon: FiLogIn },
  { key: "vam", label: "Ventilación mecánica", icon: FiWind },
  { key: "post_vam", label: "Después de VAM", icon: FiActivity },
] as const;

const ICU_PHASES = [
  { key: "uci", label: "Estadía en UCI", icon: FiHome },
  { key: "post_uci", label: "Después de UCI", icon: FiLogOut },
] as const;

const TRACK_ACCENT = {
  border: "border-teal-200",
  icon: "bg-teal-100 text-teal-800",
  line: "bg-teal-600",
  text: "text-teal-800",
} as const;

function formatHours(value: number): string {
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: 2 })} h`;
}

function PhaseTrack({
  title,
  phases,
  times,
}: {
  title: string;
  phases: readonly {
    key: keyof SimulationTimes;
    label: string;
    icon: IconType;
  }[];
  times: SimulationTimes;
}) {
  const maxMean = Math.max(...phases.map(({ key }) => times[key].mean), 0);

  return (
    <div className={`rounded-xl border bg-white p-4 ${TRACK_ACCENT.border}`}>
      <div className="mb-4 flex items-center gap-2">
        <span className={`size-2 rounded-full ${TRACK_ACCENT.line}`} />
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <ol className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
        {phases.map(({ key, label, icon: Icon }, index) => {
          const mean = Math.max(0, times[key].mean);
          const relativeWidth = maxMean > 0 ? (mean / maxMean) * 100 : 0;

          return (
            <li key={key} className="flex min-w-0 flex-1 items-center sm:pr-3">
              <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full ${TRACK_ACCENT.icon}`}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="text-sm font-medium leading-snug text-slate-700">
                      {label}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-sm font-bold tabular-nums text-slate-900 ring-1 ring-slate-200">
                    {formatHours(mean)}
                  </span>
                </div>
                <div className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <span>Tiempo promedio</span>
                  <span className={TRACK_ACCENT.text}>
                    {relativeWidth.toFixed(0)}% de esta ruta
                  </span>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-slate-200"
                  role="img"
                  aria-label={`${label}: ${formatHours(mean)}, ${relativeWidth.toFixed(0)}% respecto a la fase más larga de esta ruta`}
                >
                  <div
                    className={`h-full rounded-full ${TRACK_ACCENT.line}`}
                    style={{ width: `${relativeWidth}%` }}
                  />
                </div>
              </div>
              {index < phases.length - 1 && (
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center text-lg font-semibold text-slate-400 max-sm:rotate-90"
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function SimulationFlowDiagram({ times }: { times: SimulationTimes }) {
  return (
    <section
      aria-labelledby="simulation-flow-title"
      className="w-full border border-slate-300 bg-white p-3 sm:p-4"
    >
      <div className="mb-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <FiActivity aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h2
              id="simulation-flow-title"
              className="text-base font-semibold text-slate-900"
            >
              Recorrido del paciente
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Sigue las etapas y compara el tiempo promedio de cada una.
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-5">
        <PhaseTrack
          title="Fases de ventilación mecánica"
          phases={VENTILATION_PHASES}
          times={times}
        />
        <PhaseTrack
          title="Estadía del paciente"
          phases={ICU_PHASES}
          times={times}
        />
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Las filas muestran indicadores separados de la simulación; sus tiempos
        no se suman entre sí.
      </p>
    </section>
  );
}
