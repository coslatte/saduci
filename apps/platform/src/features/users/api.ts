"use server";

import { serverApi } from "@/lib/server-api";
import { HttpError } from "@/lib/types/http-error";

export interface UserListItem {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface UserDetail extends UserListItem {
  avatar?: string | null;
}

export async function getUsers(): Promise<UserListItem[]> {
  try {
    return await serverApi.get<UserListItem[]>("/admin/users", {
      timeoutKey: "users",
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "No se pudo conectar con el servicio de usuarios");
  }
}

export async function createUser(input: {
  username: string;
  email: string;
  password: string;
  role: string;
  is_active: boolean;
}): Promise<UserDetail> {
  try {
    return await serverApi.post<UserDetail>("/admin/users", input, {
      timeoutKey: "users",
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "No se pudo crear el usuario");
  }
}

export async function updateUser(
  userId: number,
  input: {
    username?: string;
    email?: string;
    role?: string;
    is_active?: boolean;
  },
): Promise<UserDetail> {
  try {
    return await serverApi.put<UserDetail>(`/admin/users/${userId}`, input, {
      timeoutKey: "users",
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "No se pudo actualizar el usuario");
  }
}

export async function deleteUser(userId: number): Promise<{ message: string }> {
  try {
    return await serverApi.delete(`/admin/users/${userId}`, {
      timeoutKey: "users",
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "No se pudo eliminar el usuario");
  }
}
