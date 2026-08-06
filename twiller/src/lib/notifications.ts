export interface NotificationPref {
  enabled: boolean;
  permission: NotificationPermission | "unsupported";
}

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

export function browserSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!browserSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export function showBrowserNotification(
  title: string,
  body: string
): boolean {
  if (!browserSupported() || Notification.permission !== "granted") return false;
  try {
    const notification = new Notification(title, {
      body,
      icon: "/favicon.ico",
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

export function pushInAppNotification(
  title: string,
  body: string,
  prefs: NotificationPref
): void {
  const entry: InAppNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    body,
    timestamp: new Date().toISOString(),
    read: false,
  };
  const stored = localStorage.getItem("twiller-notifications-list");
  const prev: InAppNotification[] = stored ? JSON.parse(stored) : [];
  localStorage.setItem(
    "twiller-notifications-list",
    JSON.stringify([entry, ...prev.slice(0, 49)])
  );
  if (prefs.enabled) {
    if (!showBrowserNotification(title, body)) {
      if (prefs.permission === "default") {
        requestNotificationPermission().then(() => {
          showBrowserNotification(title, body);
        });
      }
    }
  }
}

export function getInAppNotifications(): InAppNotification[] {
  const stored = localStorage.getItem("twiller-notifications-list");
  return stored ? JSON.parse(stored) : [];
}

export function markAllRead(): void {
  const stored = localStorage.getItem("twiller-notifications-list");
  if (!stored) return;
  const prev: InAppNotification[] = JSON.parse(stored);
  localStorage.setItem(
    "twiller-notifications-list",
    JSON.stringify(prev.map((n) => ({ ...n, read: true })))
  );
}

export function clearNotifications(): void {
  localStorage.removeItem("twiller-notifications-list");
}
