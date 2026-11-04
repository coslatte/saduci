import { cn } from "@/lib/utils";

interface RunProgressProps {
  /** Panel title, e.g. "Progreso de simulación". */
  title?: string;
  /** Time-aware status message. */
  message: string;
  /** Whole seconds elapsed since the run started. */
  elapsedSeconds: number;
  /** Estimated total duration in seconds. */
  estimatedSeconds: number;
  /** Estimated completion percentage (0-100). */
  progressPercent: number;
  className?: string;
}

const RUN_PROGRESS_LABELS = {
  title: "Progreso",
  elapsed: "Transcurrido:",
  estimated: "Estimado:",
  advance: "Avance estimado:",
} as const;

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * RunProgress
 *
 * Shared progress panel for long-running operations: an indeterminate-style
 * bar plus elapsed/estimated time and the current status message. It is the
 * single place that renders run progress so simulation and any future long
 * task look and announce the same way.
 *
 * Used in X case: progress feedback during a simulation batch.
 */
export function RunProgress({
  title = RUN_PROGRESS_LABELS.title,
  message,
  elapsedSeconds,
  estimatedSeconds,
  progressPercent,
  className,
}: RunProgressProps) {
  const clampedWidth = Math.min(100, Math.max(2, progressPercent));

  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200 bg-slate-50 p-3",
        className,
      )}
      role="status"
      aria-busy="true"
      aria-label={message}
    >
      <p className="text-(length:--font-size-xs) font-semibold uppercase tracking-wide text-slate-600">
        {title}
      </p>
      <p className="mt-1 text-(length:--font-size-sm) text-slate-700">
        {message}
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-primary-600 transition-all duration-300"
          style={{ width: `${clampedWidth}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-2 grid grid-cols-1 gap-1 text-(length:--font-size-xs) text-slate-600">
        <p>
          {RUN_PROGRESS_LABELS.elapsed} {formatDuration(elapsedSeconds)}
        </p>
        <p>
          {RUN_PROGRESS_LABELS.estimated} {formatDuration(estimatedSeconds)}
        </p>
        <p>
          {RUN_PROGRESS_LABELS.advance} {Math.round(progressPercent)}%
        </p>
      </div>
    </section>
  );
}
