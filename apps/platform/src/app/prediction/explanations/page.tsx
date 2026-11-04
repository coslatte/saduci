"use client";

import { Badge } from "@/components/atoms/Badge";
import { Text } from "@/components/atoms/Text";
import { Alert } from "@/components/molecules/Alert";
import { Card } from "@/components/molecules/Card";
import { DashboardInfoSection } from "@/app/components/DashboardInfoSection";

export default function PredictionExplanationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <DashboardInfoSection
        title="Explicaciones de predicciones"
        description="Módulo en desarrollo para consultar explicabilidad de predicciones registradas."
        titleAs="h1"
      />

      <Card>
        <div className="flex flex-col gap-4">
          <Badge status="warning">WIP</Badge>
          <Text as="p" size="sm" className="text-slate-600">
            Este apartado permitirá revisar explicaciones SHAP, LIME y otros
            métodos asociados a predicciones históricas. Por ahora, la
            explicabilidad sigue disponible al realizar una predicción en{" "}
            <strong>Realizar predicción</strong>.
          </Text>
        </div>
      </Card>

      <Alert variant="info">
        Funcionalidad pendiente de integración con la API de explicaciones.
      </Alert>
    </div>
  );
}
