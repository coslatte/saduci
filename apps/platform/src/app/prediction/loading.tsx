import { Skeleton } from "@/components/atoms/Skeleton";
import { FormSkeleton } from "@/components/molecules/FormSkeleton";

export default function PredictionLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton variant="text" className="h-4 w-full max-w-xl" />
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:gap-6">
        <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-5">
          <FormSkeleton fields={5} />
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 xl:w-[22rem] xl:shrink-0">
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
