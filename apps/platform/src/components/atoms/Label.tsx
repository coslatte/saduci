import { cn, dataDisabledProps } from "@/lib/utils";

/**
 * Props for `Label`.
 */
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Show a required marker (*) */
  required?: boolean;
  children: React.ReactNode;
  /** Attach data-disabled when true */
  disabled?: boolean;
}

/**
 * Label
 *
 * Simple form label that can render an optional required marker. Use this
 * component to keep label styles consistent across forms.
 * Used in X case: labeling controlled inputs in forms and settings panels.
 */
export function Label({
  required,
  className,
  children,
  disabled,
  ...props
}: LabelProps) {
  return (
    <label
      {...dataDisabledProps(disabled)}
      className={cn(
        "text-(length:--font-size-sm) font-medium text-zinc-900",
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-red-500" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
