"use client";

import React, { useState } from "react";
import { Search, TrendingUp, Flame, Newspaper, Video } from "lucide-react";
import { motion, fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

const TRENDS = [
  { category: "Sports", tag: "Champions Trophy", posts: "2.4M posts", icon: Flame },
  { category: "Trending in India", tag: "#Science", posts: "180K posts", icon: TrendingUp },
  { category: "Entertainment", tag: "Blockbuster Night", posts: "94.2K posts", icon: Video },
  { category: "World news", tag: "Mars Mission", posts: "12.8K posts", icon: Newspaper },
  { category: "Technology", tag: "AI everywhere", posts: "210K posts", icon: TrendingUp },
];

export default function ExplorePage() {
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.12)] px-4 py-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search"
            className="w-full rounded-full bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all"
          />
        </div>
      </div>

      <div className="px-4 py-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-brand" />
          <h2 className="text-lg font-bold text-foreground">What&apos;s happening</h2>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl shadow-lg overflow-hidden"
        >
          {TRENDS.filter((tr) => tr.tag.toLowerCase().includes(query.toLowerCase())).map(
            (trend, i) => (
              <motion.button
                key={trend.tag}
                variants={fadeUp}
                className={cn(
                  "w-full text-left px-4 py-4 hover:bg-white/[0.04] transition-all duration-200 flex items-center justify-between",
                  i !== TRENDS.length - 1 && "border-b border-white/[0.06]"
                )}
              >
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{trend.category}</p>
                  <p className="text-foreground font-bold truncate">{trend.tag}</p>
                  <p className="text-xs text-muted-foreground">{trend.posts}</p>
                </div>
                <trend.icon className="h-5 w-5 text-muted-foreground shrink-0" />
              </motion.button>
            )
          )}
        </motion.div>

        {query && (
          <p className="text-sm text-muted-foreground mt-4">
            {TRENDS.filter((tr) => tr.tag.toLowerCase().includes(query.toLowerCase())).length} result(s)
            for “{query}”
          </p>
        )}
      </div>
    </div>
  );
}
