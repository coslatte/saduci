"use client";

import Link from "next/link";
import { Avatar } from "@/components/atoms/Avatar";
import { Text } from "@/components/atoms/Text";
import { cn } from "@/lib/utils";
import { Popover } from "./Popover";

export interface NavbarProfileProps {
  /** Display name of the current user. */
  userName: string;
  /** Optional avatar image URL for the current user. */
  userAvatar?: string;
  /** Label describing the current user status (e.g. "Sesión activa"). */
  roleLabel: string;
  /** Link destination for the settings action. */
  href: string;
  /** Optional callback for logout action. */
  onLogout?: () => void;
  /** Optional aria-label for the profile link. */
  ariaLabel?: string;
  /** Optional additional className for the root element. */
  className?: string;
}

/**
 * NavbarProfile
 *
 * UI block used in the top navbar to show the current user avatar, name and
 * status badge.
 *
 * @param props - NavbarProfileProps
 *
 * @example
 * <NavbarProfile
 *   userName="Ana Pérez"
 *   userAvatar="/avatars/ana.png"
 *   roleLabel="Sesión activa"
 *   href="/settings"
 * />
 */
export function NavbarProfile({
  userName,
  userAvatar,
  roleLabel,
  href,
  onLogout,
  ariaLabel = "Ir a ajustes de perfil",
  className,
}: NavbarProfileProps) {
  return (
    <Popover
      align="right"
      openOnHover
      closeOnSelect
      trigger={
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "group flex h-full pr-2 m-2 items-center border border-transparent bg-transparent transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 pl-2 gap-2 rounded-xl",
            className,
          )}
        >
          <div className="transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3 group-active:scale-95">
            <Avatar
              src={userAvatar}
              name={userName}
              alt={`Perfil de ${userName}`}
              size="md"
            />
          </div>
          <div className="flex-col items-start hidden min-w-0 text-left sm:flex">
            <Text
              as="span"
              size="sm"
              weight="semibold"
              className="truncate text-slate-900"
            >
              {userName}
            </Text>
            <Text as="span" size="xs" className="truncate text-slate-500">
              {roleLabel}
            </Text>
          </div>
        </button>
      }
    >
      <div className="w-84 overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-xl">
        <div className="p-4 border-b border-slate-200/80">
          <div className="flex items-center gap-4">
            <Avatar
              src={userAvatar}
              name={userName}
              alt={`Perfil de ${userName}`}
              size="xl"
              className="shadow-lg"
            />
            <div className="min-w-0">
              <Text
                as="p"
                size="base"
                weight="semibold"
                className="truncate text-slate-900"
              >
                {userName}
              </Text>
              <Text as="p" size="sm" className="truncate text-slate-500">
                {roleLabel}
              </Text>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 px-2 py-2 text-center">
          <Link
            href={href}
            className="w-full px-3 py-2 text-sm font-medium text-center transition-colors rounded-xl text-slate-700 hover:bg-slate-100"
          >
            {"Ajuste"}
          </Link>

          <button
            type="button"
            onClick={() => {
              onLogout?.();
            }}
            className="w-full px-3 py-2 text-sm font-medium text-center text-red-600 transition-colors rounded-xl hover:bg-red-100 hover:text-red-900"
          >
            {"Cerrar Sesión"}
          </button>
        </div>
      </div>
    </Popover>
  );
}
