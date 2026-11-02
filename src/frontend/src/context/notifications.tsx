"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";

export type NotificationType = "success" | "failure" | "info";

export interface NotificationItem {
  id: number | string;
  title: string;
  body?: string;
  read?: boolean;
  type?: NotificationType;
}

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: NotificationItem["id"]) => void;
  markAllAsRead: () => void;
  addNotification: (n: Omit<NotificationItem, "id">) => void;
  removeNotification: (id: NotificationItem["id"]) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

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

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markAsRead,
      markAllAsRead,
      addNotification,
      removeNotification,
    }),
    [
      notifications,
      markAsRead,
      markAllAsRead,
      addNotification,
      removeNotification,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationsProvider",
    );
  return ctx;
}
