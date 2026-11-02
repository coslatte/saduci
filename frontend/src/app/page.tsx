"use client";

import { FiBox } from "react-icons/fi";
import { useAuth } from "@/lib/auth";
import { Text } from "@/components/atoms/Text";
import { DashboardInfoSection } from "@/app/components/DashboardInfoSection";
import {
  HOME_DEFAULT_GREETING,
  HOME_WELCOME_SUBTITLE,
  ABOUT_TITLE,
  ABOUT_DESC,
} from "@/constants/constants";

export default function Home() {
  const { user } = useAuth();
  const greeting = user ? `Hola, ${user.name.split(" ")[0]}` : "Bienvenido";

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto divide-y divide-slate-200/80">
      <DashboardInfoSection
        className="pb-8"
        titleAs="h1"
        title={greeting}
        description="Panel principal de Saduci Platform - sistema de simulación y análisis clínico para Unidades de Cuidados Intensivos."
      >
        <div className="flex flex-col gap-4 mt-6">
          <div className="flex items-center gap-3">
            <FiBox className="size-5 text-primary-600" />
            <Text as="h3" size="lg" weight="semibold">
              "Acerca de la Plataforma"
            </Text>
          </div>
          <div className="space-y-4">
            <Text
              size="sm"
              className="leading-relaxed text-justify text-slate-600"
            >
              <>
                <strong>SADUCI</strong> es una plataforma para el apoyo en la
                unidad clínica la evolución de pacientes en la Unidad de
                Cuidados Intensivos (UCI).{" "}
                {
                  '"Saduci" significa "Sistema de Apoyo en la Decisión en la Unidad de Cuidado Intensivo".'
                }
              </>
            </Text>
          </div>
        </div>
      </DashboardInfoSection>
    </div>
  );
}
