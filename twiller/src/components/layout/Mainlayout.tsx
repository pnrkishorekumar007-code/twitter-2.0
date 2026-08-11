"use client";
import { useAuth } from "@/context/AuthContext";
import React, { useState } from "react";
import LoadingSpinner from "../loading-spinner";
import Sidebar from "./Sidebar";
import RightSidebar from "./Rightsidebar";
import MobileBottomNav from "./MobileBottomNav";
import ProfilePage from "../ProfilePage";
import PricingPage from "../pricing/PricingPage";
import { TwillerBrand } from "../Twitterlogo";

const Mainlayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState("home");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <TwillerBrand className="justify-center" />
          <div className="flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  // If user is not logged in → show children (like login/signup pages)
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center">
      <div className="hidden md:block w-20 lg:w-64 shrink-0 border-r border-border">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      </div>
      <main className="flex-1 max-w-2xl border-x border-border pb-20 md:pb-0">
        {currentPage === "profile" ? (
          <ProfilePage />
        ) : currentPage === "pricing" ? (
          <PricingPage />
        ) : (
          children
        )}
      </main>
      <div className="hidden lg:block w-80 shrink-0 p-4">
        <RightSidebar />
      </div>
      <MobileBottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
};

export default Mainlayout;
