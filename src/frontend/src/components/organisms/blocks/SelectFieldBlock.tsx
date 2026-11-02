import { Select, Label } from "@/components/atoms";

interface SelectFieldBlockProps {
  label?: string;
  placeholder?: string;
  optionsRaw?: string;
  required?: boolean;
  helperText?: string;
}

/**
 * Displays a labeled disabled select preview from comma-separated options.
 * Used in X case: select-field block rendering in dynamic page previews.
 */
export function SelectFieldBlock({
  label = "Selección",
  placeholder = "Selecciona una opción",
  optionsRaw = "Opción 1,Opción 2,Opción 3",
  required = false,
  helperText,
}: SelectFieldBlockProps) {
  const options = optionsRaw
    ? optionsRaw
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : [];

  return (
    <div>
      {label && (
        <Label>
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </Label>
      )}
      <Select fullWidth disabled defaultValue="">
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt, i) => (
          <option key={i} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
      {helperText && (
        <p className="mt-1 text-xs text-slate-400">{helperText}</p>
      )}
    </div>
  );
}
