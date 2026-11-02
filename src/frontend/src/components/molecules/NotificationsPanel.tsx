"use client";

import React from "react";
import { FiBell, FiCheckCircle, FiXCircle, FiInfo } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { Text } from "@/components/atoms/Text";
import type { NotificationItem } from "@/context/notifications";

export type { NotificationItem };

const TYPE_ICON: Record<string, React.ReactNode> = {
  success: <FiCheckCircle className="w-4 h-4 text-emerald-500" />,
  failure: <FiXCircle className="w-4 h-4 text-rose-500" />,
  info: <FiInfo className="w-4 h-4 text-blue-500" />,
};

const TYPE_TITLE: Record<string, string> = {
  success: "text-emerald-700",
  failure: "text-rose-700",
  info: "text-slate-900",
};

interface NotificationsPanelProps {
  notifications: NotificationItem[];
  className?: string;
  onMarkAsRead?: (id: NotificationItem["id"]) => void;
  onMarkAllAsRead?: () => void;
}

/**
 * Shows notification items with actions to mark individual or all as read.
 * Used in X case: notification popover content in the app footer.
 */
export function NotificationsPanel({
  notifications,
  className,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationsPanelProps) {
  return (
    <div
      className={cn(
        "w-full max-w-xs rounded-xl surface-backdrop-opaque border border-slate-200 shadow-lg z-20 overflow-hidden",
        className,
      )}
      role="dialog"
    >
      <div className="flex items-center justify-between p-3 border-b border-slate-100">
        <Text as="h4" size="sm" weight="semibold" className="text-slate-800">
          Notificaciones
        </Text>
        {onMarkAllAsRead && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="hover:text-slate-700"
          >
            <Text as="span" size="sm" className="text-slate-500">
              Marcar todo
            </Text>
          </button>
        )}
      </div>
      <div className="overflow-auto divide-y divide-slate-100 max-h-[50vh]">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "px-4 py-3 hover:bg-slate-50 flex justify-between items-start",
                !n.read && "bg-slate-50",
              )}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">
                  {TYPE_ICON[n.type ?? "info"] ?? TYPE_ICON.info}
                </div>
                <div>
                  <Text
                    as="p"
                    size="sm"
                    weight="medium"
                    className={cn(
                      TYPE_TITLE[n.type ?? "info"] ?? TYPE_TITLE.info,
                    )}
                  >
                    {n.title}
                  </Text>
                  {n.body && (
                    <Text as="p" size="sm" className="text-slate-600">
                      {n.body}
                    </Text>
                  )}
                </div>
              </div>
              {!n.read && onMarkAsRead && (
                <div className="pl-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => onMarkAsRead(n.id)}
                    className="hover:underline"
                  >
                    <Text as="span" size="sm" className="text-blue-600">
                      Marcar leída
                    </Text>
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-slate-500">
            <div className="inline-flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-md bg-slate-100 text-slate-600">
              <FiBell className="w-4 h-4" />
            </div>
            <Text as="p" size="base">
              No hay notificaciones
            </Text>
            <Text as="p" size="xs" className="mt-2 text-slate-400">
              No hay notificaciones recientes. Te avisaremos cuando haya
              novedades.
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPanel;
