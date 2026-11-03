"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  FiActivity,
  FiBarChart2,
  FiClock,
  FiFileText,
  FiList,
  FiPlusCircle,
} from "react-icons/fi";
import type { ReactNode } from "react";
import { NavbarProfile } from "@/components/molecules";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

interface SidebarLink {
  label: string;
  href: string;
  icon: ReactNode;
}

const navigationGroups: { title: string; links: SidebarLink[] }[] = [
  {
    title: "Simulación",
    links: [
      {
        label: "Crear simulación",
        href: "/simulation#form",
        icon: <FiPlusCircle aria-hidden="true" />,
      },
      {
        label: "Registros de simulación",
        href: "/simulation#results",
        icon: <FiClock aria-hidden="true" />,
      },
    ],
  },
  {
    title: "Predicción",
    links: [
      {
        label: "Realizar predicción",
        href: "/prediction#form",
        icon: <FiActivity aria-hidden="true" />,
      },
      {
        label: "Registros de predicción",
        href: "/prediction#results",
        icon: <FiFileText aria-hidden="true" />,
      },
    ],
  },
  {
    title: "Estadística",
    links: [
      {
        label: "Realizar prueba estadística",
        href: "/statistics#form",
        icon: <FiBarChart2 aria-hidden="true" />,
      },
      {
        label: "Listar pruebas estadísticas",
        href: "/statistics#results",
        icon: <FiList aria-hidden="true" />,
      },
    ],
  },
];

const allLinks = navigationGroups.flatMap((group) => group.links);

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function useCurrentHash() {
  return useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => "",
  );
}

function isCurrentLink(href: string, pathname: string, hash: string) {
  const [route, section] = href.split("#");
  const expectedHash = section ? `#${section}` : "";
  return (
    pathname === route &&
    (hash ? hash === expectedHash : expectedHash === "#form")
  );
}

function LinkButton({
  link,
  pathname,
  hash,
  compact = false,
}: {
  link: SidebarLink;
  pathname: string;
  hash: string;
  compact?: boolean;
}) {
  const current = isCurrentLink(link.href, pathname, hash);

  return (
    <Link
      href={link.href}
      aria-current={current ? "location" : undefined}
      className={cn(
        "group flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
        current
          ? "border-primary-200 bg-primary-50 text-primary-800"
          : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900",
        compact && "h-full flex-col justify-center gap-1.5 px-2 text-center text-xs",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-base text-slate-500 transition-colors group-hover:text-primary-700",
          current && "bg-white text-primary-700",
          compact && "size-7 bg-transparent text-lg",
        )}
      >
        {link.icon}
      </span>
      <span className={cn(compact && "leading-tight")}>{link.label}</span>
    </Link>
  );
}

interface SidebarProps {
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  onLogout?: () => void;
}

export function Sidebar({
  userName = "Usuario",
  userRole,
  userAvatar,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const hash = useCurrentHash();
  const showProfile = userName.length > 0;

  return (
    <aside className="hidden h-dvh w-72 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary-700 text-lg font-bold text-white">
          S
        </span>
        <div>
          <p className="font-semibold tracking-wide text-slate-900">SADUCI</p>
          <p className="text-xs text-slate-500">Herramientas clínicas</p>
        </div>
      </div>

      <nav
        aria-label="Navegación principal"
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="flex flex-col gap-7">
          {navigationGroups.map((group) => (
            <section key={group.title}>
              <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {group.title}
              </h2>
              <ul className="flex flex-col gap-1">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <LinkButton link={link} pathname={pathname} hash={hash} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </nav>

      {showProfile && (
        <div className="border-t border-slate-100 p-3">
          <NavbarProfile
            userName={userName}
            userAvatar={userAvatar}
            roleLabel={userRole || "Sesión activa"}
            href={routes.settings}
            onLogout={onLogout}
            ariaLabel="Abrir perfil y ajustes"
            className="m-0 h-auto w-full justify-start rounded-xl border-slate-100 bg-slate-50 px-2 py-2 hover:bg-slate-100"
          />
        </div>
      )}
    </aside>
  );
}

export function MobileNavigation() {
  const pathname = usePathname() ?? "/";
  const hash = useCurrentHash();

  return (
    <nav
      aria-label="Navegación principal"
      className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-slate-50 p-3 sm:grid-cols-3 lg:hidden"
    >
      {allLinks.map((link) => (
        <LinkButton
          key={link.href}
          link={link}
          pathname={pathname}
          hash={hash}
          compact
        />
      ))}
    </nav>
  );
}
