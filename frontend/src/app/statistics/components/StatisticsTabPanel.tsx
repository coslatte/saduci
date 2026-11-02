import type { PropsWithChildren } from "react";

interface StatisticsTabPanelProps extends PropsWithChildren {
  panelId: string;
  labelledBy: string;
  hidden: boolean;
}

/**
 * Wraps tab content with accessible panel semantics and visibility toggling.
 * Used in X case: rendering active statistics test section content.
 */
export function StatisticsTabPanel({
  panelId,
  labelledBy,
  hidden,
  children,
}: StatisticsTabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={labelledBy}
      hidden={hidden}
    >
      {children}
    </div>
  );
}
