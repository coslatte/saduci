import { Skeleton } from "@/components/atoms/Skeleton";
import { LOADING_LABELS } from "@/constants/loading";
import { cn } from "@/lib/utils";

interface AppShellSkeletonProps {
  /** Progressive status line, e.g. "Verificando tu sesión…". */
  message?: string;
  className?: string;
}

/**
 * AppShellSkeleton
 *
 * Full-app placeholder that mirrors the sidebar, navbar and content frame.
 * Used while the session is being verified so entering the app shows structure
 * instead of a blank screen or a bare "Cargando…" line.
 *
 * @example
 * <AppShellSkeleton message="Verificando tu sesión…" />
 */
export function AppShellSkeleton({
  message = LOADING_LABELS.session,
  className,
}: AppShellSkeletonProps) {
  return (
    <div
      className={cn(
        "flex min-h-dvh w-full overflow-hidden bg-slate-100/60",
        className,
      )}
      role="status"
      aria-busy="true"
      aria-label={message}
    >
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col gap-6 border-r border-slate-200 bg-white p-5 lg:flex">
        <Skeleton className="h-8 w-40" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} variant="text" className="h-5 w-full" />
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
        <header className="fixed inset-x-0 top-0 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:left-72 lg:px-8">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" className="size-8" />
            <Skeleton className="hidden h-4 w-24 sm:block" />
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 px-4 pb-12 pt-20 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </main>
      </div>

      <span className="sr-only">{message}</span>
    </div>
  );
}

export default AppShellSkeleton;
