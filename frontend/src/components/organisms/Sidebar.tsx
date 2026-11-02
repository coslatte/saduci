"use client";

import { usePathname } from "next/navigation";
import { SidebarSection } from "@/components/organisms/sidebar/SidebarSection";
import { SidebarBrand } from "@/components/organisms/sidebar/SidebarBrand";
import {
  APP_NAVIGATION_SECTIONS,
  resolveSidebarSections,
  type NavigationSectionConfig,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  sections?: NavigationSectionConfig[];
  className?: string;
}

export function Sidebar({
  sections: sectionConfigs = APP_NAVIGATION_SECTIONS,
  className,
}: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const sections = resolveSidebarSections(pathname, sectionConfigs);

  return (
    <aside
      className={cn(
        "flex h-dvh w-72 flex-col overflow-hidden border-r border-slate-200/80 bg-white/75 supports-backdrop-filter:bg-white/80 surface-backdrop-full",
        className,
      )}
    >
      <div className="flex h-full flex-col">
        <SidebarBrand collapsed={false} />

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-5 no-underline">
          <div className="flex flex-col gap-6">
            {sections.map((section) => (
              <SidebarSection
                key={section.title}
                title={section.title}
                items={section.items}
                collapsed={false}
              />
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}
