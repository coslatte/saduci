import type { ReactNode } from "react";
import { Text } from "@/components/atoms/Text";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional leading icon, typically a react-icon sized 32. */
  icon?: ReactNode;
  /** Optional call to action (button or link). */
  action?: ReactNode;
  className?: string;
}

/**
 * EmptyState
 *
 * Standard "there is nothing here" surface: a dashed panel with an optional
 * icon, a short message and an optional call to action. It replaces the ad-hoc
 * empty blocks each screen used to invent.
 *
 * Used in X case: empty tables, lists and record collections.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center",
        className,
      )}
    >
      {icon && <div className="text-slate-300">{icon}</div>}
      <Text as="p" size="sm" weight="medium" className="text-slate-600">
        {title}
      </Text>
      {description && (
        <Text as="p" size="xs" muted className="max-w-md">
          {description}
        </Text>
      )}
      {action}
    </div>
  );
}
