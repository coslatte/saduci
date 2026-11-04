import { cn, dataDisabledProps } from "@/lib/utils";
import { HTMLAttributes } from "react";

export type SkeletonVariant = "text" | "rect" | "circle";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Shape preset: `text` reserves a line, `rect` a block, `circle` an avatar.
   * Sizing still comes from `className` (e.g. `h-48 w-full`).
   */
  variant?: SkeletonVariant;
  /** When true, uses a static pulse instead of the moving shimmer. */
  static?: boolean;
  /** Attaches `data-disabled` for styling or testing. */
  disabled?: boolean;
}

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
  text: "h-4 w-full rounded-md",
  rect: "rounded-md",
  circle: "rounded-full",
};

/**
 * Skeleton
 *
 * Placeholder used while content is loading. By default it sweeps a shimmer
 * highlight; under `prefers-reduced-motion` the highlight is hidden and the
 * block falls back to `animate-pulse`, so motion-sensitive users get a calm
 * placeholder. It is decorative, hence `aria-hidden`.
 *
 * Used in X case: temporary placeholders during async content rendering.
 */
export function Skeleton({
  className,
  variant = "rect",
  static: isStatic = false,
  disabled,
  ...rest
}: SkeletonProps) {
  return (
    <div
      {...dataDisabledProps(disabled)}
      {...rest}
      aria-hidden="true"
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden bg-zinc-200/80 motion-reduce:animate-pulse",
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {!isStatic && (
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent motion-reduce:hidden"
        />
      )}
    </div>
  );
}
