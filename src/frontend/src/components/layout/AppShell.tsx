"use client";

import type { ReactNode } from "react";
import { Toaster } from "sileo";
import { MobileNavigation, Navbar, Sidebar } from "@/components/organisms";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

interface AppShellProps {
  children: ReactNode;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  onLogout?: () => void;
}

/** Shared layout wrapper for the application routes. */
export function AppShell({
  children,
  userName = "Usuario",
  userRole = "",
  userAvatar,
  onLogout,
}: AppShellProps) {
  const online = useOnlineStatus();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-100/60 lg:flex-row">
      {!online && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-red-600 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
          <span className="inline-block size-1.5 animate-pulse rounded-full bg-white" />
          Sin conexión a internet
        </div>
      )}

      <Toaster position="bottom-right" />
      <Sidebar
        userName={userName}
        userRole={userRole}
        userAvatar={userAvatar}
        onLogout={onLogout}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar
          userName={userName}
          userRole={userRole}
          userAvatar={userAvatar}
          onLogout={onLogout}
          className="relative z-20 lg:hidden"
        />
        <MobileNavigation />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-white/70 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
