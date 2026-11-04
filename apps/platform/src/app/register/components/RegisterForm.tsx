"use client";

import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { isAbortError } from "@/lib/serverAvailability";
import { Button } from "@/components/atoms/Buttons";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Select } from "@/components/atoms/Select";
import { Text } from "@/components/atoms/Text";
import { Alert } from "@/components/molecules/Alert";
import { PasswordField } from "@/components/molecules/PasswordField";

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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    username?: string;
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
      errors.email = "Correo electrónico inválido";
    }

    if (!username.trim()) {
      errors.username = "El nombre de usuario es requerido";
    }

    if (!password) {
      errors.password = "La contraseña es requerida";
    } else if (password.length < 8) {
      errors.password = "La contraseña debe tener al menos 8 caracteres";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Debe confirmar la contraseña";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Las contraseñas no coinciden";
    }

    if (!role) {
      errors.role = "Debe seleccionar un rol";
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
    const finalUsername = username.trim();
    const finalPassword = password;
    const finalRole = role;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRetryAttempt(0);
    setLoading(true);
    try {
      await register(finalEmail, finalUsername, finalPassword, finalRole);
      router.push("/home");
    } catch (submitError) {
      if (isAbortError(submitError)) return;
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo crear el usuario. Intente de nuevo.",
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
      setRetryAttempt(0);
    }
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:space-y-8 sm:p-8 md:p-10">
      <div className="text-center">
        <Text
          as="h1"
          size="3xl"
          weight="bold"
          family="secondary"
          tracking="tight"
          className="text-slate-900"
        >
          SADUCI
        </Text>
        <Text as="p" size="sm" muted className="mt-2">
          Crear nuevo usuario
        </Text>
      </div>

      {error && (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-email">Correo electrónico</Label>
          <Input
            id="register-email"
            type="email"
            value={email}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(event.target.value)
            }
            placeholder="usuario@ejemplo.com"
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
          <Label htmlFor="register-username">Nombre de usuario</Label>
          <Input
            id="register-username"
            type="text"
            value={username}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setUsername(event.target.value)
            }
            placeholder="usuario"
            fullWidth
            required
            error={!!validationErrors.username}
            aria-describedby={
              validationErrors.username ? "register-username-error" : undefined
            }
            aria-invalid={!!validationErrors.username}
          />
          {validationErrors.username && (
            <p
              id="register-username-error"
              role="alert"
              className="text-(length:--font-size-xs) text-red-600"
            >
              {validationErrors.username}
            </p>
          )}
        </div>

        <PasswordField
          id="register-password"
          label="Contraseña"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          showStrength
          hint="Mínimo 8 caracteres"
          error={validationErrors.password}
        />

        <PasswordField
          id="register-confirm-password"
          label="Confirmar contraseña"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          error={validationErrors.confirmPassword}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-role">Seleccionar rol</Label>
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
            <option value="">Seleccione un rol</option>
            <option value="Médico">Médico</option>
            <option value="Administrador">Administrador</option>
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
          Crear usuario
        </Button>
        {retryAttempt > 0 && (
          <Text as="p" size="xs" muted className="text-center">
            Sin respuesta del servidor. Reintentando la conexión… Intento{" "}
            {retryAttempt}…
          </Text>
        )}
      </form>

      <div className="text-center">
        <Text as="p" size="sm" muted>
          ¿Ya tienes cuenta? Inicia sesión{" "}
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
