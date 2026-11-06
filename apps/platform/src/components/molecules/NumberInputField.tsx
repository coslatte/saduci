import type React from "react";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  suffix?: string;
  description?: string;
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
  suffix,
  description,
}: NumberInputFieldProps) {
  const labelId = `${id}-label`;
  const [draft, setDraft] = useState(String(value));

  function commitDraft() {
    if (draft.trim() === "") {
      setDraft(String(value));
      return;
    }
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const bounded = Math.min(max, Math.max(min, parsed));
    setDraft(String(bounded));
    onChange(bounded);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      <Label
        id={labelId}
        htmlFor={associateLabelWithInput ? id : undefined}
        className={cn(
          "min-w-0 flex-1 truncate text-(length:--font-size-xs) sm:text-(length:--font-size-sm) text-zinc-900",
          labelClassName,
        )}
        title={label}
      >
        {label}
      </Label>

      <Input
        id={id}
        type="number"
        clampNumberToRange={false}
        min={min}
        max={max}
        step={step ?? 1}
        value={draft}
        aria-labelledby={associateLabelWithInput ? undefined : labelId}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          const next = event.target.value;
          setDraft(next);
          if (next !== "" && Number.isFinite(Number(next)))
            onChange(Number(next));
        }}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            setDraft(String(value));
            event.currentTarget.blur();
          }
        }}
        help={help}
        fullWidth={fullWidth}
        className={cn(
          "h-11 rounded-xl text-base font-medium tabular-nums",
          inputClassName,
        )}
        disabled={disabled}
      />
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          {description ??
            `Rango permitido: ${min.toLocaleString("es-ES")}–${max.toLocaleString("es-ES")}`}
        </span>
        {suffix && <span className="font-medium text-slate-600">{suffix}</span>}
      </div>
    </div>
  );
}
