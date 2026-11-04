import { Skeleton } from "@/components/atoms/Skeleton";
import { TableSkeleton } from "@/components/molecules/TableSkeleton";

interface RecordsListSkeletonProps {
  /** Number of table columns to reserve. */
  columns?: number;
  /** Number of placeholder rows. */
  rows?: number;
}

/**
 * RecordsListSkeleton
 *
 * Route-level placeholder shared by the records listing pages. Mirrors the
 * page header, the action row and the table frame so the layout stays put.
 * Used in X case: `loading.tsx` for records list routes.
 */
export function RecordsListSkeleton({
  columns = 7,
  rows = 6,
}: RecordsListSkeletonProps) {
  return (
    <main>
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton variant="text" className="h-4 w-full max-w-md" />
        <Skeleton variant="text" className="h-4 w-40" />
      </div>

      <div className="mb-4 flex items-center justify-end gap-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 sm:px-5">
        <TableSkeleton columns={columns} rows={rows} />
      </div>
    </main>
  );
}
