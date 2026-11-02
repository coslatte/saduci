"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { inter } from "@/lib/fonts";
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

/**
 * Accessible custom select implemented without external deps.
 * Renders a native hidden <select> (sr-only) for form compatibility and tests,
 * and a custom button + popover list for consistent styling across platforms.
 * Used in X case: consistent select inputs for simulation and statistics forms.
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
  const hasHelp = Boolean(help);
  const [highlight, setHighlight] = useState<number>(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === String(value)),
    ),
  );
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

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

  //
  // --- useEffects ---
  //
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        !buttonRef.current?.contains(e.target as Node) &&
        !listRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = options.find((o) => o.value === String(value)) || options[0];

  function toggleOpen() {
    setOpen((s) => !s);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(options.length - 1, h + 1));
      requestAnimationFrame(() => {
        listRef.current
          ?.querySelectorAll("li")
          [highlight + 1]?.scrollIntoView({ block: "nearest" });
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.max(0, h - 1));
      requestAnimationFrame(() => {
        listRef.current
          ?.querySelectorAll("li")
          [highlight - 1]?.scrollIntoView({ block: "nearest" });
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) onChange(opt.value);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
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
        aria-hidden="false"
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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={id}
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
        <span className="block truncate">{selected?.label}</span>
        <FiChevronDown
          className={cn(
            "absolute top-1/2 -translate-y-1/2 size-4 text-zinc-400 transition-transform duration-150 pointer-events-none",
            hasHelp ? "right-8" : "right-2.5",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={id}
          ref={listRef}
          tabIndex={-1}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-zinc-300 bg-white p-1 text-(length:--font-size-sm) shadow-lg"
          onKeyDown={handleKeyDown}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={String(value) === o.value}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn(
                "cursor-pointer rounded px-2 py-1",
                highlight === i ? "bg-primary-100" : "",
                String(value) === o.value ? "font-semibold" : "",
              )}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}

      {help && (
        <HelpTooltipButton
          help={help}
          className="absolute -translate-y-1/2 right-2 top-1/2"
          buttonClassName="flex items-center justify-center cursor-help"
        />
      )}
    </div>
  );
}

export default AccessibleSelect;
