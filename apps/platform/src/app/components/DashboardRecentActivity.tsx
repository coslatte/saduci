"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  fetchPredictionRecords,
  fetchSimulationRecords,
  formatRecordDate,
} from "@/lib/recordsApi";
import type { PredictionRecord, SimulationRecord } from "@/lib/recordsMockData";

type Activity = {
  id: string;
  kind: "simulation" | "prediction";
  title: string;
  date: string;
  href: string;
};

export function DashboardRecentActivity() {
  const { token, user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      queueMicrotask(() => {
        if (!cancelled) {
          setActivities([]);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    void Promise.all([
      fetchSimulationRecords(token, user?.username ?? ""),
      fetchPredictionRecords(token, user?.username ?? ""),
    ])
      .then(
        ([simulations, predictions]: [
          SimulationRecord[],
          PredictionRecord[],
        ]) => {
          if (cancelled) return;
          const combined: Activity[] = [
            ...simulations.map((item) => ({
              id: item.id,
              kind: "simulation" as const,
              title: `Simulación · ${item.patientId}`,
              date: item.createdAt,
              href: `/records/simulations/${encodeURIComponent(item.id)}`,
            })),
            ...predictions.map((item) => ({
              id: item.id,
              kind: "prediction" as const,
              title: `Predicción · ${item.patientId}`,
              date: item.createdAt,
              href: `/records/predictions/${encodeURIComponent(item.id)}`,
            })),
          ];
          combined.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
          setActivities(combined.slice(0, 6));
        },
      )
      .catch(() => {
        if (!cancelled) setActivities([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, user?.username]);

  if (loading)
    return (
      <p className="border-y border-slate-300 bg-white px-5 py-6 text-sm text-slate-500">
        Cargando actividad…
      </p>
    );
  if (!activities.length)
    return (
      <p className="border-y border-slate-300 bg-white px-5 py-6 text-sm text-slate-500">
        Aún no hay simulaciones ni predicciones registradas.
      </p>
    );

  return (
    <ul className="divide-y divide-slate-200 border-y border-slate-300 bg-white">
      {activities.map((activity) => (
        <li key={`${activity.kind}-${activity.id}`}>
          <Link
            href={activity.href}
            className="flex flex-col gap-1 px-5 py-4 no-underline transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary-600 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="font-medium text-slate-900">{activity.title}</span>
            <time dateTime={activity.date} className="text-sm text-slate-500">
              {formatRecordDate(activity.date)}
            </time>
          </Link>
        </li>
      ))}
    </ul>
  );
}
