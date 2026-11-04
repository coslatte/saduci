"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/entities/auth";

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionError: string | null;

  setAuth: (user: AuthUser, token: string | null) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateUser: (data: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      sessionError: null,

      // `token` mirrors the httpOnly cookie so the browser can attach a
      // `Bearer` header. It is legitimately null when the session was restored
      // from the cookie alone; the BFF routes fall back to the cookie then.
      setAuth: (user, token) => {
        if (typeof window !== "undefined") {
          if (token) {
            localStorage.setItem("saduci_token", token);
          } else {
            localStorage.removeItem("saduci_token");
          }
          localStorage.setItem("saduci_user", JSON.stringify(user));
        }
        set({ user, token, isAuthenticated: true, sessionError: null });
      },

      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("saduci_token");
          localStorage.removeItem("saduci_user");
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          sessionError: null,
        });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (sessionError) => set({ sessionError }),

      updateUser: (data) => {
        const current = get().user;
        if (!current) return;
        const next = { ...current, ...data };
        if (typeof window !== "undefined") {
          localStorage.setItem("saduci_user", JSON.stringify(next));
        }
        set({ user: next });
      },
    }),
    {
      name: "saduci-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
