"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  closeOnSelect?: boolean;
  /** If true, open the popover on hover instead of click */
  openOnHover?: boolean;
}

/**
 * Popover
 *
 * A lightweight portal-backed popover/dialog used for small interactive panels
 * (notifications, menus, etc.). The popover clones native interactive triggers
 * (button, anchor) to avoid invalid nested interactive elements; non-interactive
 * triggers (like <span>) are wrapped in a button.
 *
 * Accessibility notes:
 * - The trigger receives `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`.
 * - The content uses `role="dialog"` but is non-modal (aria-modal=false).
 *
 * @param trigger - React node used to toggle the popover. Can be a native element
 *                  (button/a) or any other node. Native interactive triggers are
 *                  cloned to preserve valid HTML.
 * @param children - Content rendered inside the popover
 * @param align - Horizontal alignment of the popover relative to the trigger
 * @param className - Optional className applied to the wrapper
 * @param closeOnSelect - If true, clicking a button/link inside the popover will close it
 * Used in X case: opening lightweight overlay panels like notifications.
 */
export function Popover({
  trigger,
  children,
  align = "right",
  className,
  closeOnSelect = true,
  openOnHover = false,
}: PopoverProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [entering, setEntering] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{
    top?: number;
    left: number;
  } | null>(null);
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const [hoverTimeoutId, setHoverTimeoutId] = useState<number | null>(null);
  const [pinnedByClick, setPinnedByClick] = useState(false);

  const VIEWPORT_MARGIN = 8;

  const openPopover = useCallback(() => {
    if (!open) {
      setEntering(true);
      setOpen(true);
    }
  }, [open]);

  const clearHoverCloseTimeout = useCallback(() => {
    if (hoverTimeoutId !== null) {
      window.clearTimeout(hoverTimeoutId);
      setHoverTimeoutId(null);
    }
  }, [hoverTimeoutId]);

  const scheduleHoverClose = useCallback(() => {
    clearHoverCloseTimeout();
    const timeoutId = window.setTimeout(() => setExiting(true), 120);
    setHoverTimeoutId(timeoutId);
  }, [clearHoverCloseTimeout]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutId !== null) {
        window.clearTimeout(hoverTimeoutId);
      }
    };
  }, [hoverTimeoutId]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(target)) return;
      if (contentRef.current && contentRef.current.contains(target)) return;
      // trigger closing animation
      setPinnedByClick(false);
      setExiting(true);
    }

    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPinnedByClick(false);
        setExiting(true);
      }
    }

    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // If content contains interactive items that should close the popover
  useEffect(() => {
    if (!contentRef.current || !closeOnSelect) return;
    const el = contentRef.current;
    function handler(e: Event) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // close when clicking a button/link inside content
      if (target.closest("button") || target.closest("a")) {
        setExiting(true);
      }
    }

    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [closeOnSelect]);

  // Re-compute position when open/align changes and on resize/scroll.
  useLayoutEffect(() => {
    if (!open) return;

    function compute() {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const maxPanelWidth = Math.max(
        0,
        window.innerWidth - VIEWPORT_MARGIN * 2,
      );
      const measuredPanelWidth = contentRef.current?.offsetWidth ?? 320;
      const PANEL_WIDTH = Math.min(measuredPanelWidth, maxPanelWidth);
      let left = rect.right - PANEL_WIDTH;
      if (align === "left") left = rect.left;
      if (align === "center")
        left = rect.left + rect.width / 2 - PANEL_WIDTH / 2;

      left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(left, window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN),
      );

      const PANEL_MAX_HEIGHT = 360;
      const contentHeight =
        contentRef.current?.offsetHeight ?? PANEL_MAX_HEIGHT;
      const spaceBelow = window.innerHeight - rect.bottom;

      // prefer showing below when there's enough space, otherwise show above
      if (spaceBelow < contentHeight + 16) {
        // place above the trigger, keeping 8px margin
        const top = Math.max(8, rect.top - contentHeight - 8);
        setPlacement("above");
        setPosition({ top, left });
      } else {
        setPlacement("below");
        setPosition({ top: rect.bottom + 8, left });
      }
    }

    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, { passive: true });
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute as EventListener);
    };
  }, [open, align]);

  // clear entering state after one frame to trigger CSS transition
  useEffect(() => {
    if (!entering) return;
    const frame = requestAnimationFrame(() => setEntering(false));
    return () => cancelAnimationFrame(frame);
  }, [entering]);

  // handle exiting animation timing
  useEffect(() => {
    if (!exiting) return;
    // wait for animation then close
    const t = setTimeout(() => {
      setExiting(false);
      setOpen(false);
      setPinnedByClick(false);
      setPosition(null);
      setPlacement("below");
    }, 180);
    return () => clearTimeout(t);
  }, [exiting]);

  const content = (
    <div
      id={id}
      ref={contentRef}
      role="dialog"
      aria-modal={false}
      className={cn(
        "pointer-events-auto inline-block w-fit transform-gpu transition-[opacity,transform] duration-150 z-50",
        align === "left" &&
          (placement === "above" ? "origin-bottom-left" : "origin-top-left"),
        align === "center" &&
          (placement === "above" ? "origin-bottom" : "origin-top"),
        align === "right" &&
          (placement === "above" ? "origin-bottom-right" : "origin-top-right"),
        exiting || entering
          ? "opacity-0 scale-95 pointer-events-none"
          : "opacity-100 scale-100",
      )}
      style={
        position
          ? {
              position: "absolute",
              top: position.top,
              left: position.left,
              maxWidth: "calc(100vw - 16px)",
            }
          : { visibility: "hidden" }
      }
    >
      {children}
    </div>
  );

  // If trigger is a native interactive element (button or anchor) we clone it and
  // attach popover props to avoid nesting an extra <button> which would create
  // invalid HTML and break tests / accessibility. For non-interactive triggers
  // we wrap them in a button so the DOM and keyboard focus behavior remains
  // predictable for consumers and tests.
  const renderTrigger = () => {
    const handleToggle = (e?: React.MouseEvent<HTMLElement>) => {
      // allow original handler to run first
      try {
        if (typeof trigger === "object" && React.isValidElement(trigger)) {
          const origOnClick = (
            trigger.props as {
              onClick?: (e?: React.MouseEvent<HTMLElement>) => void;
            }
          ).onClick;
          if (typeof origOnClick === "function") origOnClick(e);
        }
      } catch {
        // ignore
      }

      if (!open) {
        setPinnedByClick(true);
        clearHoverCloseTimeout();
        openPopover();
        return;
      }

      if (!pinnedByClick) {
        setPinnedByClick(true);
        clearHoverCloseTimeout();
      } else {
        setPinnedByClick(false);
        setExiting(true);
      }
    };

    if (
      React.isValidElement(trigger) &&
      typeof trigger.type === "string" &&
      (trigger.type === "button" || trigger.type === "a")
    ) {
      // native interactive element like 'button' or 'a'
      const isButtonEl = trigger.type === "button";
      const triggerProps = trigger.props as {
        className?: string;
        type?: string;
      };
      const newProps = {
        "aria-haspopup": "dialog" as const,
        "aria-expanded": open,
        "aria-controls": id,
        onClick: handleToggle,
        className: cn("inline-flex items-center", triggerProps.className),
        ...(isButtonEl ? { type: triggerProps.type ?? "button" } : {}),
      };

      return React.cloneElement(
        trigger,
        newProps as React.HTMLAttributes<HTMLElement>,
      );
    }

    // fallback: wrap non-native triggers in a button
    return (
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={handleToggle}
        className="inline-flex items-center"
      >
        {trigger}
      </button>
    );
  };

  // when using hover, keep popover open while pointer is over trigger/content
  useEffect(() => {
    if (!openOnHover) return;
    const triggerEl = wrapperRef.current;
    const el = contentRef.current;
    if (!triggerEl || !el) return;

    function onTriggerEnter() {
      openPopover();
      clearHoverCloseTimeout();
      setPinnedByClick(true);
    }

    function onTriggerLeave() {
      if (pinnedByClick) return;
      scheduleHoverClose();
    }

    function onEnter() {
      clearHoverCloseTimeout();
    }

    function onLeave() {
      if (pinnedByClick) return;
      scheduleHoverClose();
    }

    triggerEl.addEventListener("mouseenter", onTriggerEnter);
    triggerEl.addEventListener("mouseleave", onTriggerLeave);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      triggerEl.removeEventListener("mouseenter", onTriggerEnter);
      triggerEl.removeEventListener("mouseleave", onTriggerLeave);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [
    clearHoverCloseTimeout,
    open,
    openOnHover,
    openPopover,
    pinnedByClick,
    scheduleHoverClose,
  ]);

  return (
    <div className={cn("relative inline-block", className)} ref={wrapperRef}>
      {renderTrigger()}

      {(open || exiting) &&
        createPortal(
          <div
            className="fixed inset-0 z-50 pointer-events-auto overflow-visible"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setPinnedByClick(false);
                setExiting(true);
              }
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </div>
  );
}

export default Popover;
