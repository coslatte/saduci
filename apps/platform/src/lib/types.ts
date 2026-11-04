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

export type NavItemType = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
  current?: boolean;
  children?: NavItemType[];
};

export type Role = "Administrador" | "Analista" | "Especialista" | "Médico";
