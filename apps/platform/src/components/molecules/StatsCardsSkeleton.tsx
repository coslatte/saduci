import { Skeleton } from "@/components/atoms/Skeleton";
import { LOADING_LABELS } from "@/constants/loading";
import { cn } from "@/lib/utils";

interface StatsCardsSkeletonProps {
  /** Number of metric cards to reserve. */
  count?: number;
  /** Time-aware status line shown and announced below the placeholder. */
  label?: string;
  className?: string;
}

/**
 * StatsCardsSkeleton
 *
 * Placeholder for the dashboard metric cards. Reserves the same two-column
 * rhythm the real cards use so the header does not reflow on load.
 * Used in X case: loading state for `DashboardStatsCards`.
 */
export function StatsCardsSkeleton({
  count = 2,
  label = LOADING_LABELS.totals,
  className,
}: StatsCardsSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)} aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="rounded-xl border border-zinc-200 bg-white px-5 py-4"
          >
            <Skeleton variant="text" className="h-4 w-32" />
            <Skeleton variant="text" className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>
      <p
        role="status"
        aria-live="polite"
        className="text-(length:--font-size-sm) text-slate-500"
      >
        {label}
      </p>
    </div>
  );
}
