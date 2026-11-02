import { cn } from "@/lib/utils";

interface PredictionResultCardProps {
  probability: number;
}

/**
 * Presents predicted mortality probability with status color and progress bar.
 * Used in X case: prediction outcome summary in the prediccion workflow.
 */
export function PredictionResultCard({
  probability,
}: PredictionResultCardProps) {
  const dies = probability >= 0.5;
  const percentage = (probability * 100).toFixed(1);

  return (
    <section
      aria-labelledby="prediction-result-title"
      className="flex flex-col gap-4"
    >
      <h2 id="prediction-result-title" className="font-semibold text-zinc-800">
        "Probabilidad de No Supervivencia"
      </h2>
      <div className="flex flex-col items-center gap-3 py-2">
        <p
          className={cn(
            "text-4xl font-bold tabular-nums",
            dies ? "text-red-600" : "text-emerald-600",
          )}
        >
          {percentage}%
        </p>
        <p
          className={cn(
            "text-sm font-medium",
            dies ? "text-red-500" : "text-emerald-500",
          )}
        >
          {dies ? "Paciente fallece" : "Paciente no fallece"}
        </p>
        <div className="w-full max-w-sm">
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                dies ? "bg-red-500" : "bg-emerald-500",
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
