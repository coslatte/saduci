import { Alert } from "@/components/molecules";

type AlertVariant = "info" | "success" | "warning" | "danger";

interface AlertBlockProps {
  variant?: AlertVariant;
  title?: string;
  message?: string;
}

/**
 * Renders a configured alert variant with title and message content.
 * Used in X case: alert block previews in dynamic page compositions.
 */
export function AlertBlock({
  variant = "info",
  title = "Información",
  message = "Mensaje de la alerta.",
}: AlertBlockProps) {
  return (
    <Alert variant={variant} title={title}>
      {message}
    </Alert>
  );
}
