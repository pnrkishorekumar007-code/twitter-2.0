"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  Bell,
  Mail,
  Bookmark,
  User,
  MoreHorizontal,
  Settings,
  LogOut,
  BadgeCheck,
  Languages,
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
import TwitterLogo from "../Twitterlogo";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useNotifications } from "@/context/NotificationContext";
import LanguageSwitcher from "../LanguageSwitcher";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const router = useRouter();

  const navigation = [
    { name: t("nav.home"), icon: Home, href: "/home", current: pathname === "/home" },
    { name: t("nav.explore"), icon: Search, href: "/explore", current: pathname === "/explore" },
    { name: t("nav.notifications"), icon: Bell, href: "/notifications", current: pathname === "/notifications", badge: unreadCount },
    { name: t("nav.messages"), icon: Mail, href: "/messages", current: pathname === "/messages" },
    { name: t("nav.bookmarks"), icon: Bookmark, href: "/bookmarks", current: pathname === "/bookmarks" },
    { name: t("nav.profile"), icon: User, href: "/profile", current: pathname === "/profile" },
    { name: t("nav.premium"), icon: BadgeCheck, href: "/subscribe", current: pathname === "/subscribe" },
  ];

  return (
    <div className="flex flex-col h-screen w-20 md:w-24 lg:w-64 border-r border-gray-800 bg-black sticky top-0">
      <div className="p-4 flex justify-center lg:justify-start">
        <Link href="/home" className="rounded-full hover:bg-gray-900 p-2">
          <TwitterLogo size="lg" className="text-white" />
        </Link>
      </div>

      <nav className="flex-1 px-2 lg:px-3 overflow-y-auto">
        <ul className="space-y-1 lg:space-y-2">
          {navigation.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`w-full flex items-center justify-center lg:justify-start text-xl py-3 lg:py-4 lg:px-4 rounded-full hover:bg-gray-900 ${
                  item.current ? "font-bold" : "font-normal"
                } text-white hover:text-white`}
              >
                <span className="relative">
                  <item.icon className="h-6 w-6 lg:h-7 lg:w-7 lg:mr-4" />
                  {(item.badge ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 lg:right-3 lg:-top-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="hidden lg:inline">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-4 lg:mt-8 px-0 lg:px-2">
          <Link
            href="/home"
            className="hidden lg:flex w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-full text-lg items-center justify-center"
          >
            {t("common.post")}
          </Link>
          <Link
            href="/home"
            className="lg:hidden flex w-12 h-12 mx-auto bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full items-center justify-center"
            aria-label={t("common.post")}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
              <path d="M23 3c-6.62-.1-10.38 2.421-13.05 6.03C7.29 12.61 6 17.331 6 22h2c0-1.007.07-2.012.19-3H12c4.1 0 7.48-3.082 7.94-7.054C22.79 10.147 23.17 6.359 23 3z" />
            </svg>
          </Link>
        </div>
      </nav>

      <div className="p-2 lg:p-4 border-t border-gray-800 space-y-2">
        <div className="flex justify-center lg:hidden">
          <LanguageSwitcher compact />
        </div>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-center lg:justify-start p-2 lg:p-3 rounded-full hover:bg-gray-900"
              >
                <Avatar className="h-10 w-10 lg:mr-3">
                  <AvatarImage src={user.avatar} alt={user.displayName} />
                  <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="hidden lg:block flex-1 text-left">
                  <div className="text-white font-semibold truncate">
                    {user.displayName}
                  </div>
                  <div className="text-gray-400 text-sm">@{user.username}</div>
                </div>
                <MoreHorizontal className="hidden lg:block h-5 w-5 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-black border-gray-800">
              <DropdownMenuItem
                className="text-white hover:bg-gray-900"
                onClick={() => router.push("/profile")}
              >
                <User className="mr-2 h-4 w-4" />
                {t("nav.profile")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-white hover:bg-gray-900"
                onClick={() => router.push("/subscribe")}
              >
                <BadgeCheck className="mr-2 h-4 w-4" />
                {t("nav.premium")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800" />
              <DropdownMenuItem
                className="text-white hover:bg-gray-900"
                onClick={() => router.push("/profile")}
              >
                <Settings className="mr-2 h-4 w-4" />
                {t("settings.title")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800" />
              <DropdownMenuItem
                className="text-white hover:bg-gray-900"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("common.logout")} @{user.username}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
