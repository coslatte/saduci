"use client";

import { useState } from "react";
import type * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/atoms/Buttons";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Text } from "@/components/atoms/Text";
import { Alert } from "@/components/molecules/Alert";
import {
  APP_NAME,
  LOGIN_PROMPT,
  LOGIN_BUTTON,
  LOGIN_ERROR_MSG,
  LOGIN_EMAIL_LABEL,
  LOGIN_EMAIL_PLACEHOLDER,
  LOGIN_PASSWORD_LABEL,
  LOGIN_PASSWORD_PLACEHOLDER,
  LOGIN_HELP_TEXT,
  LOGIN_REGISTER_LINK,
  ALERT_ERROR_TITLE,
} from "@/constants/constants";

const MOCK_DEV_USER = {
  id: "999",
  username: "dev_user",
  name: "Desarrollador",
  email: "dev@saduci.com",
  role: "Administrador" as const,
  isActive: true,
  isSuperuser: true,
};

/**
 * Handles credential input, authentication request, and login feedback states.
 *
 * @example
 * <LoginForm />
 */
>>>>>>> agents/login-skip-authentication
export default function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const finalIdentifier = identifier.trim();
    const finalPassword = password;

    setLoading(true);
    try {
      if (!finalIdentifier && !finalPassword) {
        localStorage.setItem("saduci_token", "mock_dev_token_" + Date.now());
        localStorage.setItem("saduci_user", JSON.stringify(MOCK_DEV_USER));
        window.location.reload();
        return;
      }

      await login(finalIdentifier, finalPassword);
      router.push("/");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo iniciar sesión. Verifique sus credenciales.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!showRegister ? (
        <div className="w-full max-w-md p-5 space-y-6 bg-white border shadow-xl rounded-2xl border-slate-200 sm:space-y-8 sm:p-8 md:p-10">
          <div className="text-center">
            <Text
              as="h1"
              size="3xl"
              weight="bold"
              family="secondary"
              tracking="tight"
              className="text-slate-900"
            >
              {"Saduci Platform".toUpperCase()}
            </Text>
            <Text as="p" size="sm" muted className="mt-2">
              Inicie sesión para acceder a la plataforma
            </Text>
            <Text as="p" size="xs" muted className="mt-1">
              El acceso depende de las credenciales válidas de
              saduci-core.
            </Text>
          </div>

          {error && (
            <Alert variant="danger" title="Error">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-identifier">
                &quot;Usuario o correo electrónico&quot;
              </Label>
              <Input
                id="login-identifier"
                type="text"
                value={identifier}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setIdentifier(event.target.value)
                }
                placeholder="usuario@saduci.com"
                fullWidth
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-password">&quot;Contraseña&quot;</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(event.target.value)
                }
                placeholder="••••••••"
                fullWidth
              />
            </div>
            <Button
              variant="glass"
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              &quot;Iniciar sesión&quot;
            </Button>
          </form>

          <div className="text-center">
            <Text as="p" size="sm" muted>
              ¿No tienes una cuenta?{" "}
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className="text-primary-600 hover:underline"
              >
                &quot;Crear cuenta&quot;
              </button>
            </Text>
          </div>

          {!identifier &&
            !password &&
            process.env.NODE_ENV === "development" && (
              <div className="p-3 text-center rounded-lg bg-amber-50">
                <Text as="p" size="xs" className="text-amber-700">
                  Modo desarrollo: Deja los campos vacíos para entrar con
                  usuario de prueba
                </Text>
              </div>
            )}
        </div>
      ) : (
        <div className="w-full max-w-md p-5 space-y-6 bg-white border shadow-xl rounded-2xl border-slate-200 sm:space-y-8 sm:p-8 md:p-10">
          <RegisterFormInternal
            onSwitchToLogin={() => setShowRegister(false)}
          />
        </div>
      )}
    </>
  );
}

function RegisterFormInternal({
  onSwitchToLogin,
}: {
  onSwitchToLogin: () => void;
}) {
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
          : "No se pudo completar el registro.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <Text as="p" size="sm" muted>
          &quot;Usuario creado correctamente. Ya puedes iniciar sesión.&quot;
        </Text>
        <Text as="p" size="sm" muted className="mt-1">
          Ahora puedes &quot;Iniciar sesión&quot;.
        </Text>
        <Button
          variant="glass"
          onClick={onSwitchToLogin}
          className="w-full mt-4"
          size="lg"
        >
          Iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <Text
          as="h1"
          size="3xl"
          weight="bold"
          family="secondary"
          tracking="tight"
          className="text-slate-900"
        >
          &quot;Crear cuenta&quot;
        </Text>
        <Text as="p" size="sm" muted className="mt-2">
          &quot;Regístrate para acceder a la plataforma&quot;
        </Text>
      </div>

      {error && (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-email">&quot;Correo electrónico&quot;</Label>
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
          <Label htmlFor="register-username">
            &quot;Nombre de usuario&quot;
          </Label>
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
          <Label htmlFor="register-password">&quot;Contraseña&quot;</Label>
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
            &quot;Confirmar contraseña&quot;
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
          Crear cuenta
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
            &quot;Iniciar sesión&quot;
          </button>
        </Text>
      </div>
    </>

  );
}
