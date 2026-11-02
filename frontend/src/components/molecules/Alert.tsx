import { cn, dataDisabledProps } from "@/lib/utils";
import { HTMLAttributes, ReactNode } from "react";

/**
 * Props for `Alert`.
 */
interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual variant to style the alert */
  variant?: "info" | "success" | "warning" | "danger";
  /** Optional title shown above the message body */
  title?: string;
  /** Optional icon node rendered to the left of the content */
  icon?: ReactNode;
  /** Attach data-disabled when true */
  disabled?: boolean;
}

/**
 * Alert
 *
 * Informational message component with semantic variants. Use for small
 * inline notices that shouldn't block user flow. The component sets
 * `role="alert"` for assistive technologies.
 * Used in X case: inline success, warning, and error feedback panels.
 */
export function Alert({
  className,
  variant = "info",
  title,
  icon,
  children,
  disabled,
  ...props
}: AlertProps) {
  return (
    <div
      {...dataDisabledProps(disabled)}
      className={cn(
        "rounded-lg border p-4 flex gap-3",
        {
          info: "bg-blue-50 text-blue-900 border-blue-200",
          success: "bg-green-50 text-green-900 border-green-200",
          warning: "bg-yellow-50 text-yellow-900 border-yellow-200",
          danger: "bg-red-50 text-red-900 border-red-200",
        }[variant],
        className,
      )}
      role="alert"
      {...props}
    >
      {icon && (
        <div
          className={cn(
            "shrink-0 mt-0.5",
            {
              info: "text-blue-500",
              success: "text-green-500",
              warning: "text-yellow-500",
              danger: "text-red-500",
            }[variant],
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex-1">
        {title && (
          <h5 className="mb-1 font-medium leading-none tracking-tight text-(length:--font-size-base)">
            {title}
          </h5>
        )}
        <div className="text-(length:--font-size-sm) opacity-90">
          {children}
        </div>
      </div>
    </div>
  );
}
