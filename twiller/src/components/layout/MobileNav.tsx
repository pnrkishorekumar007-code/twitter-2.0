"use client";

import React from "react";
import {
  Home,
  Search,
  Bell,
  User,
  Menu,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import FloatingButton from "./FloatingButton";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
  onOpenMenu?: () => void;
}

/**
 * X-style mobile bottom bar: icon-only, hairline top border, safe-area
 * padding, with a floating compose button anchored above it.
 */
export default function MobileNav({
  currentPage = "home",
  onNavigate,
  onOpenMenu,
}: MobileNavProps) {
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label={t("mobile_nav")}
    >
      <div className="flex h-[53px] items-stretch justify-around">
        {items.slice(0, 2).map((item) => (
          <NavButton
            key={item.page}
            label={item.label}
            icon={item.icon}
            current={currentPage === item.page}
            onClick={() => onNavigate?.(item.page)}
          />
        ))}

        {/* More menu — opens the slide-out drawer with all destinations */}
        <NavButton
          label={t("more")}
          icon={Menu}
          current={false}
          onClick={() => onOpenMenu?.()}
        />

        {items.slice(2).map((item) => (
          <NavButton
            key={item.page}
            label={item.label}
            icon={item.icon}
            current={currentPage === item.page}
            onClick={() => onNavigate?.(item.page)}
            avatar={item.page === "profile" && user ? user.avatar : undefined}
            avatarFallback={user?.displayName?.[0]}
          />
        ))}
      </div>

      <FloatingButton onClick={focusComposer} />
    </nav>
  );
}

function NavButton({
  label,
  icon: Icon,
  current,
  onClick,
  avatar,
  avatarFallback,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  current: boolean;
  onClick: () => void;
  avatar?: string;
  avatarFallback?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      aria-label={label}
      className="grid min-w-14 place-items-center transition-colors duration-200 outline-none focus-visible:bg-hover-overlay active:scale-[0.96]"
    >
      {avatar ? (
        <Avatar className={cn("h-7 w-7", current && "ring-2 ring-brand ring-offset-2 ring-offset-background")}>
          <AvatarImage src={avatar} alt="" />
          <AvatarFallback>{avatarFallback || label[0]}</AvatarFallback>
        </Avatar>
      ) : (
        <Icon
          className={cn(
            "h-[26px] w-[26px] transition-colors duration-200",
            current ? "text-foreground" : "text-muted-foreground"
          )}
          strokeWidth={current ? 2.2 : 1.8}
        />
      )}
    </button>
  );
}
