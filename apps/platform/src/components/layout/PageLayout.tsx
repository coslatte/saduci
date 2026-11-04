import type { ReactNode } from "react";
import { Text } from "@/components/atoms/Text";
import { RECORD_WORKSPACE_COPY } from "@/constants/recordHistory";
import { cn } from "@/lib/utils";

export type PageWidth = "narrow" | "default" | "wide";

const WIDTH_CLASS: Record<PageWidth, string> = {
  narrow: "max-w-4xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
};

interface PageLayoutProps {
  title: string;
  description?: string;
  width?: PageWidth;
  /** Main column: usually the form or the inputs. */
  main: ReactNode;
  /** Secondary column: usually the model output. Omit for a single column. */
  aside?: ReactNode;
  /** Full-width content rendered under the columns (explanations, history). */
  below?: ReactNode;
  className?: string;
}

export function PageLayout({
  title,
  description,
  width = "wide",
  main,
  aside,
  below,
  className,
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6",
        WIDTH_CLASS[width],
        className,
      )}
    >
      <header className="border-b border-slate-300 pb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
          {RECORD_WORKSPACE_COPY.workspace}
        </p>
        <Text as="h1" size="3xl" weight="semibold" className="text-zinc-900">
          {title}
        </Text>
        {description && (
          <Text size="sm" className="mt-3 max-w-3xl leading-6 text-slate-600">
            {description}
          </Text>
        )}
      </header>

      <div
        className={cn(
          "grid items-start gap-6",
          aside ? "xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" : null,
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-col gap-5",
            aside ? "xl:flex-1" : null,
          )}
        >
          {main}
        </div>
        {aside && (
          <div className="flex min-w-0 flex-col gap-5 border-t-2 border-primary-700">
            {aside}
          </div>
        )}
      </div>

      {below && <div className="flex flex-col gap-5">{below}</div>}
    </div>
  );
}

export default PageLayout;
