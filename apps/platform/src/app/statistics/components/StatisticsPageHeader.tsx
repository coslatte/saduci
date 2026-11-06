import { ExpandableDescription } from "@/components/molecules/ExpandableDescription";
import { MODULE_DESCRIPTIONS } from "@/constants/moduleDescriptions";

export function StatisticsPageHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Pruebas estadísticas
      </h1>
      <ExpandableDescription summary={MODULE_DESCRIPTIONS.statistics.summary}>
        {MODULE_DESCRIPTIONS.statistics.detail}
      </ExpandableDescription>
    </div>
  );
}
