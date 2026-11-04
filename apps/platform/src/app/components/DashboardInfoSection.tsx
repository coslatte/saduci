import { Text } from "@/components/atoms/Text";
import { cn } from "@/lib/utils";

interface DashboardInfoSectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h1" | "h2" | "h3";
  className?: string;
  children?: React.ReactNode;
}

/**
 * DashboardInfoSection
 *
 * Contenedor reutilizable para bloques informativos del dashboard con una
 * superficie visual plana y separaciones claras entre secciones.
 *
 * @param {React.ReactNode} title Título principal de la sección.
 * @param {React.ReactNode} [description] Texto descriptivo mostrado bajo el título.
 * @param {"h1" | "h2" | "h3"} [titleAs] Etiqueta semántica para el título.
 * @param {string} [className] Clases adicionales para personalizar el contenedor.
 * @param {React.ReactNode} [children] Contenido adicional de la sección.
 *
 * @example
 * <DashboardInfoSection title="Hola, Ana" description="Bienvenida al panel">
 *   <div>Contenido adicional</div>
 * </DashboardInfoSection>
 */
export function DashboardInfoSection({
  title,
  description,
  titleAs = "h2",
  className,
  children,
}: DashboardInfoSectionProps) {
  return (
    <section className={cn("bg-transparent", className)}>
      <div>
        <Text
          as={titleAs}
          size="3xl"
          weight="bold"
          tracking="tight"
          className="max-w-3xl text-(length:--font-size-4xl) leading-tight md:text-(length:--font-size-5xl)"
        >
          {title}
        </Text>
        {description && (
          <Text size="lg" muted className="mt-4 max-w-3xl leading-7">
            {description}
          </Text>
        )}
      </div>

      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
