"use client";
import { useAuth } from "@/context/AuthContext";
import React, { useCallback, useEffect, useState } from "react";
import LoadingSpinner from "../loading-spinner";
import Sidebar from "./Sidebar";
import RightSidebar from "./Rightsidebar";
import MobileBottomNav from "./MobileBottomNav";
import MobileDrawer from "./MobileDrawer";
import { TwillerBrand } from "../Twitterlogo";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { BookmarksProvider } from "@/context/BookmarksContext";
import { MessagesProvider } from "@/context/MessagesContext";
import { motion, AnimatePresence } from "@/lib/motion";
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

// Every sidebar destination maps to a real URL. Page ids stay in sync with
// the `page` values used by Sidebar / MobileBottomNav / MobileDrawer.
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

// Reverse: current URL → active page id (drives the sidebar highlight).
function pageFromPathname(pathname: string): AppPage {
  const segment = (pathname || "").split("/")[1] || "";
  switch (segment) {
    case "home":
      return "home";
    case "explore":
      return "explore";
    case "people":
      return "search";
    case "notifications":
      return "notifications";
    case "messages":
      return "messages";
    case "bookmarks":
      return "bookmarks";
    case "profile":
      return "profile";
    case "premium":
      return "pricing";
    case "settings":
      return "settings";
    case "follow-requests":
      return "follow-requests";
    default:
      return "home";
  }
}

const Mainlayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentPage = pageFromPathname(pathname);

  // Navigate by pushing the real route for the given page id.
  const navigate = useCallback(
    (page: string) => {
      const path = PAGE_PATH[page as AppPage];
      router.push(path || "/home");
    },
    [router]
  );

  // Authentication guard — signed-out visitors are sent to the landing page.
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  // Custom event navigation (kept for components that dispatch these events):
  // twiller:go-premium / go-search / go-profile / go-settings /
  // go-follow-requests / go-back / open-menu.
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
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <TwillerBrand className="justify-center" />
          <div className="flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null; // guard effect above redirects to "/"

  return (
    <BookmarksProvider>
      <MessagesProvider>
        <NotificationsProvider>
          <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-full focus:bg-brand focus:px-5 focus:py-2.5 focus:text-white focus:shadow-lg"
      >
        Skip to content
      </a>

      <div className="mx-auto flex w-full max-w-[1265px] justify-center">
        {/* Left rail — icons-only on tablet (md→lg, 88px), full sidebar with
            labels from laptop+ (lg, 260px). Hidden on mobile (<768px). */}
        <aside className="hidden md:flex md:w-[88px] lg:w-[260px] shrink-0 sticky top-0 h-dvh border-r border-border/60">
          <Sidebar currentPage={currentPage} onNavigate={navigate} />
        </aside>

        {/* Center column — the active route's page (≤600px, flexes to fill,
            always centered). */}
        <main
          id="main-content"
          className="flex-1 min-w-0 max-w-[600px] border-x border-border/60 pb-16 md:pb-0"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="min-h-dvh"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Right rail — trends / suggestions. Sticky, fixed 350px, hidden
            only on mobile (<768px). */}
        <aside className="hidden md:block w-[350px] shrink-0">
          <div className="sticky top-0 h-dvh overflow-y-auto no-scrollbar p-4">
            <RightSidebar />
          </div>
        </aside>
      </div>

      <MobileBottomNav
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
  );
};

export default Mainlayout;
