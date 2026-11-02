import { Text } from "@/components/atoms/Text";

import { cn } from "@/lib/utils";

interface SidebarBrandProps {
  collapsed: boolean;
}

/**
 * Displays the sidebar brand header and hides it when collapsed.
 * Used in X case: top branding area of the primary app sidebar.
 */
export function SidebarBrand({ collapsed }: SidebarBrandProps) {
  return (
    <div
      className={cn(
        "overflow-hidden border-b border-slate-200/80 transition-[height,opacity] duration-200 ease-linear",
        collapsed
          ? "h-0 border-b-0 px-0 opacity-0"
          : "flex h-16 shrink-0 items-center px-4 opacity-100",
      )}
    >
      <div className="min-w-0">
        <Text
          as="span"
          weight="semibold"
          family="secondary"
          tracking="tight"
          className="block truncate text-slate-900"
        >
          {"Saduci Platform"}
        </Text>
      </div>
    </div>
  );
}
