"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarSection } from "@/components/organisms/sidebar/SidebarSection";
import { SidebarBrand } from "@/components/organisms/sidebar/SidebarBrand";
import {
  APP_NAVIGATION_SECTIONS,
  collectActiveNavigationKeys,
  resolveSidebarSections,
  type NavigationSectionConfig,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  sections?: NavigationSectionConfig[];
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SIDEBAR_EXPANDED_STORAGE_KEY = "saduci:sidebar-expanded";

function collectExpandedKeys(
  sections: NavigationSectionConfig[],
  manualExpanded: Set<string>,
): Set<string> {
  const expanded = new Set<string>(manualExpanded);
  collectActiveNavigationKeys(
    sections.flatMap((section) => section.items),
    [],
    expanded,
  );
  return expanded;
}

function readManualExpandedInitial(): Set<string> {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(
      parsed.filter((value): value is string => typeof value === "string"),
    );
  } catch {
    return new Set<string>();
  }
}

export function Sidebar({
  sections: sectionConfigs = APP_NAVIGATION_SECTIONS,
  className,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const sections = resolveSidebarSections(pathname, sectionConfigs);

  // Manual expansion survives navigation: the active route only adds its
  // ancestors on top, it never collapses what the user opened.
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(
    readManualExpandedInitial,
  );

  const handleToggleExpand = useCallback((key: string) => {
    setManualExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      try {
        window.localStorage.setItem(
          SIDEBAR_EXPANDED_STORAGE_KEY,
          JSON.stringify([...next]),
        );
      } catch {
        // Non-critical: expansion simply won't persist.
      }
      return next;
    });
  }, []);

  const expandedKeys = collectExpandedKeys(sections, manualExpanded);

  return (
    <aside
      className={cn(
        "flex h-dvh flex-col overflow-hidden border-r border-slate-200/80 bg-white/75 supports-backdrop-filter:bg-white/80 surface-backdrop-full transition-[width] duration-300 ease-out",
        collapsed ? "w-20" : "w-72",
        className,
      )}
    >
      <div className="flex h-full flex-col">
        <SidebarBrand
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />

        <nav
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden py-5 no-underline",
            collapsed ? "px-3" : "px-2",
          )}
        >
          <div className="flex flex-col gap-6">
            {sections.map((section, index) => (
              <SidebarSection
                key={section.title || `section-${index}`}
                title={section.title}
                items={section.items}
                collapsed={collapsed}
                expandedKeys={expandedKeys}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}
