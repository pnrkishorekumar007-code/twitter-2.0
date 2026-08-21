"use client";

import React, { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import FollowButton from "../FollowButton";
import axiosInstance from "@/lib/axiosInstance";
import type { FollowUser } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";

/**
 * "Who to follow" card — fetches suggested users and renders flat rows with
 * an inline follow button. Rows remove themselves once followed.
 */
export default function FollowCard() {
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/users/suggested", { params: { limit: 3 } })
      .then((res) => {
        if (!cancelled) setSuggestions(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      aria-label={t("right_you_might_like")}
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <h2 className="px-4 py-3 text-xl font-extrabold text-foreground">
        {t("right_you_might_like")}
      </h2>
      {loading ? (
        <div className="space-y-1 px-4 pb-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3 py-2">
              <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-28 rounded-full bg-muted" />
                <div className="h-3 w-20 rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">
          {t("right_no_suggestions")}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {suggestions.map((user) => (
            <div
              key={user._id}
              className="flex items-center justify-between gap-2 px-4 py-3 transition-colors duration-200 hover:bg-hover-overlay"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={user.avatar} alt={user.displayName} />
                  <AvatarFallback>{user.displayName?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-[15px] font-bold text-foreground hover:underline">
                      {user.displayName || "Unknown User"}
                    </span>
                    {user.verified && (
                      <BadgeCheck className="h-[18px] w-[18px] shrink-0 text-brand" aria-label="Verified" />
                    )}
                  </div>
                  <span className="block truncate text-sm text-muted-foreground">
                    @{user.username || "unknown"}
                  </span>
                </div>
              </div>
              <FollowButton
                targetId={user._id}
                onToggle={(nowFollowing) => {
                  if (nowFollowing) {
                    setSuggestions((prev) => prev.filter((s) => s._id !== user._id));
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
