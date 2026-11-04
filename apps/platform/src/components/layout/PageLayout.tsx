import type { ReactNode } from "react";
import { Text } from "@/components/atoms/Text";
import { cn } from "@/lib/utils";

/**
 * PageLayout
 *
 * Page frame for the wide, form-driven screens (prediction, simulation).
 *
 * It exists because those two pages were the only ones without a width of their
 * own: every other page invents one (`max-w-6xl` on the dashboard, `max-w-5xl`
 * in settings, `max-w-7xl` in register, `max-w-4xl` in explanations), so the
 * same content ended up a different width depending on where it was opened.
 * Here the frame is decided once, in one place.
 *
 * Two behaviours worth knowing:
 *
 * - `width` caps the measure so a form does not stretch to a 27" display.
 * - `split` puts the form in a `main` column and the outcome in an `aside`
 *   column, collapsing to a single column below `xl`. It is deliberately not
 *   `sticky`: these panels are tall, and pinning them would fight with the
 *   page scrollbar. The outcome stays visible on a laptop, which is the case
 *   that matters, and the two columns keep their natural order on a phone.
 */
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
      <header>
        <Text as="h1" size="xl" weight="bold" className="text-zinc-900">
          {title}
        </Text>
        {description && (
          <Text size="sm" className="mt-1 text-zinc-500">
            {description}
          </Text>
        )}
      </header>

      <div
        className={cn(
          "flex flex-col gap-5",
          aside ? "xl:flex-row xl:items-start xl:gap-6" : null,
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
          <div className="flex min-w-0 flex-col gap-5 xl:w-[22rem] xl:shrink-0">
            {aside}
          </div>
        )}
      </div>

      {below && <div className="flex flex-col gap-5">{below}</div>}
    </div>
  );
}

export default PageLayout;
