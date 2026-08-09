"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

const KEYWORDS = ["cricket", "science"];

/**
 * TASK 5: watches the tweet list for the keywords "cricket" or "science"
 * and fires a browser Notification popup with the full tweet content,
 * only when the user has notifications enabled in their profile.
 */
export function useTweetNotifications(tweets: any[]) {
  const { user } = useAuth();
  const seenIds = useRef<Set<string>>(new Set());
  const permissionAsked = useRef(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || !(user as any).notificationsEnabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

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
        new Notification(`New tweet about ${matched}!`, {
          body: tweet.content,
          icon: tweet.author?.avatar,
        });
      }
    });
  }, [tweets, user]);
}
