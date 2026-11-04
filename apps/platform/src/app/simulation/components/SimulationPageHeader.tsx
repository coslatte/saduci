import { Text } from "@/components/atoms/Text";

/**
 * Renders title and subtitle for the simulation module screen.
 * Used in X case: top header section of simulation route.
 */
export function SimulationPageHeader() {
  return (
    <div className="mb-8">
      <Text
        as="h1"
        size="xl"
        weight="bold"
        tracking="tight"
        className="text-slate-900 md:text-3xl"
      >
        {"Simulación de Paciente UCI"}
      </Text>
      <Text as="p" size="sm" muted className="mt-2">
        {
          "Ingrese los datos clínicos del paciente para simular su evolución en la Unidad de Cuidados Intensivos."
        }
      </Text>
    </div>
  );
}
