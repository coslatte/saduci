import { Text } from "@/components/atoms/Text";

import { cn } from "@/lib/utils";
import { SidebarCollapseToggle } from "./SidebarCollapseToggle";

interface SidebarBrandProps {
  collapsed: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Displays the centered sidebar brand header and the collapse control.
 * Used in X case: top branding area of the primary app sidebar.
 */
export function SidebarBrand({
  collapsed,
  onToggleCollapse,
}: SidebarBrandProps) {
  return (
    <div className="relative flex h-16 shrink-0 select-none items-center justify-center border-b border-slate-200/80 px-3">
      <div
        aria-hidden={collapsed}
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center px-14 transition-opacity duration-200 ease-linear",
          collapsed ? "opacity-0" : "opacity-100",
        )}
      >
        <Text
          as="span"
          size="lg"
          weight="bold"
          family="secondary"
          tracking="tight"
          className="block w-full truncate text-center text-slate-900"
        >
          {"SADUCI"}
        </Text>
      </div>

      {onToggleCollapse && (
        <SidebarCollapseToggle
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          className={cn(
            "absolute transition-all duration-200",
            collapsed ? "left-1/2 -translate-x-1/2" : "right-3",
          )}
        />
      )}
    </div>
  );
}
