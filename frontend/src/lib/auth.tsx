"use client";

import {
  createContext,
  useEffect,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Role } from "@/lib/types";

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  isActive?: boolean;
  isSuperuser?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
    role?: string,
  ) => Promise<void>;
  logout: () => void;
  updateUserAvatar: (avatar: string | null) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const TOKEN_STORAGE_KEY = "saduci_token";
const USER_STORAGE_KEY = "saduci_user";
type BackendUser = {
  id: number | string;
  username: string;
  email: string;
  is_active?: boolean;
  is_superuser?: boolean;
};

interface AuthResponse {
  access_token: string;
  user: BackendUser;
}

function formatDisplayName(identifier: string): string {
  const base = identifier
    .split(/[@._-]+/)
    .filter(Boolean)
    .join(" ");

  return base.replace(/\b\w/g, (char) => char.toUpperCase()) || identifier;
}

function mapBackendUser(user: BackendUser): User {
  const isAdmin = !!user.is_superuser;
  const role: Role = isAdmin ? "Administrador" : "Médico";

  return {
    id: String(user.id),
    username: user.username,
    name: formatDisplayName(user.username),
    email: user.email,
    role,
    isActive: user.is_active ?? true,
    isSuperuser: isAdmin,
  };
}

function normalizeRole(role: string | undefined, isSuperuser?: boolean): Role {
  if (isSuperuser) return "Administrador";
  const normalized = (role ?? "").trim();

  if (
    normalized === "Administrador" ||
    normalized === "Especialista" ||
    normalized === "Médico"
  ) {
    return normalized;
  }

  const upper = normalized.toUpperCase();
  if (upper === "ADMIN" || upper === "SYSTEM ADMIN") {
    return "Administrador";
  }
  if (upper === "ESPECIALISTA") {
    return "Especialista";
  }
  if (upper === "MEDICO") {
    return "Médico";
  }
  return "Médico";
}

function normalizeUser(user: User): User {
  return {
    ...user,
    role: normalizeRole(user.role, user.isSuperuser),
  };
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readStoredSession() {
  if (typeof window === "undefined") {
    return { user: null, token: null };
  }

  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const user = safeJsonParse<User>(localStorage.getItem(USER_STORAGE_KEY));

  if (!token || !user) {
    return { user: null, token: null };
  }

  return { user, token };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  const hydrateSession = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedUser = readStoredSession().user;

    if (!storedToken) {
      clearSession();
      setIsLoading(false);
      return;
    }

    if (storedToken.startsWith("mock_")) {
      setToken(storedToken);
      setUser(storedUser ? normalizeUser(storedUser) : storedUser);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const backendUser = (await response.json()) as BackendUser;
      const nextUser = mapBackendUser(backendUser);

      setToken(storedToken);
      setUser(normalizeUser(nextUser));
      localStorage.setItem(TOKEN_STORAGE_KEY, storedToken);
      localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify(normalizeUser(nextUser)),
      );
    } catch {
      if (storedUser) {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void hydrateSession();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [hydrateSession]);

  const login = useCallback(async (identifier: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: identifier, password }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "detail" in payload
          ? String((payload as Record<string, unknown>).detail)
          : "No se pudo iniciar sesión.";
      throw new Error(message);
    }

    const authResponse = payload as AuthResponse | null;
    if (!authResponse?.access_token || !authResponse.user) {
      throw new Error("La respuesta de autenticación no es válida.");
    }

    const nextUser = normalizeUser(mapBackendUser(authResponse.user));

    setToken(authResponse.access_token);
    setUser(nextUser);
    localStorage.setItem(TOKEN_STORAGE_KEY, authResponse.access_token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  }, []);

  const register = useCallback(
    async (email: string, username: string, password: string) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "No se pudo registrar el usuario."),
        );
      }
    },
    [],
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const updateUserAvatar = useCallback((avatar: string | null) => {
    setUser((current) => {
      if (!current) return current;

      const nextUser = { ...current, avatar: avatar ?? undefined };
      if (typeof window !== "undefined") {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      }
      return nextUser;
    });
  }, []);

  const register = useCallback(
    async (email: string, password: string, role: string = "Médico") => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "detail" in payload
            ? String((payload as Record<string, unknown>).detail)
            : "No se pudo crear el usuario.";
        throw new Error(message);
      }

      const authResponse = payload as AuthResponse | null;
      if (!authResponse?.access_token || !authResponse.user) {
        throw new Error("La respuesta de autenticación no es válida.");
      }

      const nextUser = mapBackendUser(authResponse.user);

      setToken(authResponse.access_token);
      setUser(nextUser);
      localStorage.setItem(TOKEN_STORAGE_KEY, authResponse.access_token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    },
    [],
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);
>>>>>>> agents/login-skip-authentication

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUserAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
