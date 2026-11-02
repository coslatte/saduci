import { cn, dataDisabledProps } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface GridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
}

/**
 * Applies responsive grid column presets to a container wrapper.
 * Used in X case: organizing cards and input groups in page layouts.
 */
export function Grid({
  className,
  cols,
  disabled,
  ...props
}: GridProps & { disabled?: boolean }) {
  return (
    <div
      {...dataDisabledProps(disabled)}
      className={cn(
        "grid",
        cols === 1 && "grid-cols-1",
        cols === 2 && "grid-cols-2",
        cols === 3 && "grid-cols-3",
        cols === 4 && "grid-cols-4",
        cols === 5 && "grid-cols-5",
        cols === 6 && "grid-cols-6",
        cols === 12 && "grid-cols-12",
        className,
      )}
      {...props}
    />
  );
}
