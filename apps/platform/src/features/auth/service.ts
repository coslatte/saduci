"use server";

import {
  login as apiLogin,
  register as apiRegister,
  changePassword as apiChangePassword,
} from "./api";
import { HttpError } from "@/lib/types/http-error";

export async function authenticate(input: {
  identifier: string;
  password: string;
}): Promise<{ user: unknown; token: string }> {
  try {
    return await apiLogin(input);
  } catch (error) {
    if (error instanceof HttpError) {
      throw new HttpError(error.status, error.message);
    }
    throw error;
  }
}

export async function registerUser(input: {
  email: string;
  username: string;
  password: string;
  role?: "Administrador" | "Especialista" | "Médico" | "Analista";
}): Promise<{ user: unknown; message: string }> {
  try {
    return await apiRegister(input);
  } catch (error) {
    if (error instanceof HttpError) {
      throw new HttpError(error.status, error.message);
    }
    throw error;
  }
}

export async function updatePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> {
  try {
    await apiChangePassword(input);
  } catch (error) {
    if (error instanceof HttpError) {
      throw new HttpError(error.status, error.message);
    }
    throw error;
  }
}
