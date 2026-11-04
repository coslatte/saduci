"use client";

import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { cn } from "@/lib/utils";
import { evaluatePasswordStrength } from "@/lib/passwordStrength";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  autoFocus?: boolean;
  /** Shows a strength meter under the field. */
  showStrength?: boolean;
}

const STRENGTH_BAR_CLASS = [
  "bg-red-400",
  "bg-red-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-emerald-500",
] as const;

/**
 * PasswordField
 *
 * Labeled password input with a visibility toggle and a Caps Lock warning, and
 * an optional strength meter. It centralizes the password UX so login,
 * registration and settings behave the same way.
 *
 * Used in X case: password entry in auth and account settings forms.
 */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  error,
  hint,
  className,
  autoFocus,
  showStrength = false,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const strength = evaluatePasswordStrength(value);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required={required}
        error={!!error}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        onKeyUp={(event) =>
          setCapsLock(event.getModifierState?.("CapsLock") ?? false)
        }
        onKeyDown={(event) =>
          setCapsLock(event.getModifierState?.("CapsLock") ?? false)
        }
        onBlur={() => setCapsLock(false)}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-primary-500"
          >
            {visible ? (
              <FiEyeOff className="size-4" aria-hidden />
            ) : (
              <FiEye className="size-4" aria-hidden />
            )}
          </button>
        }
      />
      {capsLock && !error && (
        <p
          role="status"
          className="text-(length:--font-size-xs) text-amber-600"
        >
          Bloq Mayús está activado.
        </p>
      )}
      {showStrength && value && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                STRENGTH_BAR_CLASS[strength.score],
              )}
              style={{ width: `${(strength.score / 4) * 100}%` }}
            />
          </div>
          <span className="text-(length:--font-size-xs) text-slate-500">
            {strength.label}
          </span>
        </div>
      )}
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
