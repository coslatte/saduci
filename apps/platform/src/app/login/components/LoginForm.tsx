"use client";

import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { isAbortError } from "@/lib/serverAvailability";
import { Button } from "@/components/atoms/Buttons";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Text } from "@/components/atoms/Text";
import { Alert } from "@/components/molecules/Alert";
import { PasswordField } from "@/components/molecules/PasswordField";
import { showToast } from "@/components/molecules/Toast";
import { resolvePostLoginTarget } from "@/lib/postLoginTarget";

const SUPPORT_EMAIL = "gabrielpazruiz02@gmail.com";

/**
 * Handles credential input, authentication request, and login feedback states.
 *
 * @example
 * <LoginForm />
 */
export default function LoginForm() {
  const { login, sessionError, clearSessionError } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [retryDelayMs, setRetryDelayMs] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    const finalIdentifier = identifier.trim();
    const finalPassword = password;

    setFormError(null);

    if (!finalIdentifier || !finalPassword) {
      setFormError("Ingresa tu usuario o correo y tu contraseña.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRetryAttempt(0);
    setRetryDelayMs(0);
    setLoading(true);
    try {
      await login(finalIdentifier, finalPassword, {
        signal: controller.signal,
        onRetry: ({ attempt, nextDelayMs }) => {
          setRetryAttempt(attempt);
          setRetryDelayMs(nextDelayMs);
        },
      });
      clearSessionError();
      // Single navigation source. `router.refresh()` must not be chained here:
      // issued in the same tick it aborts this `replace` before it commits, so
      // the URL never changes and `ShellController` leaves the app parked on
      // its "Cargando…" screen with a valid session. `replace` alone already
      // re-runs the server components with the new session cookie.
      router.replace(
        resolvePostLoginTarget(
          typeof window === "undefined" ? "" : window.location.search,
        ),
      );
    } catch (submitError) {
      if (isAbortError(submitError)) return;
      showToast({
        title: "Error",
        description:
          submitError instanceof Error
            ? submitError.message
            : "No se pudo iniciar sesión. Verifique sus credenciales.",
        type: "error",
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
      setRetryAttempt(0);
      setRetryDelayMs(0);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl motion-safe:animate-[slide-in-down_0.5s_ease-out_forwards] sm:space-y-7 sm:p-8">
      {sessionError && (
        <Alert variant="danger" title="Sesión finalizada">
          {sessionError}
        </Alert>
      )}
      {formError && (
        <Alert variant="danger" title="Revisa los datos">
          {formError}
        </Alert>
      )}
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
          Inicie sesión para acceder a la plataforma
        </Text>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-identifier">Usuario o correo electrónico</Label>
          <Input
            id="login-identifier"
            type="text"
            value={identifier}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setIdentifier(event.target.value)
            }
            placeholder="usuario@saduci.com"
            autoComplete="username"
            fullWidth
            autoFocus
            className="text-left placeholder:text-left"
          />
        </div>
        <PasswordField
          id="login-password"
          label="Contraseña"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="current-password"
          className="[&_input]:text-left [&_input]:placeholder:text-left"
        />
        <Button
          variant="glass"
          type="submit"
          loading={loading}
          className="w-full transition-transform duration-200 motion-safe:active:scale-[0.99]"
          size="lg"
        >
          Iniciar sesión
        </Button>
        {retryAttempt > 0 && (
          <Text as="p" size="xs" muted className="text-center">
            Sin respuesta del servidor. Reintentando en{" "}
            {Math.max(1, Math.round(retryDelayMs / 1000))} s… (intento{" "}
            {retryAttempt})
          </Text>
        )}
      </form>

      <div className="text-center">
        <Text as="p" size="sm" muted>
          ¿Problemas para acceder a la cuenta?{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Problemas de acceso a SADUCI")}`}
            className="font-medium text-primary-600 hover:underline"
          >
            Contactar al técnico
          </a>
        </Text>
        <Text as="p" size="xs" muted className="mt-1">
          {SUPPORT_EMAIL}
        </Text>
      </div>
    </div>
  );
}
