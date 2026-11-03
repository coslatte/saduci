export type Size = "xs" | "sm" | "md" | "lg" | "xl";

export type Variant =
  | "primary"
  | "glass"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success" // green "add" style
  | "circle";

export type Status = "info" | "success" | "warning" | "danger" | "default";

// Common props that many global components should accept
export interface GlobalProps {
  /** When true the component should render as disabled (visual + interaction) */
  disabled?: boolean;
  className?: string;
}

// Roles
export type Role = "Administrador" | "Analista" | "Especialista" | "Médico";
