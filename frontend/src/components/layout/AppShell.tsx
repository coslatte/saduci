"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sileo";
import type { ReactNode } from "react";
import { Navbar, Sidebar, Footer } from "@/components/organisms";
import { NotificationsProvider } from "@/context/notifications";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

import { cn } from "@/lib/utils";
import {
  APP_NAVIGATION_SECTIONS,
  type NavigationSectionConfig,
} from "@/lib/navigation";

/**
 * Props for `AppShell`.
 */
interface AppShellProps {
  children: ReactNode;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  onLogout?: () => void;
  /** Extra sidebar sections appended after the default ones (e.g. admin section) */
  extraSections?: NavigationSectionConfig[];
}

/**
 * Composes sidebar, navbar, content area, footer, and global notifications.
 * Used in X case: base layout wrapper for authenticated application routes.
 */
export function AppShell({
  children,
  userName = "Usuario",
  userRole = "",
  userAvatar,
  onLogout,
  extraSections,
}: AppShellProps) {
  const pathname = usePathname() ?? "/";
  const online = useOnlineStatus();
  const [mobileSidebarOpenPath, setMobileSidebarOpenPath] = useState<
    string | null
  >(null);
  const mobileSidebarOpen = mobileSidebarOpenPath === pathname;

  const sidebarSections: NavigationSectionConfig[] = extraSections
    ? [...APP_NAVIGATION_SECTIONS, ...extraSections]
    : APP_NAVIGATION_SECTIONS;

  function handleOpenMobileSidebar() {
    setMobileSidebarOpenPath(pathname);
  }

  function handleCloseMobileSidebar() {
    setMobileSidebarOpenPath(null);
  }

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileSidebarOpenPath(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileSidebarOpen]);

  return (
    <NotificationsProvider>
      <div className="flex overflow-hidden min-h-dvh bg-slate-100/60">
        {!online && (
          <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-red-600 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            <span className="inline-block size-1.5 rounded-full bg-white animate-pulse" />
            Sin conexión a internet
          </div>
        )}

        <Sidebar
          className="fixed inset-y-0 left-0 z-30 hidden lg:flex"
          sections={sidebarSections}
        />

        <button
          type="button"
          aria-label="Cerrar navegación"
          aria-hidden={!mobileSidebarOpen}
          tabIndex={mobileSidebarOpen ? 0 : -1}
          onClick={handleCloseMobileSidebar}
          className={cn(
            "fixed inset-0 z-30 bg-slate-900/40 transition-opacity duration-300 lg:hidden",
            mobileSidebarOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          )}
        />

        <div
          id="app-shell-sidebar-mobile"
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] transition-transform duration-300 ease-out lg:hidden",
            mobileSidebarOpen
              ? "translate-x-0 pointer-events-auto"
              : "-translate-x-full pointer-events-none",
          )}
        >
          <Sidebar sections={sidebarSections} className="h-full shadow-2xl" />
        </div>

        {/* Global Toaster for notifications */}
        <Toaster position="bottom-right" />

        <div className="flex flex-col flex-1 min-w-0 lg:pl-72">
          <Navbar
            userName={userName}
            userRole={userRole}
            userAvatar={userAvatar}
            onLogout={onLogout}
            showSidebarTrigger
            sidebarOpen={mobileSidebarOpen}
            onOpenSidebar={handleOpenMobileSidebar}
            className="fixed inset-x-0 top-0 z-20 lg:left-72"
          />
          <main className="flex-1 min-w-0 min-h-0 px-4 pt-20 pb-24 overflow-y-auto bg-white/70 sm:px-6 sm:pb-28 sm:pt-20 lg:px-8 lg:pt-20">
            {children}
          </main>
          <Footer className="fixed inset-x-0 bottom-0 z-20 lg:left-72" />
        </div>
      </div>
    </NotificationsProvider>
  );
}
