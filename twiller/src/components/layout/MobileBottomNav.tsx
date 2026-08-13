"use client";

import React from "react";
import { Home, Search, Bell, User, PenSquare } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { motion } from "@/lib/motion";
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
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl px-2 pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16">
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

        {/* Center Post action */}
        <button
          onClick={focusComposer}
          className="relative flex flex-col items-center justify-center"
          aria-label={t("post")}
        >
          <motion.span
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="grid place-items-center h-12 w-12 rounded-full bg-brand-gradient text-white shadow-lg shadow-brand/40 hover:brightness-110 transition-all"
          >
            <PenSquare className="h-6 w-6" />
          </motion.span>
        </button>

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
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-4 py-1 rounded-xl transition-all",
        current ? "text-brand" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span className="relative grid place-items-center">
        {avatar ? (
          <Avatar className={cn("h-6 w-6", current && "ring-2 ring-brand")}>
            <AvatarImage src={avatar} alt="" />
            <AvatarFallback>{label[0]}</AvatarFallback>
          </Avatar>
        ) : (
          <Icon className="h-6 w-6" />
        )}
        {current && !avatar && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-brand" />
        )}
      </span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
