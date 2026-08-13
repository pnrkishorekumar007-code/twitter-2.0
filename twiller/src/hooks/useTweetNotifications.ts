"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { getSocket } from "@/lib/socketClient";
import type { Tweet } from "@/lib/types";

const KEYWORDS = ["cricket", "science"];

/**
 * KEYWORD NOTIFICATIONS — polling fallback.
 *
 * The primary delivery channel is Socket.IO (see NotificationsContext), which
 * pushes "keyword-tweet" events the moment a matching tweet is created. This
 * hook watches the in-memory tweet list and is only used as a **fallback** when
 * the real-time channel is not connected, so users never get duplicate popups.
 *
 * Respects the user's `keywordNotifications` preference, the browser
 * permission, and matches keywords case-insensitively.
 */
export function useTweetNotifications(tweets: Tweet[]) {
  const { user } = useAuth();
  const { settings } = useNotifications();
  const [socketLive, setSocketLive] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const permissionAsked = useRef(false);
  const initialized = useRef(false);

  // Track whether the Socket.IO channel is up. When it is, polling stands down.
  useEffect(() => {
    const check = () => setSocketLive(getSocket()?.connected ?? false);
    check();
    const id = window.setInterval(check, 2000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user || !settings.keywordNotifications) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (socketLive) return; // real-time channel is handling delivery

    if (!permissionAsked.current && Notification.permission === "default") {
      permissionAsked.current = true;
      Notification.requestPermission();
    }
    if (Notification.permission !== "granted") return;

    const isFirstPass = !initialized.current;
    initialized.current = true;

    tweets.forEach((tweet) => {
      const id = tweet._id || tweet.id;
      if (!id || seenIds.current.has(id)) return;
      seenIds.current.add(id);
      if (isFirstPass) return; // don't spam notifications for tweets that already existed

      const text = (tweet.content || "").toLowerCase();
      const matched = KEYWORDS.find((k) => text.includes(k));
      if (matched) {
        new Notification("New Keyword Tweet", {
          body: tweet.content || "",
          icon: tweet.author?.avatar || "/favicon.ico",
          tag: `twiller-kw-${id}`,
        });
      }
    });
  }, [tweets, user, settings.keywordNotifications, socketLive]);
}
