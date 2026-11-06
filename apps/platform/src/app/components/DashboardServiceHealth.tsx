"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/http";
import { Dialog } from "@/components/molecules/Dialog";

const services = [
  ["gateway", "Conexión principal"],
  ["users", "Usuarios"],
  ["patients", "Pacientes"],
  ["prediction", "Predicciones"],
  ["simulation", "Simulaciones y pruebas estadísticas"],
] as const;
type Status = "healthy" | "unhealthy" | "unreachable";
type ServiceKey = (typeof services)[number][0];
type Check = {
  checkedAt: string;
  status: Status;
  latencyMs: number | null;
};
type Health = Record<ServiceKey, Check>;
type CheckHistory = Record<ServiceKey, Check[]>;
type TimelineStatus = "off" | "congested" | "online";

const HISTORY_WINDOW_MS = 12 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 30 * 1000;
const MAX_CHECKS = Math.ceil(HISTORY_WINDOW_MS / POLL_INTERVAL_MS) + 3;
const CONGESTION_THRESHOLD_MS = 1000;
const HISTORY_STORAGE_KEY = "saduci:service-health-history:v1";

function emptyHistory(): CheckHistory {
  return {
    gateway: [],
    users: [],
    patients: [],
    prediction: [],
    simulation: [],
  };
}

function toStatus(value: unknown): Status {
  return value === "healthy" || value === "unhealthy" || value === "unreachable"
    ? value
    : "unreachable";
}

function formatLatency(value: number | null): string {
  return value === null ? "Sin dato" : `${value.toLocaleString("es-ES")} ms`;
}

function toTimelineStatus(check: Check): TimelineStatus {
  if (check.status === "unreachable") return "off";
  if (
    check.status === "unhealthy" ||
    (check.latencyMs !== null && check.latencyMs >= CONGESTION_THRESHOLD_MS)
  ) {
    return "congested";
  }
  return "online";
}

function statusLabel(status: TimelineStatus | null): string {
  if (status === "online") return "Encendido (OK)";
  if (status === "congested") return "Congestionado";
  if (status === "off") return "Apagado";
  return "Sin datos";
}

function statusColor(status: TimelineStatus): string {
  if (status === "online") return "bg-emerald-500";
  if (status === "congested") return "bg-amber-500";
  return "bg-slate-500";
}

function statusTextColor(status: TimelineStatus): string {
  if (status === "online") return "text-emerald-700";
  if (status === "congested") return "text-amber-700";
  return "text-slate-700";
}

function readStoredHistory(): CheckHistory {
  const result = emptyHistory();
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(HISTORY_STORAGE_KEY) ?? "null",
    );
    if (typeof stored !== "object" || stored === null) return result;
    const data = stored as Record<string, unknown>;
    const oldestAllowed = Date.now() - HISTORY_WINDOW_MS;

    for (const [key] of services) {
      const entries = data[key];
      if (!Array.isArray(entries)) continue;
      result[key] = entries
        .filter((entry): entry is Check => {
          if (typeof entry !== "object" || entry === null) return false;
          const check = entry as Record<string, unknown>;
          return (
            typeof check.checkedAt === "string" &&
            Number.isFinite(Date.parse(check.checkedAt)) &&
            Date.parse(check.checkedAt) >= oldestAllowed &&
            (check.status === "healthy" ||
              check.status === "unhealthy" ||
              check.status === "unreachable") &&
            (check.latencyMs === null ||
              (typeof check.latencyMs === "number" &&
                Number.isFinite(check.latencyMs)))
          );
        })
        .slice(-MAX_CHECKS);
    }
  } catch {
    return emptyHistory();
  }
  return result;
}

function trimHistory(checks: Check[], now: number): Check[] {
  const oldestAllowed = now - HISTORY_WINDOW_MS;
  return checks
    .filter((check) => Date.parse(check.checkedAt) >= oldestAllowed)
    .slice(-MAX_CHECKS);
}

function timelineSegments(checks: Check[], endTime: number) {
  const startTime = endTime - HISTORY_WINDOW_MS;
  const sorted = [...checks].sort(
    (a, b) => Date.parse(a.checkedAt) - Date.parse(b.checkedAt),
  );
  const segments: {
    left: number;
    width: number;
    status: TimelineStatus;
    key: string;
  }[] = [];

  sorted.forEach((check, index) => {
    const checkedAt = Date.parse(check.checkedAt);
    const nextCheckAt = sorted[index + 1]
      ? Date.parse(sorted[index + 1].checkedAt)
      : endTime;
    const intervalStart = Math.max(checkedAt, startTime);
    const intervalEnd = Math.min(
      nextCheckAt,
      checkedAt + POLL_INTERVAL_MS * 2,
      endTime,
    );
    if (intervalEnd <= intervalStart) return;

    const left = ((intervalStart - startTime) / HISTORY_WINDOW_MS) * 100;
    const width = ((intervalEnd - intervalStart) / HISTORY_WINDOW_MS) * 100;
    const status = toTimelineStatus(check);
    const previous = segments[segments.length - 1];
    if (
      previous &&
      previous.status === status &&
      Math.abs(previous.left + previous.width - left) < 0.01
    ) {
      previous.width += width;
    } else {
      segments.push({ left, width, status, key: check.checkedAt });
    }
  });

  return segments;
}

export function DashboardServiceHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const [history, setHistory] = useState<CheckHistory>(emptyHistory);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceKey | null>(
    null,
  );
  const load = useCallback(async () => {
    const requestStartedAt = performance.now();
    const checkedAt = new Date();
    try {
      const response = await apiFetch("/api/admin/services/health");
      if (!response.ok) throw new Error("health request failed");
      const data: unknown = await response.json();
      if (typeof data !== "object" || data === null || Array.isArray(data))
        throw new Error("invalid response");
      const payload = data as Record<string, unknown>;
      const latencyData =
        typeof payload.latency_ms === "object" && payload.latency_ms !== null
          ? (payload.latency_ms as Record<string, unknown>)
          : {};
      const nextHealth = Object.fromEntries(
        services.map(([key]) => {
          const latency =
            key === "gateway"
              ? Math.round(performance.now() - requestStartedAt)
              : latencyData[key];
          return [
            key,
            {
              checkedAt: checkedAt.toISOString(),
              status: toStatus(payload[key]),
              latencyMs:
                typeof latency === "number" && Number.isFinite(latency)
                  ? latency
                  : null,
            },
          ];
        }),
      ) as Health;
      setHealth(nextHealth);
      setHistory((current) => {
        const now = checkedAt.getTime();
        return Object.fromEntries(
          services.map(([key]) => [
            key,
            trimHistory([...current[key], nextHealth[key]], now),
          ]),
        ) as CheckHistory;
      });
      setError(false);
      setCheckedAt(checkedAt);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    setHistory(readStoredHistory());
    setHistoryLoaded(true);
  }, []);
  useEffect(() => {
    if (!historyLoaded) return;
    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // The live timeline still works when browser storage is unavailable.
    }
  }, [history, historyLoaded]);
  useEffect(() => {
    if (!historyLoaded) return;
    void load();
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [historyLoaded, load]);
  return (
    <section className="mt-10" aria-labelledby="service-health-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-slate-300 pb-4">
        <div>
          <h2
            id="service-health-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Estado de los servicios
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Comprobación automática cada 30 segundos
            {checkedAt
              ? ` · Última consulta: ${checkedAt.toLocaleTimeString("es-ES")}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary-600"
        >
          Actualizar estado
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          No se pudo consultar el estado de los servicios.
        </p>
      )}
      {!health ? (
        <p role="status">Consultando servicios...</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(([key, name]) => {
            const check = health[key];
            const state = toTimelineStatus(check);
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setSelectedService(key)}
                  aria-label={`Ver actividad de ${name}`}
                  aria-haspopup="dialog"
                  className="block min-h-full w-full border border-slate-200 bg-white p-4 text-left transition-colors hover:border-primary-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary-600"
                >
                  <span className="block font-medium text-slate-900">
                    {name}
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-sm">
                    <span
                      aria-hidden="true"
                      className={`size-2.5 rounded-full ${statusColor(state)}`}
                    />
                    <span className={statusTextColor(state)}>
                      {statusLabel(state)}
                    </span>
                  </span>
                  <ServiceTimeline
                    checks={history[key]}
                    endTime={checkedAt?.getTime() ?? null}
                    serviceName={name}
                  />
                  <span className="mt-3 block text-xs text-slate-500">
                    Ver detalle de actividad
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <ul
        aria-label="Leyenda de estados"
        className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600"
      >
        {(
          [
            ["online", "Encendido (OK)"],
            ["congested", "Congestionado"],
            ["off", "Apagado / sin respuesta"],
          ] as const
        ).map(([status, label]) => (
          <li key={status} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`size-2.5 rounded-full ${statusColor(status)}`}
            />
            {label}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full bg-slate-100 ring-1 ring-slate-300"
          />
          Sin datos
        </li>
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        Congestionado incluye respuestas con fallos o una latencia de 1.000 ms o
        más. Apagado / sin respuesta indica que no hubo respuesta al health
        check; no determina si está detenido o inaccesible. Sin datos indica
        periodos sin comprobaciones; el historial se conserva durante 12 horas
        en este navegador.
      </p>
      <Dialog
        open={selectedService !== null}
        onClose={() => setSelectedService(null)}
        title={
          services.find(([key]) => key === selectedService)?.[1] ?? "Servicio"
        }
        description="Actividad reciente observada mediante comprobaciones de salud."
        size="md"
      >
        {selectedService && (
          <ServiceActivity
            checks={history[selectedService]}
            current={health?.[selectedService] ?? null}
            endTime={checkedAt?.getTime() ?? null}
          />
        )}
      </Dialog>
    </section>
  );
}

function ServiceTimeline({
  checks,
  endTime,
  serviceName,
}: {
  checks: Check[];
  endTime: number | null;
  serviceName: string;
}) {
  const segments = endTime === null ? [] : timelineSegments(checks, endTime);

  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
        <span>Últimas 12 h</span>
        <span>
          {segments.length ? `${checks.length} lecturas` : "Sin historial"}
        </span>
      </div>
      <div
        role="img"
        aria-label={`Timeline de ${serviceName} durante las últimas 12 horas. ${segments.length ? `${segments.length} tramos observados.` : "Sin datos históricos."}`}
        className="relative h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200"
      >
        {segments.map((segment) => (
          <span
            key={segment.key}
            title={statusLabel(segment.status)}
            aria-hidden="true"
            className={`absolute inset-y-0 ${statusColor(segment.status)}`}
            style={{ left: `${segment.left}%`, width: `${segment.width}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>Hace 12 h</span>
        <span>Hace 6 h</span>
        <span>Ahora</span>
      </div>
    </div>
  );
}

function ServiceActivity({
  checks,
  current,
  endTime,
}: {
  checks: Check[];
  current: Check | null;
  endTime: number | null;
}) {
  const measured = checks.filter((check) => check.latencyMs !== null);
  const average = measured.length
    ? measured.reduce((sum, check) => sum + (check.latencyMs ?? 0), 0) /
      measured.length
    : null;
  const failures = checks.filter(
    (check) => toTimelineStatus(check) !== "online",
  ).length;

  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="border border-slate-200 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Estado actual
          </dt>
          <dd className="mt-1 font-medium text-slate-900">
            {statusLabel(current ? toTimelineStatus(current) : null)}
          </dd>
        </div>
        <div className="border border-slate-200 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Última respuesta
          </dt>
          <dd className="mt-1 font-medium text-slate-900">
            {formatLatency(current?.latencyMs ?? null)}
          </dd>
        </div>
        <div className="border border-slate-200 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Promedio observado
          </dt>
          <dd className="mt-1 font-medium text-slate-900">
            {formatLatency(average === null ? null : Math.round(average))}
          </dd>
        </div>
        <div className="border border-slate-200 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Comprobaciones fuera de OK
          </dt>
          <dd className="mt-1 font-medium text-slate-900">
            {failures} de {checks.length}
          </dd>
        </div>
      </dl>
      <ServiceTimeline
        checks={checks}
        endTime={endTime}
        serviceName="este servicio"
      />
      <section aria-labelledby="service-activity-heading">
        <h3
          id="service-activity-heading"
          className="mb-2 font-medium text-slate-900"
        >
          Últimas comprobaciones
        </h3>
        {checks.length ? (
          <ol className="max-h-64 divide-y divide-slate-200 overflow-y-auto border-y border-slate-200">
            {[...checks].reverse().map((check, index) => (
              <li
                key={`${check.checkedAt}-${index}`}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm"
              >
                <time dateTime={check.checkedAt} className="text-slate-600">
                  {new Date(check.checkedAt).toLocaleString("es-ES")}
                </time>
                <span className="text-slate-900">
                  {statusLabel(toTimelineStatus(check))} ·{" "}
                  {formatLatency(check.latencyMs)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">
            Aún no hay comprobaciones registradas.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          El historial conserva las comprobaciones de las últimas 12 horas. La
          latencia corresponde a la respuesta de salud del servicio.
        </p>
      </section>
    </div>
  );
}
