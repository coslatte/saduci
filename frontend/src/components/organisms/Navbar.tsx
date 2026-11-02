"use client";

import { usePathname } from "next/navigation";
import { FiMenu } from "react-icons/fi";
import { cn, dataDisabledProps } from "@/lib/utils";
import { NAVBAR_OPEN_NAVIGATION, NAV_BRAND_SHORT } from "@/constants/constants";
import { NavBreadcrumb, NavbarProfile } from "@/components/molecules";
import { getBreadcrumbSegments, getRouteNameForPath } from "@/lib/navigation";
import { routes } from "@/lib/routes";

/**
 * Props for the `Navbar` component.
 *
 * The navbar renders the brand and a breadcrumb for the current route.
 */
interface NavbarProps {
  className?: string;
  disabled?: boolean;
  pathname?: string;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  onLogout?: () => void;
  showSidebarTrigger?: boolean;
  sidebarOpen?: boolean;
  onOpenSidebar?: () => void;
}

/**
 * Navbar
 *
 * Top-level application navigation header. Shows brand and current route name.
 * When used inside the app shell it will read pathname from
 * `next/navigation` if a `pathname` prop is not provided.
 *
 * @param props - NavbarProps
 * Used in X case: top header navigation inside authenticated pages.
 */
export function Navbar({
  className,
  disabled,
  pathname,
  userName,
  userRole,
  userAvatar,
  onLogout,
  showSidebarTrigger = false,
  sidebarOpen = false,
  onOpenSidebar,
}: NavbarProps) {
  const pathnameFromHook = usePathname();
  const detectedPath = pathname ?? pathnameFromHook ?? "/";
  const currentPage = getRouteNameForPath(detectedPath) ?? NAV_BRAND_SHORT;
  const breadcrumbSegments = getBreadcrumbSegments(detectedPath);
  const showProfile = typeof userName === "string" && userName.length > 0;
  const roleLabel = userRole || "Sesión activa";

  return (
    <header
      {...dataDisabledProps(disabled)}
      className={cn(
        "flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/75 pl-3 pr-0 supports-backdrop-filter:bg-white/80 surface-backdrop-full sm:pl-4 lg:pl-8",
        className,
      )}
    >
      <div className="flex items-center min-w-0">
        {showSidebarTrigger && (
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label={NAVBAR_OPEN_NAVIGATION}
            aria-expanded={sidebarOpen}
            aria-controls="app-shell-sidebar-mobile"
            className="inline-flex items-center justify-center transition-colors bg-white border shadow-sm size-10 shrink-0 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 lg:hidden"
          >
            <FiMenu className="size-5" />
          </button>
        )}

        <NavBreadcrumb
          brandName={NAV_BRAND_SHORT}
          currentPage={currentPage}
          segments={breadcrumbSegments}
          className="min-w-0"
        />
      </div>

      {showProfile && (
        <div className="flex items-center h-full">
          <NavbarProfile
            userName={userName}
            userAvatar={userAvatar}
            roleLabel={roleLabel}
            href={routes.settings}
            onLogout={onLogout}
            ariaLabel="Ir a ajustes de perfil"
          />
        </div>
      )}
    </header>
  );
}
