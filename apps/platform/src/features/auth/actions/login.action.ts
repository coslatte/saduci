"use server";

import { authenticate } from "../service";
import { loginSchema } from "../schemas";
import { FormActionResult } from "@/shared/types";
import { HttpError } from "@/lib/types/http-error";

export async function loginAction(
  _prev: FormActionResult<{ token: string; user: unknown }>,
  formData: FormData,
): Promise<FormActionResult<{ token: string; user: unknown }>> {
  const raw = {
    identifier: formData.get("identifier") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0] as string;
      errors[path] = issue.message;
    }
    return { success: false, errors, message: "Datos inválidos" };
  }

  try {
    const { token, user } = await authenticate(parsed.data);
    return { success: true, message: "Sesión iniciada", data: { token, user } };
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
