"use client";

import { FiBell } from "react-icons/fi";
import { Text } from "@/components/atoms/Text";
import { cn } from "@/lib/utils";
import { Popover } from "@/components/molecules/Popover";
import { NotificationsPanel } from "@/components/molecules/NotificationsPanel";
import { useNotifications } from "@/context/notifications";

interface FooterProps {
  className?: string;
  disabled?: boolean;
}

/**
 * Renders the app footer with notifications access and platform status.
 * Used in X case: persistent bottom bar in the authenticated shell.
 */
export function Footer({ className, disabled }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  return (
    <footer
      className={cn(
        "flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-slate-200/80 bg-white/75 px-3 py-2 supports-backdrop-filter:bg-white/60 surface-backdrop-opaque transition-colors sm:px-4 lg:px-8",
        disabled && "opacity-50 grayscale pointer-events-none",
        className,
      )}
    >
      <Text
        as="p"
        size="xs"
        weight="medium"
        className="text-(length:--font-size-xs) text-slate-500"
      >
        &copy; {currentYear} Saduci Platform
      </Text>

      <div className="flex items-center gap-4">
        <Popover
          align="right"
          trigger={
            <button
              type="button"
              className="relative p-2 rounded-md text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"
              title="Notificaciones"
              aria-label="Notificaciones"
            >
              <FiBell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-(length:--font-size-xs) text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          }
        >
          <NotificationsPanel
            notifications={notifications}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
          />
        </Popover>

        <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    </footer>
  );
}
