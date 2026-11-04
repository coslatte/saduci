"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type NotificationType = "success" | "failure" | "info";

export interface NotificationItem {
  id: number | string;
  title: string;
  body?: string;
  read?: boolean;
  type?: NotificationType;
}

interface NotificationsStateValue {
  notifications: NotificationItem[];
  unreadCount: number;
}

interface NotificationsActionsValue {
  markAsRead: (id: NotificationItem["id"]) => void;
  markAllAsRead: () => void;
  addNotification: (n: Omit<NotificationItem, "id">) => void;
  removeNotification: (id: NotificationItem["id"]) => void;
}

const NotificationsStateContext = createContext<NotificationsStateValue | null>(
  null,
);
const NotificationsActionsContext =
  createContext<NotificationsActionsValue | null>(null);

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const markAsRead = useCallback((id: NotificationItem["id"]) => {
    setNotifications((prev) =>
      prev.map((p) => (p.id === id ? { ...p, read: true } : p)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((p) => ({ ...p, read: true })));
  }, []);

  const addNotification = useCallback((n: Omit<NotificationItem, "id">) => {
    setNotifications((prev) => [
      {
        id: prev.length ? Math.max(...prev.map((p) => Number(p.id))) + 1 : 1,
        ...n,
      },
      ...prev,
    ]);
  }, []);

  const removeNotification = useCallback((id: NotificationItem["id"]) => {
    setNotifications((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // State and actions live in separate contexts so a notification change does
  // not invalidate the action callbacks, which never change identity.
  const state: NotificationsStateValue = {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
  const actions: NotificationsActionsValue = {
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
  };

  return (
    <NotificationsStateContext.Provider value={state}>
      <NotificationsActionsContext.Provider value={actions}>
        {children}
      </NotificationsActionsContext.Provider>
    </NotificationsStateContext.Provider>
  );
}

export function useNotificationsState(): NotificationsStateValue {
  const context = useContext(NotificationsStateContext);

  if (!context) {
    throw new Error("useNotificationsState requiere NotificationsProvider.");
  }

  return context;
}

export function useNotificationsActions(): NotificationsActionsValue {
  const context = useContext(NotificationsActionsContext);

  if (!context) {
    throw new Error("useNotificationsActions requiere NotificationsProvider.");
  }

  return context;
}
