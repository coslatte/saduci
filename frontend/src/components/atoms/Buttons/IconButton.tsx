import { BaseButton, BaseButtonProps } from "./BaseButton";
import { cn } from "@/lib/utils";
import type { Size } from "@/lib/types";
import { IconButtonVariant } from "./constants";
import { ReactElement } from "react";

export interface IconButtonProps extends Omit<BaseButtonProps, "className"> {
  variant?: IconButtonVariant;
  size?: Size;
  icon: ReactElement;
  "aria-label": string;
  className?: string;
}

/**
 * IconButton
 *
 * Compact round button variant intended to display a single icon. `aria-label`
 * must be provided to ensure accessibility.
 * Used in X case: toolbar and inline icon-only action controls.
 */
export function IconButton({
  variant = "secondary",
  size = "md",
  className,
  icon,
  ...props
}: IconButtonProps) {
  const buttonSize =
    size === "xs"
      ? "size-7"
      : size === "sm"
        ? "size-8"
        : size === "md"
          ? "size-9"
          : size === "lg"
            ? "size-10"
            : "size-12";

  const iconSize =
    size === "xs"
      ? "text-(length:--font-size-xs)"
      : size === "sm"
        ? "text-(length:--font-size-sm)"
        : size === "md"
          ? "text-(length:--font-size-base)"
          : size === "lg"
            ? "text-(length:--font-size-lg)"
            : "text-(length:--font-size-xl)";

  const variantClass = (() => {
    switch (variant) {
      case "primary":
        return "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus-visible:ring-primary-500";
      case "glass":
        return "glass-noise-primary text-primary-950 focus-visible:ring-primary-400";
      case "secondary":
        return "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:bg-zinc-300 focus-visible:ring-zinc-400";
      case "outline":
        return "border border-zinc-300 bg-transparent text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 focus-visible:ring-zinc-400";
      case "ghost":
        return "bg-transparent text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 focus-visible:ring-zinc-400";
      case "danger":
        return "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500";
      default:
        return "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 focus-visible:ring-green-500";
    }
  })();

  return (
    <BaseButton
      size={size}
      className={cn(
        "rounded-full shrink-0",
        variantClass,
        buttonSize,
        className,
      )}
      {...props}
    >
      <span className={cn("inline-flex items-center justify-center", iconSize)}>
        {icon}
      </span>
    </BaseButton>
  );
}
