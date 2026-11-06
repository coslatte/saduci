import { createElement } from "react";
import {
  FiActivity,
  FiBarChart2,
  FiHome,
  FiSettings,
  FiUsers,
  FiLayout,
} from "react-icons/fi";
import { RiBrain2Line } from "react-icons/ri";
import { SIDEBAR_SECTIONS } from "@/lib/mockData";
import type { NavItemType } from "@/lib/types";

type NavigationIconKey =
  | "home"
  | "activity"
  | "barchart"
  | "users"
  | "settings"
  | "admin"
  | "prediction";

export type { NavigationIconKey };

const NAVIGATION_ICON_REGISTRY: Record<
  NavigationIconKey,
  React.ComponentType<{ className?: string }>
> = {
  home: FiHome,
  activity: FiActivity,
  barchart: FiBarChart2,
  users: FiUsers,
  settings: FiSettings,
  admin: FiLayout,
  prediction: RiBrain2Line,
} as const;

const ROUTE_NAMES_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/records": "Registros",
  "/records/simulations": "Registro simulaciones",
  "/records/predictions": "Registro predicciones",
  "/simulation": "Realizar simulación",
  "/prediction": "Realizar predicción",
  "/statistics": "Pruebas estadísticas",
  "/records/statistics": "Registro pruebas estadísticas",
  "/prediction/explanations": "Explicaciones predicciones",
  "/admin/users": "Usuarios",
  "/settings": "Usuario",
};

const ROUTE_BREADCRUMB_SEGMENTS: Record<
  string,
  { label: string; href: string }[]
> = {
  "/simulation": [{ label: "Realizar simulación", href: "/simulation" }],
  "/statistics": [{ label: "Pruebas estadísticas", href: "/statistics" }],
  "/records/statistics": [
    { label: "Registro pruebas estadísticas", href: "/records/statistics" },
  ],
  "/prediction": [{ label: "Realizar predicción", href: "/prediction" }],
  "/prediction/explanations": [
    { label: "Explicaciones predicciones", href: "/prediction/explanations" },
  ],
};

/**
 * Detail views intentionally have no sidebar entry, but they do extend the
 * header breadcrumb under their parent registro.
 */
const RECORD_DETAIL_ROUTES: Record<string, { parentHref: string }> = {
  "/records/simulations": {
    parentHref: "/records/simulations",
  },
  "/records/predictions": {
    parentHref: "/records/predictions",
  },
};

function matchRecordDetail(
  pathname: string,
): { parentHref: string; identifier: string } | null {
  for (const [base, config] of Object.entries(RECORD_DETAIL_ROUTES)) {
    if (!pathname.startsWith(`${base}/`)) continue;
    const segment = pathname.slice(base.length + 1).split("/")[0];
    if (!segment) continue;
    let identifier = segment;
    try {
      identifier = decodeURIComponent(segment);
    } catch {
      // Preserve the raw URL segment if it contains malformed escaping.
    }
    return { ...config, identifier };
  }
  return null;
}

type NavigationLeaf = {
  href: string;
  label: string;
};

export interface NavigationItemConfig {
  label: string;
  href: string;
  iconKey?: NavigationIconKey;
  hideIcon?: boolean;
  active?: boolean;
  children?: NavigationItemConfig[];
}

export interface NavigationSectionConfig {
  title?: string;
  items: NavigationItemConfig[];
}

function mapNavigationSectionItem(
  item: NavigationItemConfig,
): NavigationItemConfig {
  return {
    ...item,
    iconKey:
      item.iconKey ?? getDefaultNavigationIconKey(item.href, item.hideIcon),
    children: item.children?.map(mapNavigationSectionItem),
  };
}

export const APP_NAVIGATION_SECTIONS: NavigationSectionConfig[] =
  SIDEBAR_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map(mapNavigationSectionItem),
  }));

export function getSidebarSectionsForUser(_isAdministrator: boolean) {
  return APP_NAVIGATION_SECTIONS;
}

export function isRouteActive(itemHref: string, pathname: string) {
  if (itemHref === "/") return pathname === "/";
  return pathname === itemHref;
}

export function getNavigationItemKey(item: {
  href: string;
  label: string;
}): string {
  return `${item.href}-${item.label}`;
}

/**
 * Collects the keys of every ancestor node that contains the current route, so
 * the sidebar can keep those sections expanded after navigation.
 */
export function collectActiveNavigationKeys(
  items: NavItemType[],
  ancestors: string[],
  acc: Set<string>,
): boolean {
  let anyActive = false;

  for (const item of items) {
    const key = getNavigationItemKey(item);
    const childActive = item.children?.length
      ? collectActiveNavigationKeys(item.children, [...ancestors, key], acc)
      : false;

    if (item.current === true || childActive) {
      anyActive = true;
      ancestors.forEach((ancestor) => acc.add(ancestor));
      if (item.children?.length) acc.add(key);
    }
  }

  return anyActive;
}

function isCurrentRoute(itemHref: string, pathname: string) {
  if (pathname === itemHref) return true;
  if (itemHref === "/records" && pathname.startsWith("/records/")) return true;
  // A detail view highlights its parent registro without adding a sub-entry.
  const detail = matchRecordDetail(pathname);
  return detail !== null && detail.parentHref === itemHref;
}

export function getRouteNameForPath(pathname: string) {
  if (ROUTE_NAMES_MAP[pathname]) {
    return ROUTE_NAMES_MAP[pathname];
  }

  const detail = matchRecordDetail(pathname);
  if (detail) return detail.identifier;

  const bestMatch = flattenNavigation(APP_NAVIGATION_SECTIONS)
    .filter((item) => isRouteActive(item.href, pathname))
    .sort((left, right) => right.href.length - left.href.length)[0];

  return bestMatch?.label ?? "Saduci";
}

export function getBreadcrumbSegments(pathname: string) {
  const detail = matchRecordDetail(pathname);
  if (detail) {
    const parentLabel = ROUTE_NAMES_MAP[detail.parentHref] ?? detail.parentHref;
    return [{ label: parentLabel, href: detail.parentHref }];
  }

  const allItems = APP_NAVIGATION_SECTIONS.flatMap((s) => s.items);
  const fromTree = findAncestorSegments(allItems, pathname, []);
  if (fromTree !== null) return fromTree;

  if (ROUTE_BREADCRUMB_SEGMENTS[pathname]) {
    return ROUTE_BREADCRUMB_SEGMENTS[pathname];
  }

  const matchingSegment = Object.entries(ROUTE_BREADCRUMB_SEGMENTS)
    .filter(([route]) => isRouteActive(route, pathname))
    .sort(([left], [right]) => right.length - left.length)[0];

  return matchingSegment?.[1];
}

function findAncestorSegments(
  items: NavigationItemConfig[],
  pathname: string,
  currentPath: Array<{ label: string; href: string }>,
): Array<{ label: string; href: string }> | null {
  for (const item of items) {
    const entry = { label: item.label, href: item.href };

    if (item.children?.length) {
      const deeper = findAncestorSegments(item.children, pathname, [
        ...currentPath,
        entry,
      ]);
      if (deeper !== null) return deeper;
    }

    if (pathname === item.href) return currentPath;
    if (isRouteActive(item.href, pathname)) return currentPath;
  }
  return null;
}

export function resolveSidebarSections(
  pathname: string,
  sections: NavigationSectionConfig[] = APP_NAVIGATION_SECTIONS,
) {
  return sections.map((section) => ({
    title: section.title,
    items: section.items.map((item) => mapNavigationItem(item, pathname)),
  }));
}

export function getNavigationIcon(iconKey?: NavigationIconKey) {
  if (!iconKey) {
    return undefined;
  }

  const Icon = NAVIGATION_ICON_REGISTRY[iconKey];
  return Icon ? createElement(Icon, { className: "size-5" }) : undefined;
}

function mapNavigationItem(
  item: NavigationItemConfig,
  pathname: string,
): NavItemType {
  const children = item.children?.map((child) =>
    mapNavigationItem(child, pathname),
  );

  const hrefMatches = isCurrentRoute(item.href, pathname);
  const childAlsoMatches = item.children?.some(
    (child) => child.href === item.href && pathname === child.href,
  );
  const current = hrefMatches && !childAlsoMatches;
  const hasActiveDescendant =
    children?.some((child) => child.active === true) ?? false;
  const active =
    current || (hrefMatches && !childAlsoMatches) || hasActiveDescendant;

  return {
    ...item,
    active: active ? true : undefined,
    current: current ? true : undefined,
    icon: item.hideIcon ? undefined : getNavigationIcon(item.iconKey),
    children,
  };
}

function flattenNavigationItems(
  items: NavigationItemConfig[],
): NavigationLeaf[] {
  return items.flatMap((item) => [
    { href: item.href, label: item.label },
    ...(item.children ? flattenNavigationItems(item.children) : []),
  ]);
}

function flattenNavigation(
  sections: NavigationSectionConfig[],
): NavigationLeaf[] {
  return sections.flatMap((section) => flattenNavigationItems(section.items));
}

function getDefaultNavigationIconKey(
  href: string,
  hideIcon?: boolean,
): NavigationIconKey | undefined {
  if (hideIcon) return undefined;

  const iconMap: Record<string, NavigationIconKey> = {
    "/": "home",
    "/records": "barchart",
    "/simulation": "activity",
    "/records/simulations": "activity",
    "/statistics": "barchart",
    "/records/statistics": "barchart",
    "/prediction": "prediction",
    "/records/predictions": "prediction",
    "/prediction/explanations": "prediction",
    "/admin/users": "users",
    "/settings": "settings",
  };

  return iconMap[href];
}
