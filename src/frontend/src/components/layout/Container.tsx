import { cn, dataDisabledProps } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

/**
 * Centers page content and constrains width with size presets.
 * Used in X case: wrapping route content with consistent horizontal padding.
 */
export function Container({
  className,
  size = "lg",
  disabled,
  ...props
}: ContainerProps & { disabled?: boolean }) {
  return (
    <div
      {...dataDisabledProps(disabled)}
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        size === "sm"
          ? "max-w-3xl"
          : size === "md"
            ? "max-w-5xl"
            : size === "lg"
              ? "max-w-7xl"
              : size === "xl"
                ? "max-w-384"
                : "max-w-full",
        className,
      )}
      {...props}
    />
  );
}
