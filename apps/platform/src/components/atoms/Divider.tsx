import { cn, dataDisabledProps } from "@/lib/utils";
import { HTMLAttributes } from "react";

/**
 * Props for `Divider`.
 */
interface DividerProps extends HTMLAttributes<HTMLHRElement | HTMLDivElement> {
  /** Orientation of the divider; vertical renders as a thin column */
  orientation?: "horizontal" | "vertical";
  /** When true attaches data-disabled attribute for styling/tests */
  disabled?: boolean;
}

/**
 * Divider
 *
 * Simple visual separator. Renders either an <hr> for horizontal separators
 * or a <div> for vertical separators. It sets `role="separator"` and the
 * appropriate `aria-orientation` value.
 * Used in X case: separating related UI regions in cards and layouts.
 */
export function Divider({
  className,
  orientation = "horizontal",
  disabled,
  ...props
}: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div
        {...dataDisabledProps(disabled)}
        className={cn("h-full w-px bg-zinc-200", className)}
        role="separator"
        aria-orientation="vertical"
        {...props}
      />
    );
  }
  return (
    <hr
      {...dataDisabledProps(disabled)}
      className={cn("w-full border-t border-zinc-200", className)}
      role="separator"
      aria-orientation="horizontal"
      {...props}
    />
  );
}
