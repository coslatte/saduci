import "../setup";
import { describe, expect, it } from "bun:test";
import {
  APP_NAVIGATION_SECTIONS,
  collectActiveNavigationKeys,
  getNavigationItemKey,
  getSidebarSectionsForUser,
  resolveSidebarSections,
} from "@/lib/navigation";
import { SIDEBAR_SECTIONS } from "@/lib/mockData";
import type { NavItemType } from "@/lib/types";

const SIMULATION_PARENT: NavItemType = {
  label: "Simulación",
  href: "/simulation",
  current: false,
  children: [
    { label: "Realizar simulación", href: "/simulation", current: false },
    {
      label: "Registro simulaciones",
      href: "/records/simulations",
      current: true,
    },
  ],
};

const DASHBOARD: NavItemType = {
  label: "Dashboard",
  href: "/home",
  current: false,
};

describe("collectActiveNavigationKeys", () => {
  it("expands ancestors of the current nested route", () => {
    const acc = new Set<string>();

    collectActiveNavigationKeys([SIMULATION_PARENT, DASHBOARD], [], acc);

    expect(acc.has(getNavigationItemKey(SIMULATION_PARENT))).toBe(true);
    expect(acc.has(getNavigationItemKey(DASHBOARD))).toBe(false);
  });

  it("does not expand sections without the current route", () => {
    const inactive: NavItemType = {
      ...SIMULATION_PARENT,
      children: SIMULATION_PARENT.children?.map((child) => ({
        ...child,
        current: false,
      })),
    };
    const acc = new Set<string>();

    collectActiveNavigationKeys([inactive], [], acc);

    expect(acc.size).toBe(0);
  });
});

type Flat = { label: string; href: string; depth: number };

function flatten(
  items: { label: string; href: string; children?: unknown }[],
  depth = 0,
): Flat[] {
  return items.flatMap((item) => [
    { label: item.label, href: item.href, depth },
    ...flatten(
      (item.children ?? []) as { label: string; href: string }[],
      depth + 1,
    ),
  ]);
}

const SIDEBAR_ENTRIES = flatten(
  SIDEBAR_SECTIONS.flatMap((section) => section.items),
);

describe("configuracion del sidebar", () => {
  /**
   * Regression: the sidebar listed the same pages more than once, so expanding
   * a group showed the user duplicated links. The history lists used to live
   * under "Simulación" and "Predicción" as well as under "Registros", and each
   * group carried a child pointing at its own route.
   */
  it("no repite ninguna ruta", () => {
    const seen = new Map<string, string[]>();
    for (const entry of SIDEBAR_ENTRIES) {
      const labels = seen.get(entry.href) ?? [];
      labels.push(entry.label);
      seen.set(entry.href, labels);
    }

    const duplicates = [...seen.entries()].filter(
      ([, labels]) => labels.length > 1,
    );
    expect(
      duplicates.map(([href, labels]) => `${href}: ${labels.join(", ")}`),
    ).toEqual([]);
  });

  it("mantiene accesibles todas las paginas de la aplicacion", () => {
    const hrefs = new Set(SIDEBAR_ENTRIES.map((entry) => entry.href));
    for (const required of [
      "/home",
      "/simulation",
      "/prediction",
      "/statistics",
      "/admin/users",
      "/records",
    ]) {
      expect(hrefs.has(required)).toBe(true);
    }
  });

  it("incluye un acceso central al panel de registros", () => {
    expect(
      SIDEBAR_ENTRIES.filter((entry) => entry.href === "/records"),
    ).toHaveLength(1);
  });

  it("mantiene activo Registros al cambiar entre sus módulos", () => {
    for (const path of [
      "/records/simulations",
      "/records/predictions",
      "/records/statistics",
    ]) {
      const items = resolveSidebarSections(path).flatMap(
        (section) => section.items,
      );
      expect(items.find((item) => item.href === "/records")?.current).toBe(
        true,
      );
    }
  });

  it("expone las mismas entradas en la configuracion ya resuelta", () => {
    const resolved = flatten(
      APP_NAVIGATION_SECTIONS.flatMap((section) => section.items) as {
        label: string;
        href: string;
        children?: unknown;
      }[],
    );
    expect(resolved.map((e) => `${e.depth}:${e.href}`)).toEqual(
      SIDEBAR_ENTRIES.map((e) => `${e.depth}:${e.href}`),
    );
  });

  /**
   * Orden pedido: overview, las tres herramientas, el archivo y la
   * administración. Fijarlo aquí evita que un cambio futuro reordene el menú
   * sin querer y devuelva a la lectura secuencial de una sesión clínica.
   */
  it("mantiene el orden de lectura del menú", () => {
    const raiz = SIDEBAR_SECTIONS.flatMap((section) => section.items);
    expect(raiz.map((item) => item.href)).toEqual([
      "/admin/users",
      "/home",
      "/simulation",
      "/prediction",
      "/statistics",
      "/records",
    ]);
    expect(raiz.map((item) => item.label)).toEqual([
      "Administración",
      "Dashboard",
      "Simulación",
      "Predicciones",
      "Pruebas estadísticas",
      "Registros",
    ]);
  });
  it("muestra Administración a todos los usuarios", () => {
    const adminItems = getSidebarSectionsForUser(true).flatMap(
      (section) => section.items,
    );
    const userItems = getSidebarSectionsForUser(false).flatMap(
      (section) => section.items,
    );
    expect(adminItems[0]?.href).toBe("/admin/users");
    expect(userItems.some((item) => item.href === "/admin/users")).toBe(true);
    expect(userItems[0]?.href).toBe("/admin/users");
  });
});
