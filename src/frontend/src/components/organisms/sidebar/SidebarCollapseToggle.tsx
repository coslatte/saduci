import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface SidebarCollapseToggleProps {
  collapsed: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Toggles collapsed and expanded states for the sidebar rail.
 * Used in X case: compacting the left navigation panel in app shell.
 */
export function SidebarCollapseToggle({
  collapsed,
  onToggleCollapse,
}: SidebarCollapseToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggleCollapse}
      className={cn(
        "absolute -right-4 top-1/2 -translate-y-1/2 z-50 flex h-12 w-4 items-center justify-center rounded-r-md border border-l-0 border-slate-200 bg-slate-50 text-slate-400 transition-all duration-200 hover:border-primary-500 hover:text-primary-500 hover:shadow-primary-500/20 hover:shadow-sm focus:outline-none",
        collapsed &&
          "ring-0 ring-primary-100/50 bg-zinc-50 border-3 hover:bg-primary-100",
      )}
      aria-label={
        collapsed ? "Expandir barra lateral" : "Contraer barra lateral"
      }
    >
      {collapsed ? (
        <FiChevronRight className="size-3" />
      ) : (
        <FiChevronLeft className="size-3" />
      )}
    </button>
  );
}
