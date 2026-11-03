import { cn } from "@/lib/utils";
import { useRef } from "react";
import type { ActiveStatisticsTab } from "./types";

interface StatisticsTabsProps {
  activeTab: ActiveStatisticsTab;
  onChange: (tab: ActiveStatisticsTab) => void;
}

/**
 * Renders tab buttons to switch between supported statistical tests.
 * Used in X case: choosing Wilcoxon or Friedman workflows in statistics page.
 */
export function StatisticsTabs({ activeTab, onChange }: StatisticsTabsProps) {
  const wilcoxonRef = useRef<HTMLButtonElement>(null);
  const friedmanRef = useRef<HTMLButtonElement>(null);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "wilcoxon"
        : event.key === "End"
          ? "friedman"
          : activeTab === "wilcoxon"
            ? "friedman"
            : "wilcoxon";
    onChange(next);
    (next === "wilcoxon" ? wilcoxonRef : friedmanRef).current?.focus();
  }
  return (
    <div
      className="flex overflow-x-auto border-b border-slate-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Pruebas estadísticas"
      onKeyDown={handleKeyDown}
    >
      <button
        ref={wilcoxonRef}
        role="tab"
        tabIndex={activeTab === "wilcoxon" ? 0 : -1}
        aria-selected={activeTab === "wilcoxon"}
        aria-controls="panel-wilcoxon"
        id="tab-wilcoxon"
        type="button"
        className={cn(
          "shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-(length:--font-size-sm) font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-700",
          activeTab === "wilcoxon"
            ? "border-primary-600 text-primary-700"
            : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
        )}
        onClick={() => onChange("wilcoxon")}
      >
        Test de Wilcoxon
      </button>
      <button
        ref={friedmanRef}
        role="tab"
        tabIndex={activeTab === "friedman" ? 0 : -1}
        aria-selected={activeTab === "friedman"}
        aria-controls="panel-friedman"
        id="tab-friedman"
        type="button"
        className={cn(
          "shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-(length:--font-size-sm) font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-700",
          activeTab === "friedman"
            ? "border-primary-600 text-primary-700"
            : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
        )}
        onClick={() => onChange("friedman")}
      >
        Test de Friedman
      </button>
    </div>
  );
}
