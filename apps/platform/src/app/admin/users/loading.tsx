import { Skeleton } from "@/components/atoms/Skeleton";
import { UsersListSkeleton } from "./UsersListSkeleton";

export default function UsersLoading() {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton variant="text" className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      <UsersListSkeleton />
    </div>
  );
}
