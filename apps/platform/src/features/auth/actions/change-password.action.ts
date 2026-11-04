"use server";

import { updatePassword } from "../service";
import { changePasswordSchema } from "../schemas";
import { FormActionResult } from "@/shared/types";
import { HttpError } from "@/lib/types/http-error";

export async function changePasswordAction(
  _prev: FormActionResult,
  formData: FormData,
): Promise<FormActionResult> {
  const raw = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0] as string;
      errors[path] = issue.message;
    }
    return { success: false, errors, message: "Datos inválidos" };
  }

  try {
    await updatePassword(parsed.data);
    return { success: true, message: "Contraseña actualizada" };
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
