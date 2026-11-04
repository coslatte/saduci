"use client";

import React, { useState, useRef } from "react";
import { Avatar } from "@/components/atoms/Avatar";
import { Badge } from "@/components/atoms/Badge";
import { Divider } from "@/components/atoms/Divider";
import { Spinner } from "@/components/atoms/Spinner";
import { Button } from "@/components/atoms/Buttons";
import { Text } from "@/components/atoms/Text";
import { Alert } from "@/components/molecules/Alert";
import { FormField } from "@/components/molecules/FormField";
import { PasswordField } from "@/components/molecules/PasswordField";
import { AppLoading } from "@/components/organisms/AppLoading";
import { useAuth, type User } from "@/lib/auth";
import { FiShield, FiUser, FiMail } from "react-icons/fi";

interface UserSettingsPageContentProps {
  user: User;
  token: string | null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function UserSettingsPageContent({
  user,
  token,
}: UserSettingsPageContentProps) {
  const { updateUserAvatar, updateUserProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    user.avatar ?? undefined,
  );
  const [email, setEmail] = useState(user.email);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPwdError, setNewPwdError] = useState<string | undefined>();
  const [confirmPwdError, setConfirmPwdError] = useState<string | undefined>();

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setAvatarMessage(null);

    try {
      const base64 = await fileToBase64(file);
      await updateUserProfile({ avatar: base64 });
      updateUserAvatar(base64);
      setAvatarMessage("Imagen de perfil actualizada correctamente.");
      setAvatarSuccess(true);
    } catch (err) {
      setAvatarMessage(
        err instanceof Error ? err.message : "Error al actualizar la imagen.",
      );
      setAvatarSuccess(false);
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileMessage(null);

    if (email === user.email) return;

    setProfileLoading(true);
    try {
      await updateUserProfile({ email });
      setProfileMessage("Correo electrónico actualizado correctamente.");
      setProfileSuccess(true);
    } catch (err) {
      setProfileMessage(
        err instanceof Error ? err.message : "Error al actualizar el perfil.",
      );
      setProfileSuccess(false);
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setNewPwdError(undefined);
    setConfirmPwdError(undefined);

    if (!newPassword && !confirmPassword) {
      return;
    }

    let valid = true;

    if (!newPassword) {
      setNewPwdError("Este campo es requerido.");
      valid = false;
    } else if (newPassword.length < 8) {
      setNewPwdError("La contraseña debe tener al menos 8 caracteres.");
      valid = false;
    }

    if (!confirmPassword || newPassword !== confirmPassword) {
      setConfirmPwdError("Las contraseñas no coinciden.");
      valid = false;
    }

    if (!valid) return;

    setLoading(true);

    try {
      if (!token) {
        throw new Error("Error de red al cambiar la contraseña.");
      }

      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsSuccess(true);
        setMessage(data.message || "Contraseña actualizada correctamente.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setIsSuccess(false);
        setMessage(data.message || "Error al actualizar la contraseña.");
      }
    } catch {
      setIsSuccess(false);
      setMessage("Error de red al cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl select-text flex-col gap-6 sm:gap-8">
      <header className="flex flex-col gap-2">
        <Text as="h1" size="2xl" weight="semibold" className="text-zinc-900">
          Configuración
        </Text>
        <Text as="p" size="sm" muted className="leading-relaxed">
          Gestione su perfil y la seguridad de su cuenta.
        </Text>
      </header>

      <Divider className="border-slate-200/80" />

      <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6 sm:gap-8">
          <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2 text-zinc-700">
              <FiUser size={16} />
              <Text as="span" size="sm" weight="medium">
                Foto de perfil
              </Text>
            </div>

            <div className="flex flex-col items-center gap-4">
              <Avatar
                src={avatarPreview}
                name={user.name}
                size="xl"
                className="size-20 shadow-xl"
              />
              <label className="inline-flex cursor-pointer select-none items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100">
                Editar imagen
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>

            {avatarMessage && (
              <div className="mt-5">
                <Alert variant={avatarSuccess ? "success" : "danger"}>
                  {avatarMessage}
                </Alert>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2 text-zinc-700">
              <FiMail size={16} />
              <Text as="span" size="sm" weight="medium">
                Información del perfil
              </Text>
            </div>

            <form
              onSubmit={handleProfileSubmit}
              className="flex flex-col gap-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Text
                  as="p"
                  size="xl"
                  weight="semibold"
                  className="leading-tight text-zinc-900"
                >
                  {user.name}
                </Text>
                <Badge status="info">{user.role}</Badge>
              </div>

              <FormField
                id="profile-email"
                label="Correo electrónico"
                inputProps={{
                  type: "email",
                  value: email,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value),
                  placeholder: "correo@ejemplo.com",
                }}
              />

              {profileMessage && (
                <Alert variant={profileSuccess ? "success" : "danger"}>
                  {profileMessage}
                </Alert>
              )}

              <div className="flex justify-stretch pt-1 sm:justify-end">
                <Button
                  type="submit"
                  disabled={profileLoading || email === user.email}
                  variant="glass"
                  className="w-full sm:w-auto"
                >
                  {profileLoading ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" />
                      Guardando...
                    </span>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2 text-zinc-700">
            <FiShield size={16} />
            <Text as="span" size="sm" weight="medium">
              Seguridad de la cuenta
            </Text>
          </div>

          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5">
            <PasswordField
              id="current-password"
              label="Contraseña actual"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Contraseña actual"
              autoComplete="current-password"
            />

            <Divider />

            <PasswordField
              id="new-password"
              label="Nueva contraseña"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Nueva contraseña"
              autoComplete="new-password"
              hint="Mínimo 8 caracteres"
              showStrength
              error={newPwdError}
            />

            <PasswordField
              id="confirm-password"
              label="Confirmar nueva contraseña"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirmar nueva contraseña"
              autoComplete="new-password"
              error={confirmPwdError}
            />

            {message && (
              <Alert variant={isSuccess ? "success" : "danger"}>
                {message}
              </Alert>
            )}

            <div className="flex justify-stretch pt-1 sm:justify-end">
              <Button
                type="submit"
                disabled={loading}
                variant="glass"
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                    Guardando...
                  </span>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default function UserSettingsPage() {
  const { user, token, isLoading, sessionError } = useAuth();

  if (isLoading) {
    return <AppLoading />;
  }

  if (!user) {
    return (
      <Alert variant="danger" title="No se pudo cargar el perfil">
        {sessionError ??
          "No se pudieron obtener los datos del usuario. Intente iniciar sesión nuevamente."}
      </Alert>
    );
  }

  return <UserSettingsPageContent user={user} token={token} />;
}
