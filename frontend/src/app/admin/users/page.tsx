"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/adminGuard";
import { Button } from "@/components/atoms/Buttons";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Text } from "@/components/atoms/Text";
import { Card } from "@/components/molecules/Card";
import { Alert } from "@/components/molecules/Alert";
import {
  FiUsers,
  FiPlus,
  FiTrash2,
  FiShield,
  FiUser,
  FiX,
} from "react-icons/fi";

interface UserData {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

const initialFormState = {
  username: "",
  email: "",
  password: "",
  is_superuser: false,
  is_active: true,
};

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin(user)) {
      router.replace("/");
      return;
    }
    fetchUsers();
  }, [user, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("saduci_token")}`,
        },
      });
      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("saduci_token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Error al crear usuario");
      }

      setShowForm(false);
      setFormData(initialFormState);
      fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("saduci_token")}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Error al eliminar usuario");
      }

      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  if (!user || !isAdmin(user)) {
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
            Administra los usuarios y sus roles
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto"
        >
          {showForm ? (
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

      {showForm && (
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
              <div className="flex flex-col gap-4 md:flex-row">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_superuser}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_superuser: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-slate-700">
                    <FiShield className="mr-1 inline" />
                    Administrador
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
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

            <Button type="submit" variant="primary" loading={submitting}>
              <FiPlus className="mr-1.5" />
              Crear usuario
            </Button>
          </form>
        </Card>
      )}

      {loading && (
        <Text as="p" className="text-slate-500">
          Cargando usuarios...
        </Text>
      )}

      {!loading && users.length === 0 && !error && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <FiUsers size={32} className="text-slate-300" />
            <p className="text-slate-500">No hay usuarios registrados.</p>
          </div>
        </Card>
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
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                    <FiUser className="text-primary-600" />
                  </div>
                  <div>
                    <Text weight="semibold" className="text-slate-800">
                      {u.username}
                    </Text>
                    <Text size="sm" muted>
                      {u.email}
                    </Text>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {u.is_superuser && (
                    <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                      <FiShield className="mr-1 inline" />
                      Admin
                    </span>
                  )}
                  {!u.is_superuser && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      Analista
                    </span>
                  )}
                  {u.is_active ? (
                    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Activo
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      Inactivo
                    </span>
                  )}
                  {user.username !== u.username && (
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => handleDelete(u.id)}
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
    </div>
  );
}
