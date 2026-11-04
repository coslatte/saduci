"use client";

import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { inter } from "@/lib/fonts";
import { Z_INDEX } from "@/lib/zIndex";
import { FiChevronDown } from "react-icons/fi";
import { HelpTooltipButton } from "@/components/atoms/HelpTooltipButton";

interface Option {
  value: string;
  label: string;
}

interface AccessibleSelectProps {
  id?: string;
  value: string | number;
  onChange: (v: string | number) => void;
  options: Option[];
  fullWidth?: boolean;
  className?: string;
  help?: string;
}

interface ListPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

const LIST_MAX_HEIGHT = 192;
const VIEWPORT_MARGIN = 8;

/**
 * Accessible custom select implemented without external deps.
 * Renders a native hidden <select> (sr-only) for form compatibility and tests,
 * and a custom button + listbox for consistent styling across platforms.
 *
 * The listbox renders in a body portal with `position: fixed`, so it never
 * paints above the navbar/shell chrome and never gets clipped by card or
 * main overflow. It flips above the trigger when space below is tight.
 */
export function AccessibleSelect({
  id,
  value,
  onChange,
  options,
  fullWidth = false,
  className,
  help,
}: AccessibleSelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<ListPosition | null>(null);
  const generatedId = useId();
  const controlId = id ?? `accessible-select-${generatedId}`;
  const listId = `${controlId}-listbox`;
  const helpId = `${controlId}-help`;
  const hasHelp = Boolean(help);
  const [highlight, setHighlight] = useState<number>(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === String(value)),
    ),
  );
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const pathname = usePathname();

  // Sync highlight with external value changes without needing an effect.
  const [trackedValue, setTrackedValue] = useState<string | number>(value);
  if (trackedValue !== value) {
    setTrackedValue(value);
    setHighlight(
      Math.max(
        0,
        options.findIndex((o) => o.value === String(value)),
      ),
    );
  }

  const selected = options.find((o) => o.value === String(value));

  function close(returnFocus: boolean): void {
    setOpen(false);
    setPosition(null);
    if (returnFocus) buttonRef.current?.focus();
  }

  useLayoutEffect(() => {
    if (!open) return;

    function computePosition(): void {
      const trigger = buttonRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const spaceBelow = window.innerHeight - trigger.bottom - VIEWPORT_MARGIN;
      const spaceAbove = trigger.top - VIEWPORT_MARGIN;
      const placeAbove =
        spaceBelow < Math.min(LIST_MAX_HEIGHT, spaceAbove) + 16 &&
        spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        64,
        Math.min(LIST_MAX_HEIGHT, (placeAbove ? spaceAbove : spaceBelow) - 8),
      );
      const left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(
          trigger.left,
          window.innerWidth - trigger.width - VIEWPORT_MARGIN,
        ),
      );
      setPosition({
        top: placeAbove
          ? Math.max(VIEWPORT_MARGIN, trigger.top - maxHeight - 4)
          : trigger.bottom + 4,
        left,
        width: trigger.width,
        maxHeight,
      });
    }

    computePosition();
    window.addEventListener("resize", computePosition);
    window.addEventListener("scroll", computePosition, {
      passive: true,
      capture: true,
    });
    return () => {
      window.removeEventListener("resize", computePosition);
      window.removeEventListener("scroll", computePosition, {
        capture: true,
      } as EventListenerOptions);
    };
    // Reposition only on open; highlight changes must not recompute.
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        !buttonRef.current?.contains(e.target as Node) &&
        !listRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
        setPosition(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(true);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // An open list never survives navigation (render-phase adjustment, same
  // pattern as the tracked value above).
  const [trackedPath, setTrackedPath] = useState(pathname);
  if (trackedPath !== pathname) {
    setTrackedPath(pathname);
    if (open) {
      setOpen(false);
      setPosition(null);
    }
  }

  // Keep the highlighted option visible without stale closures.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${highlight}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [highlight, open]);

  function toggleOpen() {
    if (open) {
      close(false);
      return;
    }
    setHighlight(
      Math.max(
        0,
        options.findIndex((o) => o.value === String(value)),
      ),
    );
    setOpen(true);
  }

  function choose(index: number) {
    const opt = options[index];
    if (opt) onChange(opt.value);
    close(false);
  }

  function moveHighlight(delta: number) {
    setHighlight((h) => Math.min(options.length - 1, Math.max(0, h + delta)));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveHighlight(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveHighlight(-1);
    } else if (e.key === "Home" && open) {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === "End" && open) {
      e.preventDefault();
      setHighlight(options.length - 1);
    } else if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      choose(highlight);
    } else if (e.key === "Enter" && !open) {
      e.preventDefault();
      setOpen(true);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab" && open) {
      close(false);
    }
  }

  return (
    <div className={cn("relative", fullWidth && "w-full", className)}>
      {/* Hidden native select kept for form semantics and tests; visually hidden */}
      <select
        id={id}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-opt-${highlight}` : undefined}
        aria-describedby={hasHelp ? helpId : undefined}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={cn(
          inter.className,
          "h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-left text-(length:--font-size-sm) text-zinc-800 shadow-xs",
          hasHelp ? "pr-16" : "pr-9",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
          "hover:border-zinc-400 transition-colors duration-150",
        )}
      >
        <span className="block truncate">
          {selected?.label ?? "Seleccionar"}
        </span>
        <FiChevronDown
          className={cn(
            "absolute top-1/2 -translate-y-1/2 size-4 text-zinc-400 transition-transform duration-150 pointer-events-none",
            hasHelp ? "right-8" : "right-2.5",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            role="listbox"
            id={listId}
            ref={listRef}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className={cn(
              "fixed overflow-auto rounded-lg border border-zinc-200 bg-white p-1 text-(length:--font-size-sm) shadow-lg",
              Z_INDEX.select,
            )}
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={String(value) === o.value}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(i)}
                className={cn(
                  "cursor-pointer rounded px-2 py-1",
                  highlight === i ? "bg-slate-100" : "",
                  String(value) === o.value ? "font-semibold" : "",
                )}
              >
                {o.label}
              </li>
            ))}
          </ul>,
          document.body,
        )}

      {help && (
        <>
          <span id={helpId} className="sr-only">
            {help}
          </span>
          <HelpTooltipButton
            help={help}
            className="absolute -translate-y-1/2 right-2 top-1/2"
            buttonClassName="flex items-center justify-center cursor-help"
          />
        </>
      )}
    </div>
  );
}

export default AccessibleSelect;
