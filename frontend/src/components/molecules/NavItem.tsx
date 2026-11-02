import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn, dataDisabledProps } from "@/lib/utils";
import SidebarTooltip from "@/components/organisms/sidebar/SidebarTooltip";

/**
 * Props for `NavItem`.
 */
interface NavItemProps {
  href?: string;
  label: string;
  icon?: React.ReactNode;
  /** Whether this item represents the active route */
  active?: boolean;
  /** Whether this item exactly matches the current route */
  current?: boolean;
  /** When true render the compact/collapsed variant (icons only) */
  collapsed?: boolean;
  variant?: "default" | "nested";
  trailingContent?: React.ReactNode;
  onClick?: () => void;
  expanded?: boolean;
  className?: string;
  labelClassName?: string;
  iconClassName?: string;
  disabled?: boolean;
  /**
   * When true prevent the icon from scaling on parent hover (used by tree items)
   */
  disableIconHoverScale?: boolean;
  /** When true avoid layout/transform animations (used while sidebar collapses) */
  suppressLayoutAnimations?: boolean;
}

/**
 * Renders a sidebar navigation item with optional nesting and tooltip support.
 * Used in X case: route links inside expanded and collapsed sidebar states.
 */
export function NavItem({
  href,
  label,
  icon,
  active = false,
  current = false,
  collapsed = false,
  variant = "default",
  trailingContent,
  onClick,
  expanded,
  className,
  labelClassName,
  iconClassName,
  disabled,
  disableIconHoverScale = false,
  suppressLayoutAnimations = false,
}: NavItemProps) {
  const isNested = variant === "nested";
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Compose classes in a clearer way to avoid deep nested ternaries and
  // repeated strings. Keep few local vars (base/state/common) for readability
  // while not introducing a large number of intermediate variables.
  const transitionClass = suppressLayoutAnimations
    ? "transition-opacity duration-200"
    : "transition-all duration-200";

  const base = isNested
    ? cn(
        "group flex w-full items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-sm font-medium",
        transitionClass,
      )
    : collapsed
      ? cn(
          "group flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent",
          transitionClass,
        )
      : cn(
          "group flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-(length:--font-size-sm) font-medium",
          transitionClass,
        );

  const state = (() => {
    if (isNested) {
      if (current || active)
        return "border-primary-500/60 bg-primary-500/15 text-primary-700 shadow-sm shadow-primary-500/25 active:bg-primary-500/20";
      return "text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-800";
    }

    if (collapsed) {
      if (current)
        return "text-primary-700 bg-primary-500/15 border-primary-500/50 shadow-sm shadow-primary-500/25 active:bg-primary-500/20";
      if (active)
        return "text-slate-700 bg-slate-100 border-transparent hover:bg-slate-200 active:bg-slate-200";
      return "text-zinc-600 hover:bg-slate-100 hover:text-zinc-900 border-transparent active:bg-slate-200";
    }

    if (current)
      return "border-primary-500/60 bg-primary-500/15 text-primary-700 shadow-sm shadow-primary-500/25 active:bg-primary-500/20";
    if (active) return "border-slate-300 bg-white text-slate-800 shadow-sm";
    return "text-zinc-600 hover:border-slate-200 hover:bg-white hover:text-zinc-900";
  })();

  const common = [
    "no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
    className,
  ];

  const sharedClassName = cn(base, state, ...common);

  // Tooltip logic for collapsed sidebar: show label to the right after 200ms
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const hoverTimer = useRef<number | null>(null);

  const updateTooltipPosition = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    setTooltipPosition({
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
    });
  }, []);

  function handleMouseEnter() {
    if (!collapsed) return;
    updateTooltipPosition();
    hoverTimer.current = window.setTimeout(() => setShowTooltip(true), 200);
  }

  function handleMouseLeave() {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current as number);
      hoverTimer.current = null;
    }
    setShowTooltip(false);
    setTooltipPosition(null);
  }

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current as number);
    };
  }, []);

  useEffect(() => {
    if (!collapsed || !showTooltip) {
      return;
    }

    const syncPosition = () => updateTooltipPosition();

    window.addEventListener("scroll", syncPosition, true);
    window.addEventListener("resize", syncPosition);

    return () => {
      window.removeEventListener("scroll", syncPosition, true);
      window.removeEventListener("resize", syncPosition);
    };
  }, [collapsed, showTooltip, updateTooltipPosition]);

  const content = (
    <>
      {icon && (
        <span
          className={cn(
            isNested
              ? current || active
                ? "flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-primary-700 transition-colors group-hover:bg-primary-500/20 group-hover:text-primary-700"
                : "flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-slate-200 group-hover:text-slate-700"
              : [
                  // When suppressing layout animations avoid transform/scale
                  // transitions so the icon doesn't animate geometry while the
                  // sidebar collapses.
                  suppressLayoutAnimations
                    ? "flex size-9 shrink-0 items-center justify-center rounded-xl text-current"
                    : "flex size-9 shrink-0 items-center justify-center rounded-xl text-current transform transition-transform duration-200 ease-out will-change-transform",
                  !disableIconHoverScale &&
                    !suppressLayoutAnimations &&
                    "group-hover:scale-105",
                ],
            // For non-nested items, when collapsed avoid the white bg / shadow
            // so the sidebar remains compact. When not collapsed, show bg and
            // subtle ring. For the current (selected) icon use a stronger
            !isNested &&
              (collapsed
                ? current
                  ? "ring-primary-700/50 ring-2 shadow-sm shadow-primary-800/70"
                  : ""
                : current
                  ? "bg-primary-500/15 text-primary-700 transition-colors group-hover:bg-primary-500/20 group-hover:text-primary-700"
                  : "bg-white ring-slate-200/80 shadow-sm"),
            iconClassName,
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}

      <span
        className={cn(
          "min-w-0 truncate no-underline overflow-hidden",
          transitionClass,
          collapsed ? "w-0 opacity-0 flex-none" : "flex-1 opacity-100",
          labelClassName,
        )}
        aria-hidden={collapsed ? true : undefined}
      >
        {label}
      </span>

      {trailingContent && (
        <span
          className={cn(
            "flex-none",
            transitionClass,
            collapsed
              ? "w-0 opacity-0 overflow-hidden"
              : "opacity-100 overflow-visible",
          )}
        >
          {trailingContent}
        </span>
      )}
    </>
  );
  return (
    <div
      ref={wrapperRef}
      className="relative flex-1 min-w-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {onClick || !href ? (
        <button
          type="button"
          onClick={onClick}
          {...dataDisabledProps(disabled)}
          className={sharedClassName}
          aria-current={current ? "page" : undefined}
          aria-expanded={typeof expanded === "boolean" ? expanded : undefined}
          title={collapsed ? label : undefined}
        >
          {content}
        </button>
      ) : (
        <Link
          href={href}
          {...dataDisabledProps(disabled)}
          className={sharedClassName}
          aria-current={current ? "page" : undefined}
          title={collapsed ? label : undefined}
        >
          {content}
        </Link>
      )}

      {collapsed && showTooltip && tooltipPosition && (
        <SidebarTooltip label={label} position={tooltipPosition} />
      )}
    </div>
  );
}
