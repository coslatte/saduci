import { Skeleton } from "@/components/atoms/Skeleton";
import { LOADING_LABELS } from "@/constants/loading";
import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  /** Number of columns to reserve. */
  columns?: number;
  /** Number of placeholder rows. */
  rows?: number;
  /** Time-aware status line shown and announced below the placeholder. */
  label?: string;
  className?: string;
}

/**
 * TableSkeleton
 *
 * Column-aligned placeholder for an API-backed table. It mirrors the real
 * header/row rhythm so the layout does not jump when the data arrives, and
 * shows the current loading message so a long wait is not silent.
 * Used in X case: loading state for `Table` and records listings.
 */
export function TableSkeleton({
  columns = 5,
  rows = 6,
  label = LOADING_LABELS.data,
  className,
}: TableSkeletonProps) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  } as const;

  return (
    <div className={cn("w-full", className)} aria-busy="true">
      <div aria-hidden="true">
        <div
          className="grid gap-4 border-b border-zinc-200 py-3"
          style={gridStyle}
        >
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton key={column} variant="text" className="h-4 w-4/5" />
          ))}
        </div>
        <div className="flex flex-col gap-4 pt-4">
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="grid gap-4" style={gridStyle}>
              {Array.from({ length: columns }, (_, column) => (
                <Skeleton key={column} variant="text" className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="mt-4 text-center text-(length:--font-size-sm) text-slate-500"
      >
        {label}
      </p>
    </div>
  );
}
