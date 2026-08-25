"use client";

import React, { useEffect, useState } from "react";
import { Bookmark, Menu } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useBookmarks } from "@/context/BookmarksContext";
import TweetCard from "./TweetCard";
import { Skeleton } from "./ui/skeleton";
import axiosInstance from "@/lib/axiosInstance";
import type { Tweet } from "@/lib/types";

export default function BookmarksPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isBookmarked } = useBookmarks();
  const [tweets, setTweets] = useState<Tweet[] | null>(null);

  // Reset per signed-in user (React's "adjust state during render" pattern).
  const email = user?.email;
  const [lastEmail, setLastEmail] = useState<string | undefined>(email);
  if (email !== lastEmail) {
    setLastEmail(email);
    setTweets(null);
  }

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    axiosInstance
      .get("/bookmarks")
      .then((res) => {
        if (!cancelled) setTweets(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status !== 401 && !cancelled) setTweets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [email]);

  // Live-filter so removing a bookmark removes the tweet instantly (the
  // context updates optimistically; this page just re-derives the list).
  const bookmarkedTweets = (tweets || []).filter((t) => isBookmarked(t._id));

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("twiller:open-menu"))}
            className="md:hidden grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground hover:bg-accent transition-colors active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("bookmarks")}</h1>
            {user && (
              <p className="text-xs text-muted-foreground mt-0.5">@{user.username}</p>
            )}
          </div>
        </div>
      </div>

      {tweets === null ? (
        <div className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-4">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : bookmarkedTweets.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand/10 mb-5">
            <Bookmark className="h-8 w-8 text-brand" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">Save posts for later</h2>
          <p className="text-muted-foreground mt-2 text-[15px] max-w-sm">
            Bookmark posts to easily find them again in the future. Tap the
            bookmark icon on any tweet to add it here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {bookmarkedTweets.map((tweet) => (
            <TweetCard key={tweet._id} tweet={tweet} />
          ))}
        </div>
      )}
    </div>
  );
}
