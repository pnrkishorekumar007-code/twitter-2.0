"use client";

import React, { useEffect, useState } from "react";
import { Search, Users, UserPlus, Menu } from "lucide-react";
import { motion, fadeUp, staggerContainer } from "@/lib/motion";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { BadgeCheck } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import FollowButton from "./FollowButton";
import axiosInstance from "@/lib/axiosInstance";
import type { FollowUser } from "@/lib/types";

export default function SearchPage() {
  // Pre-fill the search box from a trend click in the right sidebar.
  const [query, setQuery] = useState(() => {
    if (typeof window !== "undefined") {
      const prefilled = sessionStorage.getItem("twiller-search-q");
      if (prefilled) {
        sessionStorage.removeItem("twiller-search-q");
        return prefilled;
      }
    }
    return "";
  });
  const [results, setResults] = useState<FollowUser[] | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      axiosInstance
        .get("/users/search", { params: { q: trimmed } })
        .then((res) => {
          if (!cancelled) setResults(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

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
            <h1 className="text-xl font-bold text-foreground">Search</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Find people by name or @username
            </p>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people"
            aria-label="Search people"
            autoFocus
            className="h-10 w-full rounded-full bg-[#eff3f4] dark:bg-x-surface-hover border border-transparent pl-12 pr-4 text-[15px] text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-200 focus:border-brand focus:bg-background"
          />
        </div>
      </div>

      <div className="px-4 py-5">
        {!query.trim() ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="py-16 text-center"
          >
            <motion.div
              variants={fadeUp}
              className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-muted mb-4"
            >
              <Users className="h-7 w-7 text-muted-foreground" />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-foreground font-bold text-xl"
            >
              Search the community
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-sm mt-1">
              Search by display name or @username to find people to follow.
            </motion.p>
          </motion.div>
        ) : results === null ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3"
              >
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted mb-3">
              <UserPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-foreground font-bold">No people found</p>
            <p className="text-muted-foreground text-sm mt-1">
              No accounts match “{query.trim()}”.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-brand" />
              <h2 className="text-lg font-bold text-foreground">People</h2>
              <span className="text-sm text-muted-foreground">
                {results.length} result{results.length === 1 ? "" : "s"}
              </span>
            </div>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              {results.map((u, i) => (
                <motion.div
                  key={u._id}
                  variants={fadeUp}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-accent/60 transition-all duration-200 ${
                    i !== results.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarImage src={u.avatar} alt={u.displayName} />
                      <AvatarFallback>{u.displayName?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1">
                        <span className="text-foreground font-semibold truncate">
                          {u.displayName || "Unknown User"}
                        </span>
                        {u.verified && (
                          <BadgeCheck className="h-4 w-4 text-brand shrink-0" />
                        )}
                      </div>
                      <span className="text-muted-foreground text-sm">
                        @{u.username || "unknown"}
                      </span>
                    </div>
                  </div>
                  <FollowButton
                    targetId={u._id}
                    accountType={u.accountType || "public"}
                    requested={u.requested}
                    className="shrink-0"
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
