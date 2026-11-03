"use client";

import { cn, dataDisabledProps } from "@/lib/utils";
import { NavbarProfile } from "@/components/molecules";
import { routes } from "@/lib/routes";

/**
 * Props for the `Navbar` component.
 *
 * The navbar renders the user profile controls.
 */
interface NavbarProps {
  className?: string;
  disabled?: boolean;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  onLogout?: () => void;
}

/**
 * Navbar
 *
 * Top-level application header.
 *
 * @param props - NavbarProps
 * Used in X case: top header navigation inside authenticated pages.
 */
export function Navbar({
  className,
  disabled,
  userName,
  userRole,
  userAvatar,
  onLogout,
}: NavbarProps) {
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
      {showProfile && (
        <div className="flex h-full items-center lg:hidden">
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
