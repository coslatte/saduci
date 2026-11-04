"use server";

import { getUsers, createUser, updateUser, deleteUser } from "./api";
import { HttpError } from "@/lib/types/http-error";

export async function listUsers(): Promise<
  {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
  }[]
> {
  try {
    return await getUsers();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error al listar usuarios");
  }
}

export async function addUser(input: {
  username: string;
  email: string;
  password: string;
  role: string;
  is_active: boolean;
}): Promise<{ id: number; username: string; email: string }> {
  try {
    return await createUser(input);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error al crear usuario");
  }
}

export async function editUser(
  userId: number,
  input: {
    username?: string;
    email?: string;
    role?: string;
    is_active?: boolean;
  },
): Promise<{ id: number; username: string; email: string }> {
  try {
    return await updateUser(userId, input);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error al actualizar usuario");
  }
}

export async function removeUser(userId: number): Promise<{ message: string }> {
  try {
    return await deleteUser(userId);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error al eliminar usuario");
  }
}
