"use server";

import { addUser, editUser, removeUser } from "./service";
import { createUserSchema, updateUserSchema } from "./schemas";
import { FormActionResult } from "@/shared/types";
import { HttpError } from "@/lib/types/http-error";

export async function createUserAction(
  _prev: FormActionResult<{ id: number; username: string; email: string }>,
  formData: FormData,
): Promise<FormActionResult<{ id: number; username: string; email: string }>> {
  const raw = {
    username: formData.get("username") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as string,
    is_active: formData.get("is_active") === "true",
  };

  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[issue.path[0] as string] = issue.message;
    }
    return { success: false, errors, message: "Datos inválidos" };
  }

  try {
    const user = await addUser(parsed.data);
    return { success: true, message: "Usuario creado", data: user };
  } catch (error) {
    if (error instanceof HttpError)
      return {
        success: false,
        message: error.message,
        errors: error.fieldErrors,
      };
    return { success: false, message: "Error inesperado" };
  }
}

export async function updateUserAction(
  _prev: FormActionResult,
  formData: FormData,
): Promise<FormActionResult> {
  const userId = Number(formData.get("userId"));
  const raw = {
    username: formData.get("username") as string,
    email: formData.get("email") as string,
    role: formData.get("role") as string,
    is_active: formData.get("is_active") === "true",
  };

  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[issue.path[0] as string] = issue.message;
    }
    return { success: false, errors, message: "Datos inválidos" };
  }

  try {
    await editUser(userId, parsed.data);
    return { success: true, message: "Usuario actualizado" };
  } catch (error) {
    if (error instanceof HttpError)
      return {
        success: false,
        message: error.message,
        errors: error.fieldErrors,
      };
    return { success: false, message: "Error inesperado" };
  }
}

export async function deleteUserAction(
  _prev: FormActionResult,
  formData: FormData,
): Promise<FormActionResult> {
  const userId = Number(formData.get("userId"));

  try {
    await removeUser(userId);
    return { success: true, message: "Usuario eliminado" };
  } catch (error) {
    if (error instanceof HttpError)
      return { success: false, message: error.message };
    return { success: false, message: "Error inesperado" };
  }
}
