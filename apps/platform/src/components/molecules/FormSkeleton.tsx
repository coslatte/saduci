import { Skeleton } from "@/components/atoms/Skeleton";
import { LOADING_LABELS } from "@/constants/loading";
import { cn } from "@/lib/utils";

interface FormSkeletonProps {
  /** Number of field blocks (label + input) to reserve. */
  fields?: number;
  /** Reserve a wide submit button at the bottom. */
  withAction?: boolean;
  className?: string;
}

/**
 * FormSkeleton
 *
 * Placeholder for a form panel: stacked labels with full-width inputs, and an
 * optional action button. Keeps the form height stable while data loads.
 * Used in X case: loading state for form-driven screens.
 */
export function FormSkeleton({
  fields = 4,
  withAction = true,
  className,
}: FormSkeletonProps) {
  return (
    <div
      className={cn("flex flex-col gap-5", className)}
      role="status"
      aria-busy="true"
      aria-label={LOADING_LABELS.data}
    >
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton variant="text" className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      {withAction && <Skeleton className="mt-1 h-11 w-full rounded-xl" />}
    </div>
  );
}
