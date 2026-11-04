"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";
import { SESSION_LOADING_PHASES } from "@/constants/loading";
import { useProgressiveStatus } from "@/hooks/useProgressiveStatus";
import { useAuth } from "@/lib/auth";
import { resolvePostLoginTarget } from "@/lib/postLoginTarget";

interface Props {
  children: ReactNode;
}

/**
 * Wraps every route with the auth decision and the shared app shell.
 *
 * `proxy.ts` already blocks protected pages without a session cookie, so
 * this component is the second line of defence for the case where the cookie
 * exists but the session no longer validates. That branch used to render
 * `null`, which left a blank page with no way out; it now explains the state and
 * offers a way back to the login screen.
 */
const PUBLIC_ROUTES = ["/login", "/register"];

export default function ShellController({ children }: Props) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (isLoading) return;

    if (isPublicRoute) {
      if (isAuthenticated) {
        // Resolve the same destination `LoginForm` would, so this fallback and
        // the form never disagree about where an authenticated user belongs.
        router.replace(
          resolvePostLoginTarget(
            typeof window === "undefined" ? "" : window.location.search,
          ),
        );
      }
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, isPublicRoute, pathname, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isPublicRoute) {
    // An authenticated visitor is being redirected to /home; show the loading
    // state rather than an empty frame while that happens.
    return isAuthenticated ? <LoadingScreen /> : <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4 text-center">
        <p className="text-sm text-slate-600">
          Tu sesión no está activa. Inicia sesión para continuar.
        </p>
        <button
          type="button"
          onClick={() => {
            void logout().then(() => router.replace("/login"));
          }}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white"
        >
          Ir al inicio de sesión
        </button>
      </div>
    );
  }

  function handleLogout() {
    // The session cookie must be gone before `/login` is requested, otherwise
    // `proxy.ts` reads it and redirects the visitor back into the app.
    void logout().then(() => router.replace("/login"));
  }

  const extraSections = undefined;

  return (
    <AppShell
      userName={user?.name}
      userRole={user?.role}
      userAvatar={user?.avatar ?? undefined}
      onLogout={handleLogout}
      extraSections={extraSections}
    >
      {children}
    </AppShell>
  );
}

function LoadingScreen() {
  const { message } = useProgressiveStatus(true, {
    phases: SESSION_LOADING_PHASES,
  });

  return <AppShellSkeleton message={message} />;
}
