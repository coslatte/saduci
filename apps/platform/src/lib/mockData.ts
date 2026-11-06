/**
 * Centralized mock data and demo configurations
 * Used across page examples and demo UI sections
 */

export interface SidebarItemConfig {
  label: string;
  href: string;
  iconKey?: "home" | "activity" | "barchart" | "prediction" | "admin";
  hideIcon?: boolean;
  children?: SidebarItemConfig[];
}

export interface SidebarSection {
  title?: string;
  items: SidebarItemConfig[];
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    items: [
      {
        label: "Administración",
        href: "/admin/users",
        iconKey: "admin",
      },
      {
        label: "Dashboard",
        href: "/home",
        iconKey: "home",
      },
      {
        label: "Simulación",
        href: "/simulation",
        iconKey: "activity",
      },
      {
        label: "Predicciones",
        href: "/prediction",
        iconKey: "prediction",
      },
      {
        label: "Pruebas estadísticas",
        href: "/statistics",
        iconKey: "barchart",
      },
      {
        label: "Registros",
        href: "/records",
        iconKey: "barchart",
      },
    ],
  },
];
