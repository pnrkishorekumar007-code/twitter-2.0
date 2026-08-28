"use client";

import React, { useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

/**
 * X-style search field: filled #202327 pill at rest, black background with a
 * blue ring while focused. Submitting routes to the search page.
 */
export default function SearchBar({ className }: { className?: string }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    sessionStorage.setItem("twiller-search-q", q);
    window.dispatchEvent(new CustomEvent("twiller:go-search"));
    setQuery("");
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn("relative", className)}
    >
      <Search
        className={cn(
          "pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2",
          focused ? "text-brand" : "text-muted-foreground"
        )}
        aria-hidden="true"
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t("explore")}
        aria-label={t("explore")}
        className={cn(
          "h-10 w-full rounded-full border bg-[#eff3f4] dark:bg-x-surface-hover pl-12 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-200",
          focused ? "border-brand bg-background" : "border-transparent"
        )}
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-x-blue-hover"
        >
          <X className="h-3 w-3" strokeWidth={3} />
        </button>
      )}
    </form>
  );
}
