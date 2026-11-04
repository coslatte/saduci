import { Skeleton } from "@/components/atoms/Skeleton";
import { StatsCardsSkeleton } from "@/components/molecules/StatsCardsSkeleton";

export default function HomeLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton variant="text" className="h-5 w-full max-w-2xl" />
      </div>
      <StatsCardsSkeleton />
    </div>
  );
}
