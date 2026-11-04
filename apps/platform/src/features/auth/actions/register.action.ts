"use server";

import { registerUser } from "../service";
import { registerSchema } from "../schemas";
import { FormActionResult } from "@/shared/types";
import { HttpError } from "@/lib/types/http-error";

export async function registerAction(
  _prev: FormActionResult<{ user: unknown; message: string }>,
  formData: FormData,
): Promise<FormActionResult<{ user: unknown; message: string }>> {
  const raw = {
    username: formData.get("username") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0] as string;
      errors[path] = issue.message;
    }
    return { success: false, errors, message: "Datos inválidos" };
  }

  try {
    const { user, message } = await registerUser(parsed.data);
    return { success: true, message, data: { user, message } };
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        success: false,
        message: error.message,
        errors: error.fieldErrors,
      };
    }
    return { success: false, message: "Error inesperado" };
  }
}
