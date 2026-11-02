/**
 * Centralized mock data and demo configurations
 * Used across page examples and demo UI sections
 */

export interface SidebarItemConfig {
  label: string;
  href: string;
  active?: boolean;
  children?: SidebarItemConfig[];
}

export interface SidebarSection {
  title: string;
  items: SidebarItemConfig[];
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    title: "Principal",
    items: [
      {
        label: "Dashboard",
        href: "/",
      },
      {
        label: "Simulación",
        href: "/simulation",
        children: [
          {
            label: "Pruebas Estadísticas",
            href: "/statistics",
          },
        ],
      },
      {
        label: "Predicción",
        href: "/prediction",
      },
    ],
  },
];
