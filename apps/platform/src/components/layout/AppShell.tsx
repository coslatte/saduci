"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navbar, Sidebar } from "@/components/organisms";
import { NotificationsProvider } from "@/context/notifications";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/lib/zIndex";
import {
  APP_NAVIGATION_SECTIONS,
  type NavigationSectionConfig,
} from "@/lib/navigation";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "saduci:sidebar-collapsed";

function readSidebarCollapsedInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

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
  userName,
  userRole = "",
  userAvatar,
  onLogout,
  extraSections,
}: AppShellProps) {
  // El drawer móvil tiene su propio estado; el colapso del rail de
  // escritorio es un useState local persistido en localStorage.
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    readSidebarCollapsedInitial,
  );

  const sidebarSections: NavigationSectionConfig[] = extraSections
    ? [...APP_NAVIGATION_SECTIONS, ...extraSections]
    : APP_NAVIGATION_SECTIONS;

  const desktopOffsetClass = sidebarCollapsed ? "lg:pl-20" : "lg:pl-72";
  const desktopChromeLeftClass = sidebarCollapsed ? "lg:left-20" : "lg:left-72";

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          SIDEBAR_COLLAPSED_STORAGE_KEY,
          String(next),
        );
      } catch {
        // Ignore storage access errors (private mode, blocked storage).
      }
      return next;
    });
  }, []);

  function handleToggleMobileSidebar() {
    setMobileSidebarOpen((open) => !open);
  }

  function handleCloseMobileSidebar() {
    setMobileSidebarOpen(false);
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
        setMobileSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileSidebarOpen]);

  return (
    <NotificationsProvider>
      <div className="flex min-h-dvh w-full overflow-hidden bg-slate-100/60">
        <Sidebar
          className={cn(
            "fixed inset-y-0 left-0 hidden lg:flex",
            Z_INDEX.sidebar,
          )}
          sections={sidebarSections}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />

        <button
          type="button"
          aria-label="Cerrar navegación"
          aria-hidden={!mobileSidebarOpen}
          tabIndex={mobileSidebarOpen ? 0 : -1}
          onClick={handleCloseMobileSidebar}
          className={cn(
            "fixed inset-0 bg-slate-900/40 transition-opacity duration-300 lg:hidden",
            Z_INDEX.overlay,
            mobileSidebarOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          )}
        />

        <div
          id="app-shell-sidebar-mobile"
          className={cn(
            "fixed inset-y-0 left-0 w-72 max-w-[85vw] transition-transform duration-300 ease-out lg:hidden",
            Z_INDEX.drawer,
            mobileSidebarOpen
              ? "translate-x-0 pointer-events-auto"
              : "-translate-x-full pointer-events-none",
          )}
          onClickCapture={(event) => {
            // Cierra el drawer al tocar un enlace; el sidebar de escritorio
            // permanece IDLE y nunca colapsa solo.
            if ((event.target as HTMLElement).closest("a")) {
              handleCloseMobileSidebar();
            }
          }}
        >
          <Sidebar sections={sidebarSections} className="h-full shadow-2xl" />
        </div>

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-out",
            desktopOffsetClass,
          )}
        >
          <Navbar
            userName={userName}
            userRole={userRole}
            userAvatar={userAvatar}
            onLogout={onLogout}
            showSidebarTrigger
            sidebarOpen={mobileSidebarOpen}
            onToggleSidebar={handleToggleMobileSidebar}
            className={cn(
              "fixed inset-x-0 top-0 transition-[left] duration-300 ease-out",
              Z_INDEX.navbar,
              desktopChromeLeftClass,
            )}
          />
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white/70 px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-20 select-text sm:px-6 sm:pb-12 lg:px-8 lg:pt-20">
            {children}
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
