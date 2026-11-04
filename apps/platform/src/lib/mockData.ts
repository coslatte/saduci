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

/**
 * Every entry here must be reachable from exactly one place.
 *
 * The previous layout repeated the same pages all over the sidebar: the three
 * history lists appeared under "Simulación" *and* under "Registros",
 * "Registro predicciones" also appeared under "Predicción", and each group
 * listed a child pointing at its own route ("Simulación" / "Realizar
 * simulación", "Panel de administración" / "Usuarios"). Expanding a group
 * showed the user the same links several times.
 *
 * Now each route appears once: the "run" pages are leaves, and "Registros" is
 * the single home of the three history lists.
 *
 * The order below is the reading order of a clinical session: overview, then
 * the three tools (simulate, test, predict), then the archive, then the
 * administration area. "Registros" stays a collapsible group so the archive
 * does not push the rest of the menu off-screen.
 */
export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    items: [
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
        label: "Pruebas estadísticas",
        href: "/statistics",
        iconKey: "barchart",
      },
      {
        label: "Predicción",
        href: "/prediction",
        iconKey: "prediction",
      },
      {
        label: "Registros",
        href: "/records",
        iconKey: "barchart",
        children: [
          {
            label: "Registro simulaciones",
            href: "/records/simulations",
            iconKey: "activity",
          },
          {
            label: "Registro predicciones",
            href: "/records/predictions",
            iconKey: "prediction",
          },
          {
            label: "Registro pruebas estadísticas",
            href: "/records/statistics",
            iconKey: "barchart",
          },
        ],
      },
      {
        label: "Administración",
        href: "/admin/users",
        iconKey: "admin",
      },
    ],
  },
];
