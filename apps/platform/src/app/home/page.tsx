"use client";

import { isAdmin } from "@/lib/adminGuard";
import { DashboardServiceHealth } from "@/app/components/DashboardServiceHealth";
import { useAuth } from "@/lib/auth";
import { DashboardInfoSection } from "@/app/components/DashboardInfoSection";
import { DashboardStatsCards } from "@/app/components/DashboardStatsCards";
import { FiActivity } from "react-icons/fi";
import { DashboardRecentActivity } from "@/app/components/DashboardRecentActivity";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col">
      <section className="border-y border-slate-300 bg-white px-6 py-10 md:px-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div>
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">
              <FiActivity aria-hidden="true" className="size-4" />
              Sistema de ayuda clínica · Unidad de cuidados intensivos
            </p>
            <DashboardInfoSection
              className="p-0"
              titleAs="h1"
              title={
                user
                  ? `Bienvenido, ${user.name.split(" ")[0]}`
                  : "Bienvenido a SADUCI"
              }
              description="SADUCI ayuda al personal de salud en la toma de decisiones en cuidados intensivos mediante predicciones clínicas, simulaciones de escenarios y análisis estadístico."
            />
          </div>
          <div className="border-l-2 border-primary-600 pl-5 lg:mb-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Qué puedes hacer
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Inicia una predicción, simula un escenario o analiza datos
              clínicos. Consulta los resultados y registros guardados.
            </p>
          </div>
        </div>
      </section>

      {isAdmin(user) && <DashboardServiceHealth />}

      <section className="mt-10" aria-labelledby="activity-heading">
        <div className="mb-5 flex flex-col gap-2 border-b border-slate-300 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
              Resumen de actividad
            </p>
            <h2
              id="activity-heading"
              className="mt-1 text-xl font-semibold tracking-tight text-slate-900"
            >
              Indicadores de uso
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Totales asociados a su cuenta
          </p>
        </div>
        <DashboardStatsCards />
      </section>
      <section className="mt-10" aria-labelledby="recent-activity-heading">
        <div className="mb-5 border-b border-slate-300 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
            Actividad reciente
          </p>
          <h2
            id="recent-activity-heading"
            className="mt-1 text-xl font-semibold tracking-tight text-slate-900"
          >
            Últimas acciones
          </h2>
        </div>
        <DashboardRecentActivity />
      </section>
    </div>
  );
}
