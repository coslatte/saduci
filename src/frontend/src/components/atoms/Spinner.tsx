import { cn, dataDisabledProps } from "@/lib/utils";
import type { Size } from "@/lib/types";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

interface SpinnerProps {
  // we allow the full range of the generic Size type, including xl
  size?: Extract<Size, "xs" | "sm" | "md" | "lg" | "xl">;
  className?: string;
  label?: string;
  disabled?: boolean;
}

/**
 * Spinner
 *
 * Icon-based spinner used to indicate loading states. Provides a readable
 * `aria-label` and supports a size token mapped to utility classes.
 * Used in X case: inline busy indicators in buttons, forms, and panels.
 */
export function Spinner({
  size = "md",
  className,
  label = "Loading...",
  disabled,
}: SpinnerProps) {
  const sizeClass =
    size === "xs"
      ? "size-3"
      : size === "sm"
        ? "size-4"
        : size === "md"
          ? "size-6"
          : size === "lg"
            ? "size-8"
            : "size-10";

  return (
    <AiOutlineLoading3Quarters
      {...dataDisabledProps(disabled)}
      className={cn("animate-spin text-primary-600", sizeClass, className)}
      role="status"
      aria-label={label}
    />
  );
}
