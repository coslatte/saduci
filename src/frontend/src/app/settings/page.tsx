"use client";

import React, { useState } from "react";
import { Avatar } from "@/components/atoms/Avatar";
import { Badge } from "@/components/atoms/Badge";
import { Divider } from "@/components/atoms/Divider";
import { Spinner } from "@/components/atoms/Spinner";
import { Button } from "@/components/atoms/Buttons";
import { Text } from "@/components/atoms/Text";
import { Alert } from "@/components/molecules/Alert";
import { FormField } from "@/components/molecules/FormField";
import { useAuth, type User } from "@/lib/auth";
import { FiShield, FiUser } from "react-icons/fi";

interface UserSettingsPageContentProps {
  user: User;
  token: string | null;
}

export function UserSettingsPageContent({
  user,
  token,
}: UserSettingsPageContentProps) {
  const { updateUserAvatar } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPwdError, setNewPwdError] = useState<string | undefined>();
  const [confirmPwdError, setConfirmPwdError] = useState<string | undefined>();
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    user.avatar,
  );

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const nextPreview = URL.createObjectURL(file);
    setAvatarPreview(nextPreview);
    updateUserAvatar(nextPreview);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setNewPwdError(undefined);
    setConfirmPwdError(undefined);

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
    <main className="p-0">
      <div className="flex flex-col gap-3 mb-6 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Text as="h1" size="2xl" weight="semibold" className="text-zinc-900">
            Ajustes de usuario
          </Text>
          <Text as="p" size="sm" muted className="mt-1">
            Gestiona tu perfil y configuración de seguridad.
          </Text>
        </div>
      </div>

      <Divider className="mb-6 border-slate-200/80" />

      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6">
          <div className="flex items-center gap-2 text-zinc-700 mb-6">
            <FiUser size={14} />
            <Text as="span" size="sm" weight="medium" className="text-zinc-700">
              Perfil
            </Text>
          </div>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
            <div className="flex flex-col items-center gap-3">
              <Avatar
                src={avatarPreview}
                name={user.name}
                size="xl"
                className="shadow-xl size-20"
              />
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100">
                Editar imagen
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            <div className="flex flex-col items-center gap-1 sm:items-start">
              <Text
                as="p"
                size="xl"
                weight="semibold"
                className="leading-tight text-zinc-900"
              >
                {user.name}
              </Text>
              <Text as="p" size="sm" muted className="">
                {user.email}
              </Text>
              <Badge status="info" className="mt-1">{user.role}</Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <div className="flex items-center gap-2 text-zinc-700">
            <FiShield size={14} />
            <Text as="span" size="sm" weight="medium" className="text-zinc-700">
              Seguridad de la cuenta
            </Text>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <FormField
              id="current-password"
              label="Contraseña actual"
              inputProps={{
                type: "password",
                value: currentPassword,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  setCurrentPassword(e.target.value),
                placeholder: "Contraseña actual",
              }}
            />

            <Divider />

            <FormField
              id="new-password"
              label="Nueva contraseña"
              hint="Mínimo 8 caracteres"
              error={newPwdError}
              inputProps={{
                type: "password",
                value: newPassword,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewPassword(e.target.value),
                placeholder: "Nueva contraseña",
              }}
            />

            <FormField
              id="confirm-password"
              label="Confirmar nueva contraseña"
              error={confirmPwdError}
              inputProps={{
                type: "password",
                value: confirmPassword,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfirmPassword(e.target.value),
                placeholder: "Confirmar nueva contraseña",
              }}
            />

            {message && (
              <Alert variant={isSuccess ? "success" : "danger"}>
                {message}
              </Alert>
            )}

            <div className="flex pt-1 justify-stretch sm:justify-end">
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
        </div>
      </div>
    </main>
  );
}

export default function UserSettingsPage() {
  const { user, token } = useAuth();

  if (!user) {
    return null;
  }

  return <UserSettingsPageContent user={user} token={token} />;
}
