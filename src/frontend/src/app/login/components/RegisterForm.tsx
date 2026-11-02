"use client";

import { useState } from "react";
import type * as React from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/atoms/Buttons";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Text } from "@/components/atoms/Text";
import { Alert } from "@/components/molecules/Alert";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await register(email, username, password);
      setSuccess(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo completar el registro. Verifica los datos.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:space-y-8 sm:p-8 md:p-10">
        <div className="text-center">
          <Text
            as="h1"
            size="3xl"
            weight="bold"
            family="secondary"
            tracking="tight"
            className="text-green-600"
          >
            ¡CUENTA CREADA!
          </Text>
          <Text as="p" size="sm" muted className="mt-2">
            Tu cuenta ha sido creada exitosamente.
          </Text>
          <Text as="p" size="sm" muted className="mt-1">
            Ahora puedes iniciar sesión.
          </Text>
        </div>
        <Button
          variant="glass"
          onClick={onSwitchToLogin}
          className="w-full"
          size="lg"
        >
          Iniciar sesión
        </Button>
      </div>
    );
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
          "Crear cuenta"
        </Text>
        <Text as="p" size="sm" muted className="mt-2">
          "Regístrate para acceder a la plataforma"
        </Text>
      </div>

      {error && (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-email">"Correo electrónico"</Label>
          <Input
            id="register-email"
            type="email"
            value={email}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(event.target.value)
            }
            placeholder="correo@ejemplo.com"
            fullWidth
            autoFocus
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-username">"Nombre de usuario"</Label>
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
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-password">"Contraseña"</Label>
          <Input
            id="register-password"
            type="password"
            value={password}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(event.target.value)
            }
            placeholder="••••••••"
            fullWidth
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-confirm-password">
            "Confirmar contraseña"
          </Label>
          <Input
            id="register-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setConfirmPassword(event.target.value)
            }
            placeholder="••••••••"
            fullWidth
            required
          />
        </div>
        <Button
          variant="glass"
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
        >
          "Crear cuenta"
        </Button>
      </form>

      <div className="text-center">
        <Text as="p" size="sm" muted>
          ¿Ya tienes una cuenta?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-primary-600 hover:underline"
          >
            Iniciar sesión
          </button>
        </Text>
      </div>
    </div>
  );
}
