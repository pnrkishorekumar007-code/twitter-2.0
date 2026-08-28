"use client";

/**
 * Keyword-based browser notifications hook.
 *
 * The full implementation (permission handling, settings load/save, Socket.IO
 * connection, and triggering the Notification API) lives in the
 * `NotificationsProvider` so a single real-time channel and a single event
 * listener are shared app-wide. This module is the public entry point.
 */
export {
  useNotifications,
  NotificationsProvider,
} from "@/context/NotificationsContext";
export type { NotificationPermission } from "@/context/NotificationsContext";
