import { Skeleton } from "@/components/atoms/Skeleton";
import { DetailSkeleton } from "@/components/molecules/DetailSkeleton";

/**
 * RecordDetailSkeleton
 *
 * Route-level placeholder for a record detail page: back link, header and the
 * stacked content panels.
 * Used in X case: `loading.tsx` for records detail routes.
 */
export function RecordDetailSkeleton() {
  return (
    <main>
      <Skeleton variant="text" className="mb-4 h-4 w-36" />
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton variant="text" className="h-4 w-full max-w-md" />
      </div>
      <DetailSkeleton sections={3} />
    </main>
  );
}
