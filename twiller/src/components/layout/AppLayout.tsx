"use client";
import { useAuth } from "@/context/AuthContext";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import LoadingSpinner from "../loading-spinner";
import Sidebar from "./Sidebar";
import RightSidebar from "./Rightsidebar";
import MobileNav from "./MobileNav";
import MobileDrawer from "./MobileDrawer";
import { TwillerBrand } from "../Twitterlogo";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { BookmarksProvider } from "@/context/BookmarksContext";
import { MessagesProvider } from "@/context/MessagesContext";
import { MotionConfig } from "@/lib/motion";
import { usePathname, useRouter } from "next/navigation";

export type AppPage =
  | "home"
  | "explore"
  | "notifications"
  | "messages"
  | "bookmarks"
  | "profile"
  | "pricing"
  | "settings"
  | "follow-requests"
  | "search"
  | "more";

const PAGE_PATH: Record<AppPage, string> = {
  home: "/home",
  explore: "/explore",
  notifications: "/notifications",
  messages: "/messages",
  bookmarks: "/bookmarks",
  profile: "/profile",
  pricing: "/premium",
  settings: "/settings",
  "follow-requests": "/follow-requests",
  search: "/people",
  more: "/home",
};

function pageFromPathname(pathname: string): AppPage {
  const segment = (pathname || "").split("/")[1] || "";
  switch (segment) {
    case "home": return "home";
    case "explore": return "explore";
    case "people": return "search";
    case "notifications": return "notifications";
    case "messages": return "messages";
    case "bookmarks": return "bookmarks";
    case "profile": return "profile";
    case "premium": return "pricing";
    case "settings": return "settings";
    case "follow-requests": return "follow-requests";
    default: return "home";
  }
}

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentPage = useMemo(() => pageFromPathname(pathname), [pathname]);

  const navigate = useCallback(
    (page: string) => {
      const path = PAGE_PATH[page as AppPage];
      router.push(path || "/home");
    },
    [router]
  );

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    const handlers: Record<string, () => void> = {
      "twiller:go-premium": () => navigate("pricing"),
      "twiller:go-search": () => navigate("search"),
      "twiller:go-profile": () => navigate("profile"),
      "twiller:go-settings": () => navigate("settings"),
      "twiller:go-follow-requests": () => navigate("follow-requests"),
      "twiller:go-back": () => router.push("/home"),
      "twiller:open-menu": () => setDrawerOpen(true),
    };
    const onEvent = (e: Event) => handlers[(e as CustomEvent).type]?.();
    const names = Object.keys(handlers);
    names.forEach((name) => window.addEventListener(name, onEvent));
    return () => names.forEach((name) => window.removeEventListener(name, onEvent));
  }, [navigate, router]);

  if (isLoading) {
    return (
      <div className="grid min-h-dvh w-full place-items-center bg-background">
        <div className="text-center space-y-4">
          <TwillerBrand className="justify-center" />
          <div className="flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <MotionConfig reducedMotion="user">
      <BookmarksProvider>
        <MessagesProvider>
          <NotificationsProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-full focus:bg-brand focus:px-5 focus:py-2.5 focus:text-white"
            >
              Skip to content
            </a>

            <div className="mx-auto grid w-full max-w-[1600px] min-h-dvh grid-cols-1 sm:grid-cols-[80px_minmax(0,1fr)] lg:grid-cols-[275px_minmax(600px,1fr)] min-[1226px]:grid-cols-[275px_minmax(600px,1fr)_350px]">
              <aside className="hidden sm:sticky sm:top-0 sm:h-dvh sm:flex sm:flex-col lg:w-auto z-30 bg-background">
                <Sidebar currentPage={currentPage} onNavigate={navigate} />
              </aside>

              <main
                id="main-content"
                className="min-w-0 w-full sm:border-x border-border pb-16 md:pb-0"
              >
                {children}
              </main>

              <aside className="hidden min-[1226px]:block min-[1226px]:sticky min-[1226px]:top-0 min-[1226px]:h-dvh overflow-y-auto no-scrollbar z-30 bg-background">
                <div className="px-8 py-1">
                  <RightSidebar />
                </div>
              </aside>
            </div>

            <MobileNav
              currentPage={currentPage}
              onNavigate={navigate}
              onOpenMenu={() => setDrawerOpen(true)}
            />
            <MobileDrawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              currentPage={currentPage}
              onNavigate={navigate}
            />
          </NotificationsProvider>
        </MessagesProvider>
      </BookmarksProvider>
    </MotionConfig>
  );
};

export default React.memo(AppLayout);
