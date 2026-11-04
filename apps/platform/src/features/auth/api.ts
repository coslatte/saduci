"use server";

import { serverApi } from "@/lib/server-api";
import { HttpError } from "@/lib/types/http-error";
import {
  type LoginInput,
  type RegisterInput,
  type ChangePasswordInput,
} from "./schemas";
import { type AuthResponse } from "@/entities/auth";

export async function login(
  input: LoginInput,
): Promise<{ user: AuthResponse["user"]; token: string }> {
  const response = await serverApi.post<AuthResponse>(
    "/auth/login",
    {
      username: input.identifier,
      password: input.password,
    },
    { anonymous: true, timeoutKey: "auth" },
  );

  if (!response?.access_token || !response.user) {
    throw new HttpError(500, "Respuesta de autenticación inválida");
  }

  return {
    token: response.access_token,
    user: response.user,
  };
}

export async function register(
  input: RegisterInput,
): Promise<{ user: AuthResponse["user"]; message: string }> {
  const response = await serverApi.post<AuthResponse & { message: string }>(
    "/auth/register",
    input,
    {
      anonymous: true,
      timeoutKey: "auth",
    },
  );

  if (!response?.user) {
    throw new HttpError(500, "Respuesta de registro inválida");
  }

  return {
    user: response.user,
    message: response.message ?? "Usuario creado",
  };
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<void> {
  await serverApi.post(
    "/auth/change-password",
    {
      current_password: input.currentPassword,
      new_password: input.newPassword,
    },
    { timeoutKey: "auth" },
  );
}

export async function getMe(): Promise<AuthResponse["user"]> {
  return serverApi.get("/auth/me", { timeoutKey: "auth" });
}

export async function fetchSession(): Promise<{
  user: AuthResponse["user"];
  token: string;
} | null> {
  try {
    const user = await serverApi.get<AuthResponse["user"]>("/auth/me", {
      timeoutKey: "auth",
    });
    return { user, token: "" };
  } catch {
    return null;
  }
}
