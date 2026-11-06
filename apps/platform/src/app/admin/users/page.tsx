"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { createUser, deleteUser, getUsers, updateUser } from "@/lib/apiClients";
import { friendlyErrorMessage } from "@/lib/apiErrors";
import { showToast } from "@/components/molecules/Toast";
import { Button } from "@/components/atoms/Buttons";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Select } from "@/components/atoms/Select";
import { Text } from "@/components/atoms/Text";
import { Card } from "@/components/molecules/Card";
import { Alert } from "@/components/molecules/Alert";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { EmptyState } from "@/components/molecules/EmptyState";
import { UsersListSkeleton } from "./UsersListSkeleton";
import {
  FiUsers,
  FiPlus,
  FiTrash2,
  FiShield,
  FiUser,
  FiX,
  FiEdit2,
} from "react-icons/fi";

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  ESPECIALISTA: "Especialista",
  MEDICO: "Médico",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  ADMIN: "bg-purple-50 text-purple-700",
  ESPECIALISTA: "bg-blue-50 text-blue-700",
  MEDICO: "bg-slate-100 text-slate-600",
};

const EMPTY_FORM = {
  username: "",
  email: "",
  password: "",
  role: "MEDICO",
  is_active: true,
};

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isSelf = useCallback(
    (candidate: UserData) => candidate.username === user?.username,
    [user?.username],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Error al cargar usuarios"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace("/home");
      return;
    }
    void loadUsers();
  }, [user, router, loadUsers]);

  const closeForm = useCallback(() => {
    setFormMode(null);
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setFormMode((current) => (current === "create" ? null : "create"));
  }, []);

  const openEditForm = useCallback((target: UserData) => {
    setEditingUser(target);
    setFormData({
      username: target.username,
      email: target.email,
      password: "",
      role: target.role,
      is_active: target.is_active,
    });
    setFormError(null);
    setFormMode("edit");
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);
      setSubmitting(true);

      try {
        if (formMode === "edit" && editingUser) {
          await updateUser(editingUser.id, {
            username: formData.username.trim(),
            email: formData.email.trim(),
            role: formData.role,
            is_active: formData.is_active,
          });
        } else {
          await createUser({
            email: formData.email.trim(),
            username: formData.username.trim(),
            password: formData.password,
            role: formData.role,
            is_active: formData.is_active,
          });
        }

        closeForm();
        await loadUsers();
        showToast({
          title: "Usuario guardado",
          description:
            formMode === "edit"
              ? "Los cambios se guardaron correctamente."
              : "El usuario se creó correctamente.",
          type: "success",
        });
      } catch (err) {
        setFormError(
          friendlyErrorMessage(err, "No se pudo guardar el usuario."),
        );
      } finally {
        setSubmitting(false);
      }
    },
    [formMode, editingUser, formData, closeForm, loadUsers],
  );

  const handleToggleActive = useCallback(
    async (target: UserData) => {
      if (isSelf(target)) return;

      const nextActive = !target.is_active;
      setTogglingId(target.id);
      setUsers((current) =>
        current.map((item) =>
          item.id === target.id ? { ...item, is_active: nextActive } : item,
        ),
      );

      try {
        await updateUser(target.id, { is_active: nextActive });
        showToast({
          title: nextActive ? "Usuario activado" : "Usuario desactivado",
          description: `${target.username} ahora está ${
            nextActive ? "activo" : "inactivo"
          }.`,
          type: "success",
        });
      } catch (err) {
        setUsers((current) =>
          current.map((item) =>
            item.id === target.id
              ? { ...item, is_active: target.is_active }
              : item,
          ),
        );
        showToast({
          title: "No se pudo actualizar",
          description: friendlyErrorMessage(
            err,
            "No se pudo cambiar el estado del usuario.",
          ),
          type: "error",
        });
      } finally {
        setTogglingId(null);
      }
    },
    [isSelf],
  );

  const handleDelete = useCallback(async (target: UserData) => {
    setDeleting(true);
    try {
      await deleteUser(target.id);
      setUsers((current) => current.filter((item) => item.id !== target.id));
      showToast({
        title: "Usuario eliminado",
        description: "El usuario se eliminó correctamente.",
        type: "success",
      });
    } catch (err) {
      showToast({
        title: "No se pudo eliminar",
        description: friendlyErrorMessage(
          err,
          "No se pudo eliminar el usuario.",
        ),
        type: "error",
      });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Gestión de Usuarios
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra los usuarios, sus roles y su estado
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={openCreateForm}
          className="w-full sm:w-auto"
        >
          {formMode === "create" ? (
            <>
              <FiX className="mr-1.5" />
              Cancelar
            </>
          ) : (
            <>
              <FiPlus className="mr-1.5" />
              Nuevo usuario
            </>
          )}
        </Button>
      </div>

      {formMode && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="username">Nombre de usuario</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="usuario"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              {formMode === "create" && (
                <div>
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}
              <div>
                <Label htmlFor="role">Rol</Label>
                <Select
                  id="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  fullWidth
                >
                  <option value="MEDICO">Médico</option>
                  <option value="ESPECIALISTA">Especialista</option>
                  <option value="ADMIN">Administrador</option>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    disabled={editingUser ? isSelf(editingUser) : false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_active: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-slate-700">
                    <FiUser className="mr-1 inline" />
                    Activo
                  </span>
                </label>
              </div>
            </div>

            {formError && (
              <Alert variant="danger" title="Error" className="mb-4">
                {formError}
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" loading={submitting}>
                {formMode === "edit" ? "Guardar cambios" : "Crear usuario"}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading && <UsersListSkeleton />}

      {!loading && users.length === 0 && !error && (
        <EmptyState
          icon={<FiUsers size={32} />}
          title="No hay usuarios registrados."
          description="Crea el primer usuario para empezar a administrar accesos."
        />
      )}

      {!loading && error && (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      )}

      {!loading && users.length > 0 && (
        <div className="grid gap-4">
          {users.map((u) => (
            <Card key={u.id} className={!u.is_active ? "opacity-60" : ""}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100">
                    <FiUser className="text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <Text weight="semibold" className="truncate text-slate-800">
                      {u.username}
                    </Text>
                    <Text size="sm" muted className="truncate" title={u.email}>
                      {u.email}
                    </Text>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE_CLASS[u.role] ?? ROLE_BADGE_CLASS.MEDICO}`}
                  >
                    {u.role === "ADMIN" && <FiShield className="mr-1 inline" />}
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={u.is_active}
                    aria-label={`${u.is_active ? "Desactivar" : "Activar"} a ${u.username}`}
                    disabled={isSelf(u) || togglingId === u.id}
                    onClick={() => void handleToggleActive(u)}
                    title={
                      isSelf(u)
                        ? "No puedes cambiar tu propio estado"
                        : undefined
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      u.is_active ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        u.is_active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-xs font-medium text-slate-600">
                    {u.is_active ? "Activo" : "Inactivo"}
                  </span>

                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => openEditForm(u)}
                  >
                    <FiEdit2 className="mr-1.5" />
                    Editar
                  </Button>

                  {!isSelf(u) && (
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => setPendingDelete(u)}
                    >
                      <FiTrash2 />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        key={pendingDelete?.id ?? "closed"}
        confirmationText="eliminar"
        open={pendingDelete !== null}
        title="Eliminar usuario"
        description={
          pendingDelete
            ? `¿Eliminar al usuario ${pendingDelete.username}?`
            : undefined
        }
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={() => {
          if (pendingDelete) void handleDelete(pendingDelete);
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
