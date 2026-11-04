"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { Text } from "@/components/atoms/Text";
import { NavItem } from "@/components/molecules/NavItem";
import { SidebarFlyout } from "@/components/organisms/sidebar/SidebarFlyout";
import { getNavigationItemKey } from "@/lib/navigation";
import type { NavItemType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SidebarSectionProps {
  title?: string;
  items: NavItemType[];
  collapsed: boolean;
  expandedKeys: Set<string>;
  onToggleExpand?: (key: string) => void;
}

interface TreeItemProps {
  item: NavItemType;
  depth: number;
  collapsed: boolean;
  expandedKeys: Set<string>;
  onToggleExpand?: (key: string) => void;
}

function TreeItem({
  item,
  depth,
  collapsed,
  expandedKeys,
  onToggleExpand,
}: TreeItemProps) {
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutPosition, setFlyoutPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const itemRef = useRef<HTMLLIElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  const hasChildren = !!item.children?.length;
  const isRoot = depth === 0;
  const variant = isRoot ? "default" : "nested";
  const key = getNavigationItemKey(item);
  const showFlyout = collapsed && isRoot && hasChildren;

  const expanded = expandedKeys.has(key) || hoverExpanded;

  const showChildren = hasChildren && !collapsed && expanded;

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openFlyout = useCallback(() => {
    const rect = itemRef.current?.getBoundingClientRect();
    if (!rect) return;

    cancelClose();
    setFlyoutPosition({ top: rect.top, left: rect.right + 8 });
    setFlyoutOpen(true);
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setFlyoutOpen(false), 120);
  }, [cancelClose]);

  const [prevShowFlyout, setPrevShowFlyout] = useState(showFlyout);
  if (prevShowFlyout !== showFlyout) {
    setPrevShowFlyout(showFlyout);
    if (!showFlyout) setFlyoutOpen(false);
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <li
      ref={itemRef}
      className="relative"
      onMouseEnter={() => {
        if (!collapsed && hasChildren) setHoverExpanded(true);
        if (showFlyout) openFlyout();
      }}
      onMouseLeave={() => {
        if (!collapsed && hasChildren) setHoverExpanded(false);
        if (showFlyout) scheduleClose();
      }}
    >
      <div className="relative flex items-center gap-1 overflow-visible">
        <NavItem
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={item.active}
          current={item.current}
          collapsed={collapsed && isRoot}
          variant={variant}
          disableIconHoverScale={true}
          suppressTooltip={showFlyout}
          className={cn(
            depth > 0 && "min-h-10",
            collapsed && isRoot ? "mx-auto flex-none" : "flex-1 min-w-0",
          )}
          labelClassName={cn(
            depth > 0 && "text-sm font-medium pl-0.5",
            depth > 0 && !item.icon && "pl-3",
          )}
        />
        {hasChildren && !collapsed && onToggleExpand && (
          <button
            type="button"
            onClick={() => onToggleExpand(key)}
            aria-expanded={expanded}
            aria-label={
              expanded ? `Contraer ${item.label}` : `Desplegar ${item.label}`
            }
            className="flex size-7 flex-none items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-primary-500"
          >
            <FiChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                expanded && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        )}
      </div>

      {hasChildren && (
        <div
          aria-hidden={!showChildren}
          className={cn(
            "ml-7 overflow-hidden border-l border-slate-200/80 pl-4 pr-1",
            depth > 0 && "ml-5",
            "transition-[max-height,opacity,margin,padding] duration-300",
            showChildren ? "mt-1 py-1" : "mt-0 py-0",
            showChildren
              ? "max-h-96 opacity-100"
              : "max-h-0 opacity-0 pointer-events-none",
          )}
        >
          <ul className="flex flex-col gap-2">
            {item.children!.map((child) => (
              <TreeItem
                key={`${child.href}-${child.label}`}
                item={child}
                depth={depth + 1}
                collapsed={collapsed}
                expandedKeys={expandedKeys}
                onToggleExpand={onToggleExpand}
              />
            ))}
          </ul>
        </div>
      )}

      {showFlyout && flyoutOpen && flyoutPosition && (
        <SidebarFlyout
          label={item.label}
          items={item.children ?? []}
          position={flyoutPosition}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </li>
  );
}

/**
 * Renders a titled sidebar section with nested navigation items.
 * Used in X case: grouping links inside the left app navigation.
 */
export function SidebarSection({
  title,
  items,
  collapsed,
  expandedKeys,
  onToggleExpand,
}: SidebarSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      {title && (
        <div
          className={cn(
            "overflow-hidden transition-[max-height,opacity] duration-300",
            collapsed ? "max-h-0 opacity-0" : "max-h-8 opacity-100",
          )}
        >
          <Text
            as="p"
            size="xs"
            weight="bold"
            uppercase
            tracking="widest"
            className="px-3 text-slate-400"
          >
            {title}
          </Text>
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <TreeItem
            key={`${item.href}-${item.label}`}
            item={item}
            depth={0}
            collapsed={collapsed}
            expandedKeys={expandedKeys}
            onToggleExpand={onToggleExpand}
          />
        ))}
      </ul>
    </div>
  );
}
