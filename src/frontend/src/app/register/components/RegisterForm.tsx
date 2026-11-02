"use client";

import { useState } from "react";
import type * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/atoms/Buttons";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Select } from "@/components/atoms/Select";
import { Text } from "@/components/atoms/Text";
import { Alert } from "@/components/molecules/Alert";
import {
  APP_NAME,
  REGISTER_PROMPT,
  REGISTER_BUTTON,
  REGISTER_ERROR_MSG,
  REGISTER_EMAIL_LABEL,
  REGISTER_EMAIL_PLACEHOLDER,
  REGISTER_PASSWORD_LABEL,
  REGISTER_PASSWORD_PLACEHOLDER,
  REGISTER_CONFIRM_PASSWORD_LABEL,
  REGISTER_CONFIRM_PASSWORD_PLACEHOLDER,
  REGISTER_ROLE_LABEL,
  REGISTER_ROLE_PLACEHOLDER,
  REGISTER_ROLE_MEDICO,
  REGISTER_ROLE_ADMIN,
  REGISTER_PASSWORD_MISMATCH,
  REGISTER_PASSWORD_MIN_LENGTH,
  REGISTER_INVALID_EMAIL,
  REGISTER_ROLE_REQUIRED,
  REGISTER_LOGIN_LINK,
  ALERT_ERROR_TITLE,
} from "@/constants/constants";

/**
 * RegisterForm
 *
 * Handles user registration with email, password confirmation, and role selection.
 * Validates inputs before submission and displays error messages.
 *
 * @example
 * <RegisterForm />
 */
export default function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    role?: string;
  }>({});

  function validateForm(): boolean {
    const errors: typeof validationErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = "El correo es requerido";
    } else if (!emailRegex.test(email.trim())) {
      errors.email = REGISTER_INVALID_EMAIL;
    }

    if (!password) {
      errors.password = "La contraseña es requerida";
    } else if (password.length < 8) {
      errors.password = REGISTER_PASSWORD_MIN_LENGTH;
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Debe confirmar la contraseña";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = REGISTER_PASSWORD_MISMATCH;
    }

    if (!role) {
      errors.role = REGISTER_ROLE_REQUIRED;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    const finalEmail = email.trim();
    const finalPassword = password;
    const finalRole = role;

    setLoading(true);
    try {
      await register(finalEmail, finalPassword, finalRole);
      router.push("/");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : REGISTER_ERROR_MSG,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:space-y-8 sm:p-8 md:p-10">
      <div className="text-center">
        <Text
          as="h1"
          size="3xl"
          weight="bold"
          family="secondary"
          tracking="tight"
          className="text-slate-900"
        >
          {APP_NAME.toUpperCase()}
        </Text>
        <Text as="p" size="sm" muted className="mt-2">
          {REGISTER_PROMPT}
        </Text>
      </div>

      {error && (
        <Alert variant="danger" title={ALERT_ERROR_TITLE}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-email">{REGISTER_EMAIL_LABEL}</Label>
          <Input
            id="register-email"
            type="email"
            value={email}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(event.target.value)
            }
            placeholder={REGISTER_EMAIL_PLACEHOLDER}
            fullWidth
            autoFocus
            required
            error={!!validationErrors.email}
            aria-describedby={
              validationErrors.email ? "register-email-error" : undefined
            }
            aria-invalid={!!validationErrors.email}
          />
          {validationErrors.email && (
            <p
              id="register-email-error"
              role="alert"
              className="text-(length:--font-size-xs) text-red-600"
            >
              {validationErrors.email}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-password">{REGISTER_PASSWORD_LABEL}</Label>
          <Input
            id="register-password"
            type="password"
            value={password}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(event.target.value)
            }
            placeholder={REGISTER_PASSWORD_PLACEHOLDER}
            fullWidth
            required
            error={!!validationErrors.password}
            aria-describedby={
              validationErrors.password ? "register-password-error" : undefined
            }
            aria-invalid={!!validationErrors.password}
          />
          {validationErrors.password && (
            <p
              id="register-password-error"
              role="alert"
              className="text-(length:--font-size-xs) text-red-600"
            >
              {validationErrors.password}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-confirm-password">
            {REGISTER_CONFIRM_PASSWORD_LABEL}
          </Label>
          <Input
            id="register-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setConfirmPassword(event.target.value)
            }
            placeholder={REGISTER_CONFIRM_PASSWORD_PLACEHOLDER}
            fullWidth
            required
            error={!!validationErrors.confirmPassword}
            aria-describedby={
              validationErrors.confirmPassword
                ? "register-confirm-password-error"
                : undefined
            }
            aria-invalid={!!validationErrors.confirmPassword}
          />
          {validationErrors.confirmPassword && (
            <p
              id="register-confirm-password-error"
              role="alert"
              className="text-(length:--font-size-xs) text-red-600"
            >
              {validationErrors.confirmPassword}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-role">{REGISTER_ROLE_LABEL}</Label>
          <Select
            id="register-role"
            value={role}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              setRole(event.target.value)
            }
            fullWidth
            required
            error={!!validationErrors.role}
            aria-describedby={
              validationErrors.role ? "register-role-error" : undefined
            }
            aria-invalid={!!validationErrors.role}
          >
            <option value="">{REGISTER_ROLE_PLACEHOLDER}</option>
            <option value={REGISTER_ROLE_MEDICO}>{REGISTER_ROLE_MEDICO}</option>
            <option value={REGISTER_ROLE_ADMIN}>{REGISTER_ROLE_ADMIN}</option>
          </Select>
          {validationErrors.role && (
            <p
              id="register-role-error"
              role="alert"
              className="text-(length:--font-size-xs) text-red-600"
            >
              {validationErrors.role}
            </p>
          )}
        </div>

        <Button
          variant="glass"
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
        >
          {REGISTER_BUTTON}
        </Button>
      </form>

      <div className="text-center">
        <Text as="p" size="sm" muted>
          {REGISTER_LOGIN_LINK}{" "}
          <a
            href="/login"
            className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            aquí
          </a>
        </Text>
      </div>
    </div>
  );
}
