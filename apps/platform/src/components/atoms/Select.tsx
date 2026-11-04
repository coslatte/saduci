import { cn, dataDisabledProps } from "@/lib/utils";
import { inter } from "@/lib/fonts";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  fullWidth?: boolean;
}

const SELECT_BASE = [
  "h-9 rounded-lg border bg-white px-3 text-(length:--font-size-sm) text-zinc-900 shadow-xs",
  "transition-colors duration-150",
  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

/**
 * Select
 *
 * Basic select input that mirrors the visual style of the `Input` component.
 * Supports an `error` visual state and optional full width behavior.
 * Used in X case: native dropdown fields in generic form components.
 */
export function Select({
  error,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: SelectProps) {
  return (
    <select
      className={cn(
        // Apply the app font class explicitly so form controls (select/options)
        // inherit the same webfont as the rest of the app. Some UAs still
        // render native dropdowns with system fonts, but this increases
        // consistency where possible.
        inter.className,
        SELECT_BASE,
        error
          ? "border-red-400 focus:ring-red-500 focus:border-red-500"
          : "border-zinc-300",
        fullWidth && "w-full",
        className,
      )}
      disabled={disabled}
      {...dataDisabledProps(disabled)}
      {...props}
    >
      {children}
    </select>
  );
}
