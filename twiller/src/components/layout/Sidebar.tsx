"use client";

import React from "react";
import {
  Home,
  Search,
  Bell,
  Mail,
  Bookmark,
  User,
  Settings,
  LogOut,
  Sparkles,
  PenSquare,
  MoreHorizontal,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { TwillerBrand } from "../Twitterlogo";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import ThemeToggle from "../ThemeToggle";
import { motion } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  current: boolean;
  page: string;
  badge?: boolean;
}

export default function Sidebar({ currentPage = "home", onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const navigation: NavItem[] = [
    { name: t("home"), icon: Home, current: currentPage === "home", page: "home" },
    { name: t("explore"), icon: Search, current: currentPage === "explore", page: "explore" },
    { name: "People", icon: Users, current: currentPage === "search", page: "search" },
    { name: t("notifications"), icon: Bell, current: currentPage === "notifications", page: "notifications", badge: true },
    { name: t("messages"), icon: Mail, current: currentPage === "messages", page: "messages" },
    { name: t("bookmarks"), icon: Bookmark, current: currentPage === "bookmarks", page: "bookmarks" },
    { name: t("profile"), icon: User, current: currentPage === "profile", page: "profile" },
    { name: t("premium"), icon: Sparkles, current: currentPage === "pricing", page: "pricing" },
    { name: t("settings"), icon: Settings, current: currentPage === "settings", page: "settings" },
  ];

  const focusComposer = () => {
    onNavigate?.("home");
    window.dispatchEvent(new CustomEvent("twiller:focus-composer"));
  };

  const renderNavButton = (item: NavItem) => {
    const button = (
      <Button
        variant="ghost"
        aria-current={item.current ? "page" : undefined}
        className={cn(
          "group relative w-full justify-start text-xl py-3 px-3 lg:px-4 rounded-full transition-all duration-200",
          item.current
            ? "bg-brand/10 text-foreground shadow-[0_0_12px_rgba(29,155,240,0.15)]"
            : "text-foreground hover:bg-accent/70"
        )}
        onClick={() => onNavigate?.(item.page)}
      >
        <span className="relative flex items-center justify-center lg:justify-start">
          <item.icon
            className={cn(
              "h-6 w-6 shrink-0 transition-transform duration-200 group-hover:scale-110",
              item.current ? "text-foreground" : "text-foreground"
            )}
          />
          {item.badge && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
            </span>
          )}
        </span>
        <span
          className={cn(
            "ml-4 hidden lg:inline truncate",
            item.current && "font-bold"
          )}
        >
          {item.name}
        </span>
      </Button>
    );

    if (item.page === "messages" || item.page === "bookmarks") return button;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" className="lg:hidden">{item.name}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-screen w-full border-r border-white/[0.06] bg-background/95 backdrop-blur-xl">
        <div className="px-3 lg:px-4 py-3 flex justify-center lg:justify-start">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Twiller home"
            className="rounded-full p-2 -m-2 transition-colors hover:bg-accent"
            onClick={() => onNavigate?.("home")}
          >
            <TwillerBrand
              wordmarkClassName="hidden lg:inline"
              className="justify-center"
            />
          </motion.button>
        </div>

        <nav className="flex-1 px-2 lg:px-2 overflow-y-auto py-1" aria-label="Primary">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.page} className="flex justify-center lg:justify-start">
                {renderNavButton(item)}
              </li>
            ))}
          </ul>

          <div className="mt-4 px-1 lg:px-2 flex justify-center lg:justify-start">
            <Button
              onClick={focusComposer}
              className="w-full bg-brand-gradient animate-gradient text-white font-bold py-3 rounded-full text-lg shadow-lg shadow-brand/30 hover:brightness-110 transition-all"
            >
              <span className="grid lg:hidden place-items-center">
                <PenSquare className="h-6 w-6" />
              </span>
              <span className="hidden lg:inline">
                <span className="inline-flex items-center gap-2">
                  <PenSquare className="h-5 w-5" />
                  {t("post")}
                </span>
              </span>
            </Button>
          </div>
        </nav>

        <div className="p-2 lg:p-3 border-t border-white/[0.06] space-y-1">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-2 lg:p-3 rounded-full hover:bg-accent"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user.avatar} alt={user.displayName} />
                    <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-left min-w-0 hidden lg:block">
                    <span className="block text-foreground font-semibold truncate">
                      {user.displayName}
                    </span>
                    <span className="block text-muted-foreground text-sm truncate">
                      @{user.username}
                    </span>
                  </span>
                  <MoreHorizontal className="h-5 w-5 text-muted-foreground shrink-0 hidden lg:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-2xl p-1.5">
                <DropdownMenuItem
                  className="rounded-xl py-2.5"
                  onClick={() => onNavigate?.("settings")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  {t("settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  className="rounded-xl py-2.5"
                  onClick={() => onNavigate?.("pricing")}
                >
                  <Sparkles className="mr-2 h-4 w-4 text-brand" />
                  {t("premium")}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  variant="destructive"
                  className="rounded-xl py-2.5"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("logout")} @{user.username}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <div className="hidden lg:flex justify-end px-2 pt-1">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
