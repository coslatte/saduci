import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface SidebarCollapseToggleProps {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

/**
 * Toggles collapsed and expanded states for the sidebar rail.
 * Used in X case: compacting the left navigation panel in app shell.
 */
export function SidebarCollapseToggle({
  collapsed,
  onToggleCollapse,
  className,
}: SidebarCollapseToggleProps) {
  const label = collapsed ? "Expandir barra lateral" : "Contraer barra lateral";

  return (
    <button
      type="button"
      onClick={onToggleCollapse}
      aria-label={label}
      aria-pressed={collapsed}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 select-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200",
        className,
      )}
    >
      {collapsed ? (
        <FiChevronRight className="size-5" />
      ) : (
        <FiChevronLeft className="size-5" />
      )}
    </button>
  );
}
