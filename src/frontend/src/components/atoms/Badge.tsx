import { cn, dataDisabledProps } from "@/lib/utils";
import type { Status } from "@/lib/types";

/**
 * Props for `Badge` component.
 */
interface BadgeProps {
  /** Semantic status to apply color styles (e.g., success, warning) */
  status?: Status;
  /** Visible badge content (label) */
  children: React.ReactNode;
  /** Extra className to merge into the root */
  className?: string;
  /** Mark the component as visually disabled for styling/tests */
  disabled?: boolean;
}

/**
 * Badge
 *
 * Small status badge used to convey lightweight semantic states.
 * Used in X case: showing compact status labels in results and summaries.
 */
export function Badge({
  status = "default",
  className,
  children,
  disabled,
}: BadgeProps) {
  return (
    <span
      {...dataDisabledProps(disabled)}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-(length:--font-size-xs) font-medium",
        {
          default: "bg-zinc-100 text-zinc-700",
          info: "bg-secondary-50 text-secondary-700",
          success: "bg-primary-50 text-primary-700",
          warning: "bg-amber-50 text-amber-700",
          danger: "bg-red-50 text-red-700",
        }[status],
        className,
      )}
    >
      {children}
    </span>
  );
}
