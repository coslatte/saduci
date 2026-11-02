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
import { NAV_BRAND_SHORT } from "@/constants/constants";
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
  "/simulation": "Simulación",
  "/statistics": "Pruebas Estadísticas",
  "/prediction": "Predicción",
  "/admin/users": "Usuarios",
  "/settings": "Ajustes",
};

const ROUTE_BREADCRUMB_SEGMENTS: Record<
  string,
  { label: string; href: string }[]
> = {
  "/statistics": [{ label: "Simulación", href: "/simulation" }],
};

type NavigationLeaf = {
  href: string;
  label: string;
};

export interface NavigationItemConfig {
  label: string;
  href: string;
  active?: boolean;
  iconKey?: NavigationIconKey;
  children?: NavigationItemConfig[];
}

export interface NavigationSectionConfig {
  title: string;
  items: NavigationItemConfig[];
}

export const APP_NAVIGATION_SECTIONS: NavigationSectionConfig[] =
  SIDEBAR_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      iconKey: getDefaultNavigationIconKey(item.href),
      children: item.children?.map((child) => ({
        ...child,
        iconKey: getDefaultNavigationIconKey(child.href),
      })),
    })),
  }));

export function isRouteActive(itemHref: string, pathname: string) {
  if (itemHref === "/") return pathname === "/";
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}

function isCurrentRoute(itemHref: string, pathname: string) {
  return pathname === itemHref;
}

export function getRouteNameForPath(pathname: string) {
  if (ROUTE_NAMES_MAP[pathname]) {
    return ROUTE_NAMES_MAP[pathname];
  }

  const bestMatch = flattenNavigation(APP_NAVIGATION_SECTIONS)
    .filter((item) => isRouteActive(item.href, pathname))
    .sort((left, right) => right.href.length - left.href.length)[0];

  return bestMatch?.label ?? NAV_BRAND_SHORT;
}

export function getBreadcrumbSegments(pathname: string) {
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

  const current = isCurrentRoute(item.href, pathname);
  const hasActiveDescendant =
    children?.some((child) => child.active === true) ?? false;
  const active =
    current || isRouteActive(item.href, pathname) || hasActiveDescendant;

  return {
    ...item,
    active: active ? true : undefined,
    current: current ? true : undefined,
    icon: getNavigationIcon(item.iconKey),
    children,
  };
}

function flattenNavigation(
  sections: NavigationSectionConfig[],
): NavigationLeaf[] {
  return sections.flatMap((section) =>
    section.items.flatMap((item) => [
      { href: item.href, label: item.label },
      ...(item.children?.map((child) => ({
        href: child.href,
        label: child.label,
      })) ?? []),
    ]),
  );
}

function getDefaultNavigationIconKey(
  href: string,
): NavigationIconKey | undefined {
  const iconMap: Record<string, NavigationIconKey> = {
    "/": "home",
    "/simulation": "activity",
    "/statistics": "barchart",
    "/prediction": "prediction",
    "/usuarios": "users",
    "/settings": "settings",
  };

  return iconMap[href];
}
