"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { NavItem } from "@/components/molecules/NavItem";
import type { NavItemType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/lib/zIndex";

interface SidebarFlyoutProps {
  label: string;
  items: NavItemType[];
  position: { top: number; left: number };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * Floating submenu shown when a collapsed sidebar item with children is hovered.
 * Used in X case: keeping nested routes reachable while the sidebar is compact.
 */
export function SidebarFlyout({
  label,
  items,
  position,
  onMouseEnter,
  onMouseLeave,
}: SidebarFlyoutProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.remove("opacity-0", "scale-95");
        el.classList.add("opacity-100", "scale-100");
      });
    });
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn("fixed -translate-y-2", Z_INDEX.popover)}
      style={{ top: position.top, left: position.left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        ref={panelRef}
        className="w-60 origin-top-left scale-95 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition-all duration-150"
      >
        <p className="px-3 pb-1.5 pt-1 text-(length:--font-size-xs) font-bold uppercase tracking-widest text-slate-800">
          {label}
        </p>
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <NavItem
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={item.active}
                current={item.current}
                variant="nested"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
