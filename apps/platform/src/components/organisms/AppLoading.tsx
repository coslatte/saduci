import { Spinner } from "@/components/atoms";
import { cn } from "@/lib/utils";

interface AppLoadingProps {
  className?: string;
}

/**
 * AppLoading
 *
 * Simple full-page loading placeholder used by pages while async data is
 * being resolved. The component centers a `Spinner` and accepts a
 * `className` to merge into the outer container.
 * Used in X case: route loading placeholders during async data fetches.
 */
export function AppLoading({ className }: AppLoadingProps) {
  return (
    <div
      className={cn("flex min-h-[60vh] items-center justify-center", className)}
    >
      <Spinner size="lg" label="Cargando..." />
    </div>
  );
}

export default AppLoading;
