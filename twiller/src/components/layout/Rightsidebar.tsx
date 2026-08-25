"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import SearchBar from "../widgets/SearchBar";
import TrendingCard from "../widgets/TrendingCard";
import FollowCard from "../widgets/FollowCard";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "../ui/button";

export default function RightSidebar() {
  const { t } = useLanguage();

  const trends = [
    { category: t("right_trending_sports"), tag: t("right_trend_cricket"), posts: t("right_trend_cricket_posts") },
    { category: t("right_trending_india"), tag: t("right_trend_science"), posts: t("right_trend_science_posts") },
    { category: t("right_tech"), tag: t("right_trend_ai"), posts: t("right_trend_ai_posts") },
  ];

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Sticky search */}
      <div className="sticky top-0 z-10 bg-background py-1">
        <SearchBar />
      </div>

      {/* Subscribe */}
      <section
        aria-label={t("right_subscribe")}
        className="rounded-2xl border border-border bg-card p-4"
      >
        <h2 className="mb-1 flex items-center gap-2 text-xl font-extrabold text-foreground">
          <Sparkles className="h-5 w-5 text-brand" aria-hidden="true" />
          {t("right_subscribe")}
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {t("right_subscribe_desc")}
        </p>
        <Button
          onClick={() => window.dispatchEvent(new CustomEvent("twiller:go-premium"))}
        >
          {t("right_subscribe_btn")}
        </Button>
      </section>

      {/* Trends */}
      <TrendingCard trends={trends} />

      {/* Who to follow */}
      <FollowCard />

      {/* Footer links */}
      <nav aria-label="Footer" className="space-y-2 p-4 text-xs leading-4 text-muted-foreground">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {[t("right_terms"), t("right_privacy"), t("right_cookies"), t("right_accessibility"), t("right_ads")].map(
            (label) => (
              <a
                key={label}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="transition-colors duration-200 hover:text-foreground hover:underline"
              >
                {label}
              </a>
            )
          )}
        </div>
        <div>{t("right_copyright")}</div>
      </nav>
    </div>
  );
}
