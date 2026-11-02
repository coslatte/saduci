import { Input, Label } from "@/components/atoms";

type InputFieldType = "text" | "email" | "number" | "password" | "tel";

interface InputFieldBlockProps {
  label?: string;
  placeholder?: string;
  type?: InputFieldType;
  required?: boolean;
  helperText?: string;
}

/**
 * Renders a labeled disabled input preview for configured block metadata.
 * Used in X case: showing input field blocks in page builder output.
 */
export function InputFieldBlock({
  label = "Campo",
  placeholder = "Escribe aquí...",
  type = "text",
  required = false,
  helperText,
}: InputFieldBlockProps) {
  return (
    <div>
      {label && (
        <Label>
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </Label>
      )}
      <Input
        type={type}
        placeholder={placeholder}
        fullWidth
        disabled
        readOnly
      />
      {helperText && (
        <p className="mt-1 text-xs text-slate-400">{helperText}</p>
      )}
    </div>
  );
}
