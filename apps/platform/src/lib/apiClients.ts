import { apiFetch } from "@/lib/http";
import { friendlyErrorMessage } from "@/lib/apiErrors";

const TOKEN_STORAGE_KEY = "saduci_token";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();

  if (!token) {
    throw new Error("No autenticado. Inicie sesión nuevamente.");
  }

  const response = await apiFetch(`/api${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error" }));
    throw new Error(
      friendlyErrorMessage(
        new Error(error.detail || `Error ${response.status}`),
        "No se pudo completar la solicitud.",
      ),
    );
  }

  return response.json();
}

export async function getUsers() {
  return apiClient<
    Array<{
      id: number;
      username: string;
      email: string;
      role: string;
      is_active: boolean;
      is_superuser: boolean;
      created_at: string;
    }>
  >("/admin/users", { method: "GET" });
}

export async function createUser(data: {
  email: string;
  username: string;
  password: string;
  role: string;
  is_active: boolean;
}) {
  return apiClient<{ id: number; username: string; email: string }>(
    "/admin/users",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function deleteUser(userId: number) {
  return apiClient<{ message: string }>(`/admin/users?id=${userId}`, {
    method: "DELETE",
  });
}

export async function updateUser(
  userId: number,
  data: {
    username?: string;
    email?: string;
    role?: string;
    is_active?: boolean;
  },
) {
  return apiClient<{
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    is_superuser: boolean;
    created_at: string;
  }>(`/admin/users?id=${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
