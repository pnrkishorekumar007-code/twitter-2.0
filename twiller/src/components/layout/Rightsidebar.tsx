"use client";

import { Search, BadgeCheck, Sparkles, UserPlus } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import axiosInstance from "@/lib/axiosInstance";
import FollowButton from "../FollowButton";
import type { FollowUser } from "@/lib/types";

const trends = [
  { category: "Sports · Trending", tag: "#Cricket", posts: "24.5K posts" },
  { category: "Trending in India", tag: "#Science", posts: "12.1K posts" },
  { category: "Technology", tag: "AI everywhere", posts: "8,492 posts" },
];

export default function RightSidebar() {
  const [suggestions, setSuggestions] = useState<FollowUser[]>([]);

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/users/suggested", { params: { limit: 5 } })
      .then((res) => {
        if (!cancelled) setSuggestions(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full space-y-4 sticky top-0">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <Input
          placeholder="Search"
          className="pl-12 bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground rounded-full py-3 focus-visible:border-brand focus-visible:ring-brand/20 focus-visible:ring-[3px] backdrop-blur-xl"
        />
      </div>

      {/* Premium */}
      <Card className="bg-white/[0.03] backdrop-blur-xl border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="h-1 bg-brand-gradient animate-gradient" />
        <CardContent className="p-4">
          <h3 className="text-foreground text-xl font-extrabold mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            Subscribe to Premium
          </h3>
          <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
            Subscribe to unlock new features and if eligible, receive a share
            of revenue.
          </p>
          <Button
            className="bg-brand-gradient animate-gradient text-white font-bold rounded-full shadow-lg shadow-brand/30 hover:brightness-110"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("twiller:go-premium"))
            }
          >
            Subscribe
          </Button>
        </CardContent>
      </Card>

      {/* Trends */}
      <Card className="bg-white/[0.03] backdrop-blur-xl border-white/[0.06] rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <h3 className="text-foreground text-xl font-extrabold px-4 py-3">
            What&apos;s happening
          </h3>
          <div className="divide-y divide-border">
            {trends.map((trend) => (
              <button
                key={trend.tag}
                className="w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-all duration-200"
              >
                <p className="text-xs text-muted-foreground">{trend.category}</p>
                <p className="text-foreground font-bold text-[15px]">{trend.tag}</p>
                <p className="text-xs text-muted-foreground">{trend.posts}</p>
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            className="text-brand hover:text-brand/80 hover:bg-brand/10 px-4 py-3 h-auto rounded-none w-full justify-start font-semibold"
          >
            Show more
          </Button>
        </CardContent>
      </Card>

      {/* Who to follow */}
      <Card className="bg-white/[0.03] backdrop-blur-xl border-white/[0.06] rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <h3 className="text-foreground text-xl font-extrabold px-4 py-3">
            You might like
          </h3>
          {suggestions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted mb-2">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                No suggestions right now.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {suggestions.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition-all duration-200"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={user.avatar} alt={user.displayName} />
                      <AvatarFallback>
                        {user.displayName?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1">
                        <span className="text-foreground font-semibold truncate hover:underline cursor-pointer">
                          {user.displayName || "Unknown User"}
                        </span>
                        {user.verified && (
                          <BadgeCheck className="h-4 w-4 text-brand shrink-0" />
                        )}
                      </div>
                      <span className="text-muted-foreground text-sm">
                        @{user.username || "unknown"}
                      </span>
                    </div>
                  </div>
                  <FollowButton
                    targetId={user._id}
                    onToggle={(nowFollowing) => {
                      if (nowFollowing) {
                        setSuggestions((prev) =>
                          prev.filter((s) => s._id !== user._id)
                        );
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="p-4 text-xs text-muted-foreground space-y-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {["Terms of Service", "Privacy Policy", "Cookie Policy", "Accessibility", "Ads info"].map(
            (label) => (
              <a
                key={label}
                href="#"
                className="hover:underline hover:text-foreground transition-colors"
              >
                {label}
              </a>
            )
          )}
        </div>
        <div>© 2024 Twiller Corp.</div>
      </div>
    </div>
  );
}
