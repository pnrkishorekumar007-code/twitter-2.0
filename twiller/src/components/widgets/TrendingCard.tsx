"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

interface Trend {
  category: string;
  tag: string;
  posts: string;
}

/**
 * "What's happening" card — flat surface, hairline dividers between rows,
 * circular hover highlight per row (X pattern).
 */
export default function TrendingCard({ trends }: { trends: Trend[] }) {
  const { t } = useLanguage();

  const openTrend = (tag: string) => {
    sessionStorage.setItem("twiller-search-q", tag.replace(/^#/, ""));
    window.dispatchEvent(new CustomEvent("twiller:go-search"));
  };

  return (
    <section
      aria-label={t("right_whats_happening")}
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <h2 className="px-4 py-3 text-xl font-extrabold text-foreground">
        {t("right_whats_happening")}
      </h2>
      <div className="divide-y divide-border">
        {trends.map((trend) => (
          <button
            key={trend.tag}
            type="button"
            onClick={() => openTrend(trend.tag)}
            className="block w-full px-4 py-3 text-left transition-colors duration-200 hover:bg-hover-overlay"
          >
            <p className="text-[13px] text-muted-foreground">{trend.category}</p>
            <p className="truncate text-[15px] font-bold text-foreground">{trend.tag}</p>
            <p className="text-[13px] text-muted-foreground">{trend.posts}</p>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="block w-full px-4 py-3 text-left text-[15px] text-brand transition-colors duration-200 hover:bg-hover-overlay"
      >
        {t("right_show_more")}
      </button>
    </section>
  );
}
