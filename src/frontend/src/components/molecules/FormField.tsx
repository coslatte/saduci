import { cn, dataDisabledProps } from "@/lib/utils";
import { Label } from "@/components/atoms/Label";
import { Input } from "@/components/atoms/Input";

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  help?: string;
  className?: string;
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, "id">;
  disabled?: boolean;
}
/**
 * FormField
 *
 * Convenience wrapper for a labeled input with optional hint and error
 * messages. It ties ARIA attributes between the input and helper text so
 * screen readers can announce them correctly.
 *
 * @param id - input id used for label association and aria-describedby
 * @param label - visible label content
 * @param required - when true shows a required marker on the label
 * @param error - optional error string; when present it will be shown and set aria-invalid
 * @param hint - optional helper text shown when there is no error
 * @param help - optional contextual tooltip text shown in the shared help button
 * @param inputProps - props forwarded to the underlying `Input` component
 * @param disabled - attach data-disabled for styling/testing
 * Used in X case: labeled form inputs with helper and validation messaging.
 */
export function FormField({
  id,
  label,
  required,
  error,
  hint,
  help,
  className,
  inputProps,
  disabled,
}: FormFieldProps) {
  return (
    <div
      {...dataDisabledProps(disabled)}
      className={cn("flex flex-col gap-1.5", className)}
    >
      <Label htmlFor={id} required={required} disabled={disabled}>
        {label}
      </Label>
      <Input
        id={id}
        error={!!error}
        help={help}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        aria-invalid={!!error}
        disabled={disabled}
        {...inputProps}
      />
      {hint && !error && (
        <p
          id={`${id}-hint`}
          className="text-(length:--font-size-xs) text-zinc-500"
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-(length:--font-size-xs) text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}
