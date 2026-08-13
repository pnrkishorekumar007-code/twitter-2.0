"use client";
import { useAuth } from "@/context/AuthContext";
import React, { useState } from "react";
import LoadingSpinner from "../loading-spinner";
import Sidebar from "./Sidebar";
import RightSidebar from "./Rightsidebar";
import MobileBottomNav from "./MobileBottomNav";
import ProfilePage from "../ProfilePage";
import PricingPage from "../pricing/PricingPage";
import SettingsPage from "../SettingsPage";
import NotificationsPage from "../NotificationsPage";
import ExplorePage from "../ExplorePage";
import FollowRequestsPage from "../FollowRequestsPage";
import SearchPage from "../SearchPage";
import { TwillerBrand } from "../Twitterlogo";
import { useEffect } from "react";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { motion, AnimatePresence } from "@/lib/motion";

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

const Mainlayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<AppPage>("home");

  // Lets the right-sidebar "Subscribe" card jump straight to pricing.
  useEffect(() => {
    const handler = () => setCurrentPage("pricing");
    window.addEventListener("twiller:go-premium", handler);
    return () => window.removeEventListener("twiller:go-premium", handler);
  }, []);

  // Allows any card/gear to open the settings page.
  useEffect(() => {
    const handler = () => setCurrentPage("settings");
    window.addEventListener("twiller:go-settings", handler);
    return () => window.removeEventListener("twiller:go-settings", handler);
  }, []);

  // Lets the profile page open the follow requests inbox.
  useEffect(() => {
    const handler = () => setCurrentPage("follow-requests");
    window.addEventListener("twiller:go-follow-requests", handler);
    return () => window.removeEventListener("twiller:go-follow-requests", handler);
  }, []);

  // Generic "back to home" escape hatch used by nested views.
  useEffect(() => {
    const handler = () => setCurrentPage("home");
    window.addEventListener("twiller:go-back", handler);
    return () => window.removeEventListener("twiller:go-back", handler);
  }, []);

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <TwillerBrand className="justify-center" />
          <div className="flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  } else if (!user) {
    // If user is not logged in → show children (like login/signup pages)
    content = <>{children}</>;
  } else {
    let view: React.ReactNode;
    switch (currentPage) {
      case "profile":
        view = <ProfilePage />;
        break;
      case "pricing":
        view = <PricingPage />;
        break;
      case "settings":
        view = <SettingsPage />;
        break;
      case "notifications":
        view = <NotificationsPage />;
        break;
      case "explore":
        view = <ExplorePage />;
        break;
      case "follow-requests":
        view = <FollowRequestsPage />;
        break;
      case "search":
        view = <SearchPage />;
        break;
      default:
        view = children;
    }

    content = (
      <div className="min-h-screen bg-background text-foreground flex justify-center">
        <div className="hidden md:block w-[88px] lg:w-[280px] shrink-0 border-r border-border sticky top-0 h-screen overflow-y-auto">
          <Sidebar currentPage={currentPage} onNavigate={(page) => setCurrentPage(page as AppPage)} />
        </div>
        <main className="flex-1 max-w-[600px] border-x border-border pb-20 md:pb-0 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="min-h-screen"
            >
              {view}
            </motion.div>
          </AnimatePresence>
        </main>
        <div className="hidden lg:block w-[350px] shrink-0 p-4 max-w-[350px]">
          <RightSidebar />
        </div>
        <MobileBottomNav currentPage={currentPage} onNavigate={(page) => setCurrentPage(page as AppPage)} />
      </div>
    );
  }

  return <NotificationsProvider>{content}</NotificationsProvider>;
};

export default Mainlayout;
