import { Skeleton } from "@/components/atoms/Skeleton";
import { LOADING_LABELS } from "@/constants/loading";
import { cn } from "@/lib/utils";

interface DetailSkeletonProps {
  /** Number of stacked content panels to reserve. */
  sections?: number;
  className?: string;
}

/**
 * DetailSkeleton
 *
 * Placeholder for a record detail view: a title block followed by stacked
 * panels. Replaces the ad-hoc per-page skeleton stacks.
 * Used in X case: loading state for the record detail routes.
 */
export function DetailSkeleton({
  sections = 3,
  className,
}: DetailSkeletonProps) {
  const heights = ["h-32", "h-48", "h-64"];

  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      role="status"
      aria-busy="true"
      aria-label={LOADING_LABELS.data}
    >
      <Skeleton variant="text" className="h-6 w-56" />
      {Array.from({ length: sections }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("w-full rounded-2xl", heights[index] ?? "h-48")}
        />
      ))}
    </div>
  );
}
