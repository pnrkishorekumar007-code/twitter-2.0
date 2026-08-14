"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";

interface BookmarksContextValue {
  bookmarkIds: string[];
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (tweetId: string) => Promise<void>;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [bookmarkIds, setBookmarkIds] = useState<string[]>([]);

  const email = user?.email;

  // Reset per signed-in user (React's "adjust state during render" pattern).
  const [lastEmail, setLastEmail] = useState<string | undefined>(email);
  if (email !== lastEmail) {
    setLastEmail(email);
    setBookmarkIds([]);
  }

  // Load the signed-in user's bookmark ids whenever the session changes. 401
  // (stale token) is silently ignored — the icons just start unchecked.
  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get("/bookmarks/ids");
        if (!cancelled) setBookmarkIds(Array.isArray(data) ? data : []);
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status !== 401) {
          console.error("Failed to load bookmarks:", err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  const isBookmarked = useCallback(
    (id: string) => bookmarkIds.includes(id),
    [bookmarkIds]
  );

  // Optimistic toggle: flip the icon immediately, call the API, and revert on
  // failure so the UI never waits on the network.
  const toggleBookmark = useCallback(
    async (tweetId: string) => {
      const wasBookmarked = bookmarkIds.includes(tweetId);
      setBookmarkIds((prev) =>
        wasBookmarked
          ? prev.filter((id) => id !== tweetId)
          : [...prev, tweetId]
      );
      try {
        if (wasBookmarked) {
          await axiosInstance.delete(`/bookmarks/${tweetId}`);
        } else {
          await axiosInstance.post(`/bookmarks/${tweetId}`);
        }
      } catch (err) {
        setBookmarkIds((prev) =>
          wasBookmarked
            ? [...prev, tweetId]
            : prev.filter((id) => id !== tweetId)
        );
        console.error("Failed to update bookmark:", err);
      }
    },
    [bookmarkIds]
  );

  const value = useMemo(
    () => ({ bookmarkIds, isBookmarked, toggleBookmark }),
    [bookmarkIds, isBookmarked, toggleBookmark]
  );

  return (
    <BookmarksContext.Provider value={value}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks(): BookmarksContextValue {
  const ctx = useContext(BookmarksContext);
  if (!ctx) {
    throw new Error("useBookmarks must be used within a BookmarksProvider");
  }
  return ctx;
}
