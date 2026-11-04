"use client";

import { type ReactNode } from "react";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/features/auth";

/**
 * Global client providers. Order matters: auth must wrap query so session
 * hooks can invalidate caches after logout/login.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <QueryProvider>{children}</QueryProvider>
    </AuthProvider>
  );
}
