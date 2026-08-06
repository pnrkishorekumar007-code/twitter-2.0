"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  browserSupported,
  requestNotificationPermission,
  getInAppNotifications,
} from "@/lib/notifications";

interface NotificationContextType {
  enabled: boolean;
  permission: NotificationPermission | "unsupported";
  unreadCount: number;
  refreshUnread: () => void;
  toggle: () => Promise<void>;
  requestPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = () => {
    try {
      const list = getInAppNotifications();
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("twiller-notifications");
    if (stored) {
      setEnabled(stored === "true");
    }
    if (browserSupported()) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }
    refreshUnread();
    window.addEventListener("storage", refreshUnread);
    return () => window.removeEventListener("storage", refreshUnread);
  }, []);

  const toggle = async () => {
    if (!browserSupported()) return;
    if (enabled) {
      setEnabled(false);
      localStorage.setItem("twiller-notifications", "false");
      return;
    }
    const granted = await requestNotificationPermission();
    setPermission(Notification.permission);
    if (granted) {
      setEnabled(true);
      localStorage.setItem("twiller-notifications", "true");
    }
  };

  const requestPermission = async () => {
    if (!browserSupported()) return;
    await requestNotificationPermission();
    setPermission(Notification.permission);
  };

  return (
    <NotificationContext.Provider
      value={{
        enabled,
        permission,
        unreadCount,
        refreshUnread,
        toggle,
        requestPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
