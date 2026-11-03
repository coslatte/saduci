"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";

interface Props {
  children: ReactNode;
}

/**
 * Wraps protected routes with auth redirects and the shared app shell.
 * Used in X case: gating non-login routes behind authenticated session checks.
 */
export default function ShellController({ children }: Props) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    sessionUnavailable,
    retrySession,
    logout,
  } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (pathname === "/login" && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (pathname === "/login") {
    return isAuthenticated ? null : <>{children}</>;
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <AppShell
      userName={user?.name}
      userRole={user?.role}
      userAvatar={user?.avatar}
      onLogout={handleLogout}
    >
      {sessionUnavailable && (
        <div
          role="alert"
          className="mb-4 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          No se pudo verificar la sesión porque el servicio de autenticación no
          está disponible. Puedes seguir navegando.{" "}
          <button
            type="button"
            onClick={retrySession}
            className="font-semibold underline focus-visible:outline-2"
          >
            Reintentar
          </button>
        </div>
      )}
      {children}
    </AppShell>
  );
}
