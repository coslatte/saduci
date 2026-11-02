import type React from "react";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { cn } from "@/lib/utils";

interface NumberInputFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  help?: string;
  onChange: (value: number) => void;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  associateLabelWithInput?: boolean;
}

/**
 * Composes a reusable numeric input field with detached label and shared inline help tooltip.
 * @param props.id - Unique identifier for the number input.
 * @param props.label - Visible label shown above the field.
 * @param props.value - Current numeric value.
 * @param props.min - Minimum allowed value.
 * @param props.max - Maximum allowed value.
 * @param props.step - Optional increment/decrement step for steppers.
 * @param props.help - Optional contextual help text shown in tooltip.
 * @param props.onChange - Callback fired with the parsed numeric value.
 * @param props.containerClassName - Optional className for the wrapper.
 * @param props.labelClassName - Optional className for the label.
 * @param props.inputClassName - Optional className for the input element.
 * @param props.fullWidth - Whether the field should use full available width.
 * @param props.disabled - Disables the input when true.
 * @param props.associateLabelWithInput - Enables native htmlFor focus behavior when true.
 * @example
 * <NumberInputField
 *   id="age"
 *   label="Edad"
 *   value={age}
 *   min={14}
 *   max={100}
 *   help="Edad del paciente en años."
 *   onChange={setAge}
 * />
 */
export function NumberInputField({
  id,
  label,
  value,
  min,
  max,
  step,
  help,
  onChange,
  containerClassName,
  labelClassName,
  inputClassName,
  fullWidth = true,
  disabled,
  associateLabelWithInput = false,
}: NumberInputFieldProps) {
  const labelId = `${id}-label`;

  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      <Label
        id={labelId}
        htmlFor={associateLabelWithInput ? id : undefined}
        className={cn(
          "min-w-0 flex-1 truncate text-(length:--font-size-xs) sm:text-(length:--font-size-sm) text-zinc-800",
          labelClassName,
        )}
        title={label}
      >
        {label}
      </Label>

      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-labelledby={associateLabelWithInput ? undefined : labelId}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onChange(Number(event.target.value))
        }
        help={help}
        fullWidth={fullWidth}
        className={inputClassName}
        disabled={disabled}
      />
    </div>
  );
}
