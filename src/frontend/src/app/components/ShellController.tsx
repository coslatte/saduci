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
  const { user, isAuthenticated, isLoading, logout } = useAuth();

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

  // NOTE: admin UI removed from sidebar per request; admin source files remain untouched
  const extraSections = undefined;

  return (
    <AppShell
      userName={user?.name}
      userRole={user?.role}
      userAvatar={user?.avatar}
      onLogout={handleLogout}
      extraSections={extraSections}
    >
      {children}
    </AppShell>
  );
}
