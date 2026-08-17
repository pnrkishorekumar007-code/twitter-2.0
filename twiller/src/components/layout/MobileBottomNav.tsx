"use client";

import React from "react";
import {
  Home,
  Search,
  Bell,
  User,
  PenSquare,
  Menu,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { motion } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
  onOpenMenu?: () => void;
}

export default function MobileBottomNav({
  currentPage = "home",
  onNavigate,
  onOpenMenu,
}: MobileBottomNavProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const focusComposer = () => {
    onNavigate?.("home");
    window.dispatchEvent(new CustomEvent("twiller:focus-composer"));
  };

  const items = [
    { page: "home", label: t("home"), icon: Home },
    { page: "explore", label: t("explore"), icon: Search },
    { page: "notifications", label: t("notifications"), icon: Bell },
    { page: "profile", label: t("profile"), icon: User },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/70 backdrop-blur-2xl shadow-[0_-1px_3px_rgba(0,0,0,0.12)] px-1 pb-[env(safe-area-inset-bottom)]"
      aria-label={t("mobile_nav")}
    >
      <div className="relative flex items-center justify-around h-16">
        {items.slice(0, 2).map((item) => (
          <NavButton
            key={item.page}
            label={item.label}
            icon={item.icon}
            page={item.page}
            current={currentPage === item.page}
            onNavigate={onNavigate}
          />
        ))}

        {/* Menu button — opens the slide-out drawer with all destinations */}
        <NavButton
          key="menu"
          label={t("more")}
          icon={Menu}
          page="menu"
          current={false}
          onNavigate={onOpenMenu}
        />

        {items.slice(2).map((item) => (
          <NavButton
            key={item.page}
            label={item.label}
            icon={item.icon}
            page={item.page}
            current={currentPage === item.page}
            onNavigate={onNavigate}
            avatar={item.page === "profile" && user ? user.avatar : undefined}
          />
        ))}
      </div>

      {/* Floating compose action above the nav bar (X-style FAB) */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
        onClick={focusComposer}
        aria-label={t("post")}
        className="absolute right-4 bottom-[calc(env(safe-area-inset-bottom)+3.75rem)] grid h-14 w-14 place-items-center rounded-full bg-brand-gradient text-white shadow-lg shadow-brand/40 hover:brightness-110 transition-all"
      >
        <PenSquare className="h-6 w-6" />
      </motion.button>
    </nav>
  );
}

function NavButton({
  page,
  label,
  icon: Icon,
  current,
  onNavigate,
  avatar,
}: {
  page: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  current: boolean;
  onNavigate?: (page: string) => void;
  avatar?: string;
}) {
  return (
    <button
      onClick={() => onNavigate?.(page)}
      aria-current={current ? "page" : undefined}
      aria-label={label}
      className={cn(
        "relative flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 transition-all active:scale-95",
        current ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span className="relative grid place-items-center">
        {avatar ? (
          <Avatar className={cn("h-6 w-6", current && "ring-2 ring-brand")}>
            <AvatarImage src={avatar} alt="" />
            <AvatarFallback>{label[0]}</AvatarFallback>
          </Avatar>
        ) : (
          <Icon className="h-6 w-6" aria-hidden="true" />
        )}
        {current && !avatar && (
          <span className="absolute -bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-brand" />
        )}
      </span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
