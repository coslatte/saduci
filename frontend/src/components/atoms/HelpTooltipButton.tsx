import { cn } from "@/lib/utils";

interface HelpTooltipButtonProps {
  help: string;
  className?: string;
  buttonClassName?: string;
  tooltipClassName?: string;
  ariaLabel?: string;
}

/**
 * Renders a reusable help trigger with tooltip content for form and data widgets.
 * @param props.help - Text displayed inside the tooltip.
 * @param props.className - Optional className for the wrapper container.
 * @param props.buttonClassName - Optional className overrides for the button.
 * @param props.tooltipClassName - Optional className overrides for the tooltip.
 * @param props.ariaLabel - Accessible label for the help button.
 * @example
 * <HelpTooltipButton
 *   help="Edad del paciente en años."
 *   className="absolute -translate-y-1/2 right-2 top-1/2"
 * />
 */
export function HelpTooltipButton({
  help,
  className,
  buttonClassName,
  tooltipClassName,
  ariaLabel = "Información de ayuda del campo",
}: HelpTooltipButtonProps) {
  return (
    <div className={cn("group/help z-10", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        className={cn(
          "h-5 w-5 rounded-full border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-500 transition-colors duration-150 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600",
          buttonClassName,
        )}
      >
        ?
      </button>
      <div
        role="tooltip"
        className={cn(
          "surface-backdrop-opaque surface-noise-strong pointer-events-none absolute bottom-full right-0 mb-2 w-60 max-w-xs whitespace-normal rounded-lg border border-slate-200/80 px-3 py-2 text-(length:--font-size-xs) text-slate-700 shadow-lg opacity-0 transition-opacity group-hover/help:opacity-100 group-focus-within/help:opacity-100",
          tooltipClassName,
        )}
      >
        {help}
        <div className="absolute right-3 top-full border-4 border-transparent border-t-white/80" />
      </div>
    </div>
  );
}
