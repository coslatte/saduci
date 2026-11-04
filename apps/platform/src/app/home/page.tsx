"use client";

import { useAuth } from "@/lib/auth";
import { DashboardInfoSection } from "@/app/components/DashboardInfoSection";
import { DashboardStatsCards } from "@/app/components/DashboardStatsCards";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col divide-y divide-slate-200/80">
      <DashboardInfoSection
        className="pb-8"
        titleAs="h1"
        title={
          user
            ? `Bienvenido a SADUCI, ${user.name.split(" ")[0]}`
            : "Bienvenido a SADUCI"
        }
        description="Plataforma de apoyo clínico para UCI: simule evoluciones, prediga riesgos y gestione registros en un solo lugar."
      >
        <DashboardStatsCards />
      </DashboardInfoSection>
    </div>
  );
}
