import { Skeleton } from "@/components/atoms/Skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton variant="text" className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6 sm:gap-8">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    </div>
  );
}
