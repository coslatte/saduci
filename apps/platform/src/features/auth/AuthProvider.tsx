"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useAuthStore, type AuthState } from "./store/auth.store";
import { mapBackendUser, type AuthResponse } from "@/entities/auth";
import { onSessionExpired } from "@/lib/session";
import {
  fetchWithServerRetry,
  isAbortError,
  SESSION_VERIFY_MAX_WAIT_MS,
} from "@/lib/serverAvailability";
import { apiFetch } from "@/lib/http";
import { HttpError } from "@/lib/types/http-error";
import { isNetworkFailure, NETWORK_ERROR_MESSAGE } from "@/lib/apiErrors";

const SESSION_EXPIRED_MESSAGE =
  "Tu sesión expiró por seguridad. Vuelve a iniciar sesión para continuar donde estabas.";

/**
 * Lets a form observe and cancel an in-flight auth request. `onRetry` fires on
 * every backoff so the UI can say the backend is unreachable instead of
 * looking frozen while the retry policy waits.
 */
export interface AuthRequestOptions {
  signal?: AbortSignal;
  onRetry?: (progress: { attempt: number; nextDelayMs: number }) => void;
}

interface AuthContextValue {
  user: AuthState["user"];
  token: AuthState["token"];
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionError: string | null;
  clearSessionError: () => void;
  login: (
    identifier: string,
    password: string,
    options?: AuthRequestOptions,
  ) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
    role?: string,
    options?: AuthRequestOptions,
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUserAvatar: (avatar: string | null) => void;
  updateUserProfile: (data: {
    email?: string;
    avatar?: string | null;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    if ("error" in payload)
      return String((payload as Record<string, unknown>).error);
    if ("detail" in payload)
      return String((payload as Record<string, unknown>).detail);
  }
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  return fallback;
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    sessionError,
    setAuth,
    clearAuth,
    setLoading,
    setError,
    updateUser,
  } = useAuthStore();

  const clearSessionError = useCallback(() => setError(null), [setError]);

  const hydrateSession = useCallback(async () => {
    if (typeof window === "undefined") return;

    const storedToken = localStorage.getItem("saduci_token");

    // The session cookie is httpOnly, so it cannot be checked from here. When
    // no token is mirrored locally the cookie may still be valid, therefore the
    // probe runs anyway and lets the BFF route resolve the token.
    try {
      const response = await fetchWithServerRetry(
        "/api/auth/me",
        storedToken
          ? { headers: { Authorization: `Bearer ${storedToken}` } }
          : {},
        { maxElapsedMs: SESSION_VERIFY_MAX_WAIT_MS },
      );

      const payload = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        clearAuth();
        setError(storedToken ? SESSION_EXPIRED_MESSAGE : null);
        return;
      }

      if (!response.ok) {
        throw new HttpError(
          response.status,
          extractErrorMessage(
            payload,
            "No se pudieron cargar los datos del usuario.",
          ),
        );
      }

      // The gateway speaks snake_case (`is_superuser`, `is_active`, numeric
      // `id`). Reading those keys as camelCase silently produced a user with
      // `isSuperuser: undefined` and `role: "ADMIN"`, so the admin guard
      // rejected a real administrator and bounced `/admin/users` back to
      // `/home`. The canonical mapper owns that translation.
      const nextUser = mapBackendUser(payload as AuthResponse["user"]);
      setAuth(nextUser, storedToken);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 0;
      const transient = isNetworkFailure(error) || status >= 500;

      const storedUser = safeJsonParse<AuthState["user"]>(
        localStorage.getItem("saduci_user"),
      );
      if (storedUser && transient) {
        setAuth(storedUser, storedToken);
        setError(NETWORK_ERROR_MESSAGE);
        return;
      }

      setError(
        extractErrorMessage(
          error,
          "No se pudieron cargar los datos del usuario.",
        ),
      );
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth, setAuth, setError, setLoading]);

  useEffect(() => {
    return onSessionExpired(() => {
      clearAuth();
      setError(SESSION_EXPIRED_MESSAGE);
    });
  }, [clearAuth, setError]);

  useEffect(() => {
    const timer = window.setTimeout(() => void hydrateSession(), 0);
    return () => window.clearTimeout(timer);
  }, [hydrateSession]);

  const login = useCallback(
    async (
      identifier: string,
      password: string,
      options: AuthRequestOptions = {},
    ) => {
      let response: Response;
      try {
        response = await fetchWithServerRetry(
          "/api/auth/login",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: identifier, password }),
          },
          {
            maxElapsedMs: SESSION_VERIFY_MAX_WAIT_MS,
            signal: options.signal,
            onRetry: options.onRetry,
          },
        );
      } catch (err) {
        // A cancelled request is not a connection failure: the caller decides
        // whether to stay silent, so it must reach it as an AbortError.
        if (isAbortError(err)) throw err;
        throw new Error("No se pudo conectar con el servidor.");
      }

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as Record<string, unknown>).error)
            : payload && typeof payload === "object" && "detail" in payload
              ? String((payload as Record<string, unknown>).detail)
              : "No se pudo iniciar sesión.";
        throw new Error(message);
      }

      const authResponse = payload as AuthResponse;
      if (!authResponse?.access_token || !authResponse.user) {
        throw new Error("La respuesta de autenticación no es válida.");
      }

      setAuth(mapBackendUser(authResponse.user), authResponse.access_token);
    },
    [setAuth],
  );

  const register = useCallback(
    async (
      email: string,
      username: string,
      password: string,
      role = "Médico",
      options: AuthRequestOptions = {},
    ) => {
      let response: Response;
      try {
        response = await fetchWithServerRetry(
          "/api/auth/register",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, username, password, role }),
          },
          {
            maxElapsedMs: SESSION_VERIFY_MAX_WAIT_MS,
            signal: options.signal,
            onRetry: options.onRetry,
          },
        );
      } catch (err) {
        if (isAbortError(err)) throw err;
        throw new Error("No se pudo conectar con el servidor.");
      }

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as Record<string, unknown>).error)
            : payload && typeof payload === "object" && "detail" in payload
              ? String((payload as Record<string, unknown>).detail)
              : "No se pudo crear el usuario.";
        throw new Error(message);
      }

      const identifier = username.trim() || email.trim();
      await login(identifier, password, options);
    },
    [login],
  );

  const updateUserProfile = useCallback(
    async (data: { email?: string; avatar?: string | null }) => {
      const storedToken = localStorage.getItem("saduci_token");
      if (!storedToken) throw new Error("No hay sesión activa.");

      const response = await apiFetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedToken}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(result, "No se pudo actualizar el perfil."),
        );
      }

      const backendUser = result as Record<string, unknown>;
      const current = useAuthStore.getState().user;
      if (!current) return;

      const merged = {
        ...current,
        email: backendUser.email as string,
        avatar: (backendUser.avatar as string) ?? current.avatar,
      };
      updateUser(merged);
    },
    [updateUser],
  );

  const logout = useCallback(async () => {
    setError(null);
    clearAuth();
    // The cookie outlives localStorage, so it has to be expired server-side.
    // The request is awaited (never rejected) because `proxy.ts` still reads
    // that cookie: navigating to /login before the deletion lands made the
    // guard bounce the visitor straight back to /home, leaving a signed-out
    // user on a protected URL. A failure here must still resolve so the
    // caller can always escape to the login screen.
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }, [clearAuth, setError]);

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    sessionError,
    clearSessionError,
    login,
    register,
    logout,
    updateUserAvatar: (avatar: string | null) => updateUser({ avatar }),
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
