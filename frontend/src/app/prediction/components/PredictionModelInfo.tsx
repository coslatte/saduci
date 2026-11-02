import { FiActivity, FiBarChart2, FiEye, FiShield } from "react-icons/fi";
import { RiBrain2Line } from "react-icons/ri";
import { Text } from "@/components/atoms/Text";

const methodHints = [
  { method: "Predicción", info: "Riesgo mortalidad", icon: RiBrain2Line },
  { method: "LIME", info: "Explicabilidad local", icon: FiEye },
  { method: "SHAP", info: "Atribución global", icon: FiBarChart2 },
  {
    method: "Gradientes Integrados",
    info: "Sensibilidad por gradiente",
    icon: FiActivity,
  },
  { method: "Mapas de Saliencia", info: "Mapa de calor", icon: FiShield },
];

export function PredictionModelInfo() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Text as="h2" size="base" weight="semibold" className="text-zinc-800">
          "Modelos usados en esta pantalla"
        </Text>
        <Text as="p" size="sm" className="text-zinc-500">
          "El flujo combina un modelo principal de predicción con varios métodos
          de explicabilidad para interpretar el resultado."
        </Text>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {methodHints.map(({ method, info, icon: Icon }) => (
          <div
            key={method}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                <Icon className="size-4" />
              </span>
              <Text
                as="span"
                size="sm"
                weight="semibold"
                className="text-slate-800"
              >
                {method}
              </Text>
            </div>
            <Text as="span" size="xs" className="text-slate-500">
              {info}
            </Text>
          </div>
        ))}
      </div>
    </section>
  );
}
