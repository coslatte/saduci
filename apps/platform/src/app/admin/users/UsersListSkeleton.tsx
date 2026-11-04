import { Skeleton } from "@/components/atoms/Skeleton";
import { LOADING_LABELS } from "@/constants/loading";

interface UsersListSkeletonProps {
  /** Number of user card placeholders to reserve. */
  count?: number;
}

/**
 * UsersListSkeleton
 *
 * Placeholder for the admin user cards, shared by the route-level `loading.tsx`
 * and the in-page loading state so both look identical.
 * Used in X case: loading state for the user management screen.
 */
export function UsersListSkeleton({ count = 4 }: UsersListSkeletonProps) {
  return (
    <div
      className="grid gap-4"
      role="status"
      aria-busy="true"
      aria-label={LOADING_LABELS.users}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" className="size-10" />
            <div className="flex flex-col gap-2">
              <Skeleton variant="text" className="h-4 w-32" />
              <Skeleton variant="text" className="h-3 w-48" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
