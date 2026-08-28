"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";
import { connectSocket, disconnectSocket } from "@/lib/socketClient";
import type { KeywordNotificationPayload } from "@/lib/types";

export type NotificationPermission = "default" | "granted" | "denied" | "unsupported";

interface NotificationSettings {
  keywordNotifications: boolean;
  keywords: string[];
}

interface NotificationsContextValue {
  loading: boolean;
  saving: boolean;
  permission: NotificationPermission;
  settings: NotificationSettings;
  saveMessage: string | null;
  requestPermission: () => Promise<NotificationPermission>;
  updateSettings: (keywordNotifications: boolean, keywords?: string[]) => Promise<boolean>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function getPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return window.Notification.permission as NotificationPermission;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(getPermission);
  const [settings, setSettings] = useState<NotificationSettings>({
    keywordNotifications: false,
    keywords: [],
  });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const connectedRef = useRef(false);

  // Reset per signed-in user (React's "adjust state during render" pattern).
  const [lastUserEmail, setLastUserEmail] = useState<string | undefined>(user?.email);
  if (user?.email !== lastUserEmail) {
    setLastUserEmail(user?.email);
    setSettings({ keywordNotifications: false, keywords: [] });
    setLoading(!!user?.email);
  }

  const showBrowserNotification = useCallback((payload: KeywordNotificationPayload) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (window.Notification.permission !== "granted") return;

    const authorName = payload.author?.displayName || "Someone";
    const title = `New tweet from ${authorName}`;
    const body = `${authorName}: ${payload.content || "A tweet you might like was just posted."}`;

    const options: NotificationOptions = { tag: `twiller-kw-${payload.tweetId}` };
    // Project logo/avatar as the notification icon.
    options.icon = payload.author?.avatar || "/favicon.ico";
    try {
      new Notification(title, { ...options, body });
    } catch {
      // Some browsers reject notifications when the tab lacks focus.
    }
  }, []);

  // Keep the socket connected exactly while we should be receiving popups.
  const shouldListen = !!user && settings.keywordNotifications && permission === "granted";

  useEffect(() => {
    if (!shouldListen) {
      if (connectedRef.current) {
        disconnectSocket();
        connectedRef.current = false;
      }
      return;
    }
    if (connectedRef.current) return;

    let mounted = true;
    (async () => {
      const s = await connectSocket();
      if (!mounted || !s) return;
      connectedRef.current = true;
      s.off("keyword-tweet", showBrowserNotification);
      s.on("keyword-tweet", showBrowserNotification);
    })();
    return () => {
      mounted = false;
    };
  }, [shouldListen, showBrowserNotification]);

  useEffect(() => () => disconnectSocket(), []);

  // Load settings when the signed-in user changes.
  const email = user?.email;
  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get("/user/notification-settings");
        if (cancelled) return;
        setSettings({
          keywordNotifications: data.keywordNotifications,
          keywords: data.keywords || [],
        });
      } catch (err) {
        // 401 = not authenticated for this feature (stale token). Not a real
        // error — keep the default (disabled) settings silently.
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 401) {
          console.error("Failed to load notification settings:", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return "unsupported";
    }
    if (window.Notification.permission === "granted") {
      setPermission("granted");
      return "granted";
    }
    let result = "denied" as NotificationPermission;
    try {
      result = (await window.Notification.requestPermission()) as NotificationPermission;
    } catch {
      result = "denied";
    }
    setPermission(result);
    return result;
  }, []);

  const updateSettings = useCallback(
    async (keywordNotifications: boolean, keywords?: string[]): Promise<boolean> => {
      setSaving(true);
      setSaveMessage(null);
      try {
        const { data } = await axiosInstance.put("/user/notification-settings", {
          keywordNotifications,
          ...(Array.isArray(keywords) ? { keywords } : {}),
        });
        setSettings({
          keywordNotifications: data.keywordNotifications,
          keywords: data.keywords || [],
        });
        setSaveMessage(
          keywordNotifications
            ? "Notifications enabled — you'll get a popup when a tweet mentions your keywords."
            : "Notifications disabled."
        );
        return true;
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 401) {
          console.error("Failed to update notification settings:", err);
        }
        setSaveMessage("Couldn't save your preference. Please try again.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const value = useMemo(
    () => ({ loading, saving, permission, settings, saveMessage, requestPermission, updateSettings }),
    [loading, saving, permission, settings, saveMessage, requestPermission, updateSettings]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return ctx;
}
