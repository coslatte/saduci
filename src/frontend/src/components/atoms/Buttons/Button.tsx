import { BaseButton, BaseButtonProps } from "./BaseButton";
import { cn } from "@/lib/utils";
import type { Size, Variant } from "@/lib/types";
import React from "react";

export interface ButtonProps extends Omit<BaseButtonProps, "className"> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Button
 *
 * High-level button component exposing `variant` and `size` tokens used by the
 * design system. It composes `BaseButton` and applies variant/size utility
 * classes.
 * Used in X case: primary and secondary action buttons across the app.
 */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  const variantClass = (() => {
    switch (variant) {
      case "primary":
        return "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus-visible:ring-primary-500";
      case "glass":
        return "glass-noise-primary text-slate-100 border-primary-700 focus:ring-primary-300";
      case "secondary":
        return "bg-slate-200 text-slate-900 hover:bg-slate-100 active:bg-slate-300 focus-visible:ring-slate-400 focus-visible:border-slate-100";
      case "outline":
        return "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-400";
      case "ghost":
        return "bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400";
      case "danger":
        return "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-400";
      case "success":
        return "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 focus-visible:ring-green-500";
      default:
        return "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 active:bg-zinc-300 focus-visible:ring-zinc-400";
    }
  })();

  const sizeClass =
    size === "xs"
      ? "h-6 px-2 text-(length:--font-size-xs) gap-1"
      : size === "sm"
        ? "h-7 px-3 text-(length:--font-size-sm) gap-1.5"
        : size === "md"
          ? "h-8 px-3.5 text-(length:--font-size-sm) gap-2"
          : size === "lg"
            ? "h-9 px-4 text-(length:--font-size-base) gap-2"
            : "h-10 px-5 text-(length:--font-size-base) gap-2.5";

  return (
    <BaseButton
      size={size}
      className={cn(
        variant === "circle" ? "rounded-full" : "rounded-lg",
        variantClass,
        sizeClass,
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}
