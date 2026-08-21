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
  ];

  const focusComposer = () => {
    onNavigate?.("home");
    window.dispatchEvent(new CustomEvent("twiller:focus-composer"));
  };

  const renderNavButton = (item: NavItem) => {
    const button = (
      <button
        type="button"
        aria-current={item.current ? "page" : undefined}
        onClick={() => onNavigate?.(item.page)}
        className={cn(
          "group flex h-11 w-full items-center rounded-full p-3 transition-colors duration-[180ms] outline-none focus-visible:ring-2 focus-visible:ring-brand",
          forceExpanded ? "justify-start" : "justify-center lg:justify-start",
          item.current
            ? "bg-hover-overlay text-foreground"
            : "text-foreground hover:bg-hover-overlay"
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
              className="absolute -top-1 -right-1 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-background bg-brand px-[3px] text-[10px] font-bold leading-none text-white"
              aria-hidden="true"
            >
              •
            </span>
          )}
          {item.count != null && item.count > 0 && (
            <span className="absolute -top-1.5 -right-2 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-background bg-brand px-1 text-[11px] font-bold text-white">
              {item.count > 99 ? "99+" : item.count}
            </span>
          )}
        </span>
        <span
          className={cn(
            "ml-5 truncate text-xl leading-6",
            forceExpanded ? "inline" : "hidden lg:inline",
            item.current ? "font-bold" : "font-normal"
          )}
        >
          {item.name}
        </span>
      </button>
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

            {/* More — reveals People / Premium / Settings.
                NOTE: no Tooltip here — nesting Tooltip inside
                DropdownMenuTrigger(asChild) makes Radix attach its open
                handlers to the Tooltip root instead of the button, which
                silently breaks the menu. */}
            <li>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    className={cn(
                      "group flex h-11 w-full items-center rounded-full p-3 transition-colors duration-[180ms] outline-none focus-visible:ring-2 focus-visible:ring-brand",
                      forceExpanded ? "justify-start" : "justify-center lg:justify-start",
                      ["search", "pricing", "settings"].includes(currentPage)
                        ? "bg-hover-overlay text-foreground"
                        : "text-foreground hover:bg-hover-overlay"
                    )}
                  >
                    <span className="relative flex items-center">
                      <MoreHorizontal className="h-[26px] w-[26px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span
                      className={cn(
                        "ml-5 truncate text-xl leading-6",
                        forceExpanded ? "inline" : "hidden lg:inline"
                      )}
                    >
                      {t("more")}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-[300px] rounded-2xl border-border bg-popover p-2">
                  <DropdownMenuItem
                    className="rounded-full px-4 py-3 text-[15px]"
                    onClick={() => onNavigate?.("search")}
                  >
                    <Users className="mr-3 h-5 w-5" aria-hidden="true" />
                    {t("sidebar_people")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-full px-4 py-3 text-[15px]"
                    onClick={() => onNavigate?.("pricing")}
                  >
                    <Sparkles className="mr-3 h-5 w-5" aria-hidden="true" />
                    {t("premium")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    className="rounded-full px-4 py-3 text-[15px]"
                    onClick={() => onNavigate?.("settings")}
                  >
                    <Settings className="mr-3 h-5 w-5" aria-hidden="true" />
                    {t("settings")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          </ul>

          {/* Post button */}
          <div className={cn("mt-3 px-0.5", forceExpanded ? "" : "flex justify-center lg:block")}>
            <button
              type="button"
              onClick={focusComposer}
              className={cn(
                "grid h-[52px] place-items-center rounded-full bg-brand font-bold text-white transition-colors duration-[180ms] hover:bg-x-blue-hover outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]",
                forceExpanded
                  ? "w-full px-4"
                  : "w-[52px] lg:w-full lg:px-4"
              )}
            >
              <span className={forceExpanded ? "hidden" : "grid lg:hidden place-items-center"}>
                <Feather className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className={forceExpanded ? "text-[17px]" : "hidden lg:inline text-[17px]"}>
                {t("post")}
              </span>
            </button>
          </div>
        </nav>

        {/* Account chip */}
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
                    <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "min-w-0 flex-1",
                      forceExpanded ? "block" : "hidden lg:block"
                    )}
                  >
                    <span className="block truncate text-[15px] font-bold text-foreground">
                      {user.displayName}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
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
                  className="rounded-full px-4 py-3 text-[15px]"
                  onClick={() => onNavigate?.("settings")}
                >
                  <Settings className="mr-3 h-5 w-5" aria-hidden="true" />
                  {t("settings")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-full px-4 py-3 text-[15px]"
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
                  className="rounded-full px-4 py-3 text-[15px] font-bold"
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
