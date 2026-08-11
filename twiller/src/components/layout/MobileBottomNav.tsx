"use client";

import React from "react";
import { Home, Search, User, PenSquare } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export default function MobileBottomNav({
  currentPage = "home",
  onNavigate,
}: MobileBottomNavProps) {
  const { t } = useLanguage();

  const focusComposer = () => {
    onNavigate?.("home");
    window.dispatchEvent(new CustomEvent("twiller:focus-composer"));
  };

  const items = [
    { key: "home", label: t("home"), icon: Home },
    { key: "explore", label: t("explore"), icon: Search },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-2 pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const active = currentPage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate?.(item.key)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all",
                active
                  ? "text-brand bg-brand/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* Center Post action */}
        <button
          onClick={focusComposer}
          className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl text-muted-foreground hover:text-foreground transition-all"
          aria-label={t("post")}
        >
          <span className="grid place-items-center h-9 w-9 rounded-full bg-brand-gradient text-white shadow-lg shadow-brand/40 hover:brightness-110 transition-all">
            <PenSquare className="h-5 w-5" />
          </span>
          <span className="text-[10px] font-medium">{t("post")}</span>
        </button>

        {[{ key: "profile", label: t("profile"), icon: User }].map((item) => {
          const active = currentPage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate?.(item.key)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all",
                active
                  ? "text-brand bg-brand/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
