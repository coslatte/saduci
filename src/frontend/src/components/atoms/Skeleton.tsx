import { cn, dataDisabledProps } from "@/lib/utils";
import { HTMLAttributes } from "react";

/**
 * Skeleton
 *
 * Simple pulsing placeholder used while content is loading. It accepts an
 * optional `disabled` prop that attaches a `data-disabled` attribute for
 * styling or testing.
 * Used in X case: temporary placeholders during async content rendering.
 */
export function Skeleton(
  props: HTMLAttributes<HTMLDivElement> & { disabled?: boolean },
) {
  const { className, disabled, ...rest } = props;

  return (
    <div
      {...dataDisabledProps(disabled)}
      className={cn("animate-pulse rounded-md bg-zinc-200/80", className)}
      {...(rest as HTMLAttributes<HTMLDivElement>)}
    />
  );
}
