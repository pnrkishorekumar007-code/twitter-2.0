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
  Crown,
  Feather,
  MoreHorizontal,
  Users,
  Sun,
  Moon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
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
import { useTheme } from "@/context/ThemeContext";
import { useMessages } from "@/context/MessagesContext";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface SidebarProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
  /** Render the full-width (labels visible) variant — used inside the mobile drawer. */
  forceExpanded?: boolean;
  className?: string;
}

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface NavItem {
  name: string;
  icon: IconType;
  current: boolean;
  page: string;
  badge?: boolean;
  count?: number;
}

/**
 * LeftSidebar — fixed navigation rail matching the official X client.
 * Collapses to an icon-only rail below `lg`; every row is a 44px pill with
 * a 180ms hover fade.
 */
export default function Sidebar({
  currentPage = "home",
  onNavigate,
  forceExpanded = false,
  className,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { unreadTotal } = useMessages();

  const navigation: NavItem[] = [
    { name: t("home"), icon: Home, current: currentPage === "home", page: "home" },
    { name: t("explore"), icon: Search, current: currentPage === "explore", page: "explore" },
    { name: t("notifications"), icon: Bell, current: currentPage === "notifications", page: "notifications", badge: true },
    { name: t("messages"), icon: Mail, current: currentPage === "messages", page: "messages", count: unreadTotal },
    { name: t("bookmarks"), icon: Bookmark, current: currentPage === "bookmarks", page: "bookmarks" },
    { name: t("profile"), icon: User, current: currentPage === "profile", page: "profile" },
    { name: t("sidebar_people"), icon: Users, current: currentPage === "search", page: "search" },
    { name: t("premium"), icon: Crown, current: currentPage === "pricing", page: "pricing" },
    { name: t("settings"), icon: Settings, current: currentPage === "settings", page: "settings" },
  ];

  const focusComposer = () => {
    onNavigate?.("home");
    window.dispatchEvent(new CustomEvent("twiller:focus-composer"));
  };

  const renderNavButton = (item: NavItem) => {
    const button = (
      <Button
        variant="nav-row"
        aria-current={item.current ? "page" : undefined}
        onClick={() => onNavigate?.(item.page)}
        className={cn(
          forceExpanded ? "" : "justify-center lg:justify-start",
          item.current ? "bg-hover-overlay" : ""
        )}
      >
        <span className="relative flex items-center justify-start">
          <item.icon
            className="h-[26px] w-[26px] shrink-0"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          {item.badge && (
            <span
              className="absolute -top-1 -right-1 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-background bg-brand px-[3px] text-xs font-bold leading-none text-white"
              aria-hidden="true"
            >
              •
            </span>
          )}
          {item.count != null && item.count > 0 && (
            <span               className="absolute -top-1.5 -right-2 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-background bg-brand px-1 text-xs font-bold text-white">
              {item.count > 99 ? "99+" : item.count}
            </span>
          )}
        </span>
        <span
          className={cn(
            "ml-5 truncate text-xl leading-6",
            forceExpanded ? "inline" : "hidden lg:inline",
            item.current ? "!font-bold" : "font-normal"
          )}
        >
          {item.name}
        </span>
      </Button>
    );

    if (forceExpanded) return button;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" className="lg:hidden">
          {item.name}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex h-full w-full flex-col bg-background", className)}>
        {/* Brand */}
        <div
          className={cn(
            "flex px-2 py-1",
            forceExpanded ? "justify-start" : "justify-center lg:justify-start"
          )}
        >
          <button
            type="button"
            aria-label={t("sidebar_home")}
            className="grid h-11 w-11 place-items-center rounded-full transition-colors duration-[180ms] hover:bg-hover-overlay outline-none focus-visible:ring-2 focus-visible:ring-brand lg:w-auto lg:justify-start lg:px-3"
            onClick={() => onNavigate?.("home")}
          >
            <TwillerBrand
              wordmarkClassName={forceExpanded ? "inline" : "hidden lg:inline"}
              className="justify-center lg:justify-start"
            />
          </button>
        </div>

        {/* Primary navigation */}
        <nav
          className="flex-1 overflow-y-auto px-2 py-1 no-scrollbar"
          aria-label={t("sidebar_primary")}
        >
          <ul className="space-y-0.5">
            {navigation.map((item) => (
              <li key={item.page}>{renderNavButton(item)}</li>
            ))}
          </ul>
        </nav>

        {/* Post button — pinned above profile */}
        <div className={cn("px-2 py-2", forceExpanded ? "" : "flex justify-center lg:block")}>
          <Button
            size="xl"
            className={cn(
              forceExpanded
                ? "w-full px-4"
                : "w-[52px] lg:w-full lg:px-4"
            )}
            onClick={focusComposer}
          >
            <span className={forceExpanded ? "hidden" : "grid lg:hidden place-items-center"}>
              <Feather className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className={forceExpanded ? "text-base" : "hidden lg:inline text-base"}>
              {t("post")}
            </span>
          </Button>
        </div>

        {/* Account chip — always at the very bottom */}
        <div className="p-2">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-full p-2 text-left transition-colors duration-[180ms] hover:bg-hover-overlay outline-none focus-visible:ring-2 focus-visible:ring-brand",
                    forceExpanded ? "" : "justify-center lg:justify-start"
                  )}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user.avatar} alt={user.displayName} />
                    <AvatarFallback>{user.displayName?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "min-w-0 flex-1",
                      forceExpanded ? "block" : "hidden lg:block"
                    )}
                  >
                    <span className="block truncate text-sm font-bold text-foreground">
                      {user.displayName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      @{user.username}
                    </span>
                  </span>
                  <MoreHorizontal
                    className={cn(
                      "h-5 w-5 shrink-0 text-foreground",
                      forceExpanded ? "block" : "hidden lg:block"
                    )}
                    aria-hidden="true"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-[300px] rounded-2xl border-border bg-popover p-2">
                <DropdownMenuItem
                  className="rounded-full px-4 py-3 text-sm"
                  onClick={() => onNavigate?.("settings")}
                >
                  <Settings className="mr-3 h-5 w-5" aria-hidden="true" />
                  {t("settings")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-full px-4 py-3 text-sm"
                  onClick={toggleTheme}
                >
                  {theme === "dark" ? (
                    <Sun className="mr-3 h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Moon className="mr-3 h-5 w-5" aria-hidden="true" />
                  )}
                  {theme === "dark" ? t("settings_light") : t("settings_dark")}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  variant="destructive"
                  className="rounded-full px-4 py-3 text-sm font-bold"
                  onClick={logout}
                >
                  <LogOut className="mr-3 h-5 w-5" aria-hidden="true" />
                  {t("logout")} @{user.username}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
