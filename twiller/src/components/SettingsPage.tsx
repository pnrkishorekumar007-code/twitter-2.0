"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  User,
  Palette,
  Globe,
  Bell,
  ShieldCheck,
  BadgeCheck,
  Lock,
  Users,
  Menu,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import Editprofile from "./Editprofile";
import NotificationSettingsCard from "./NotificationSettingsCard";
import LanguageSettingsCard from "./language/LanguageSettingsCard";
import LoginHistorySection from "./LoginHistorySection";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "./Toast";
import axiosInstance from "@/lib/axiosInstance";
import { getErrorMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

function SectionNav({
  value,
  icon: Icon,
  label,
}: {
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className="flex-none items-center gap-3 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:shadow-none bg-background"
    >
      <Icon className="h-4 w-4" />
      {label}
    </TabsTrigger>
  );
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [section, setSection] = useState("account");
  const [savingAccountType, setSavingAccountType] = useState(false);

  if (!user) return null;

  const setAccountType = async (accountType: "public" | "private") => {
    if (savingAccountType || accountType === user.accountType) return;
    setSavingAccountType(true);
    try {
      await axiosInstance.patch("/profile/update", { accountType });
      await refreshUser();
      toast(
        accountType === "private"
          ? "Account is now private"
          : "Account is now public",
        "success"
      );
    } catch (error) {
      toast(getErrorMessage(error), "error");
    } finally {
      setSavingAccountType(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-2xl border-b border-border shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
        <div className="px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full md:hidden"
            aria-label="Open menu"
            onClick={() => window.dispatchEvent(new CustomEvent("twiller:open-menu"))}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Go back"
            onClick={() => window.dispatchEvent(new CustomEvent("twiller:go-back"))}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">{t("settings_title")}</h1>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <Tabs value={section} onValueChange={setSection} className="mt-4">
          <TabsList className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 w-full h-auto rounded-none bg-transparent p-0 justify-start">
            <SectionNav value="account" icon={User} label="Account" />
            <SectionNav value="appearance" icon={Palette} label="Appearance" />
            <SectionNav value="language" icon={Globe} label={t("language")} />
            <SectionNav value="notifications" icon={Bell} label={t("notif_pref")} />
            <SectionNav value="security" icon={ShieldCheck} label="Security" />
          </TabsList>

          <TabsContent value="account" className="mt-0">
            <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-5 shadow-lg">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarImage src={user.avatar} alt={user.displayName} />
                  <AvatarFallback className="text-2xl">{user.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-foreground flex items-center gap-1.5">
                    {user.displayName}
                    {user.verified && <BadgeCheck className="h-5 w-5 text-brand shrink-0" />}
                  </p>
                  <p className="text-muted-foreground truncate">@{user.username}</p>
                  <p className="text-muted-foreground text-sm truncate">{user.email}</p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-full shrink-0"
                  onClick={() => setShowEditModal(true)}
                >
                  Edit profile
                </Button>
              </div>
              {user.bio && <p className="mt-4 text-foreground text-sm">{user.bio}</p>}
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-5 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/15">
                  <Lock className="h-5 w-5 text-brand" />
                </span>
                <div>
                  <p className="text-foreground font-semibold">Account privacy</p>
                  <p className="text-muted-foreground text-sm">
                    Private accounts must approve who follows them.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setAccountType("public")}
                  disabled={savingAccountType}
                  aria-pressed={user.accountType === "public"}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-left transition-all",
                    user.accountType === "public"
                      ? "border-brand bg-brand/5"
                      : "border-border hover:border-brand/40"
                  )}
                >
                  <Users className="h-5 w-5 mb-2 text-muted-foreground" />
                  <p className="font-semibold text-foreground text-sm">Public</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Anyone can follow you instantly.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("private")}
                  disabled={savingAccountType}
                  aria-pressed={user.accountType === "private"}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-left transition-all",
                    user.accountType === "private"
                      ? "border-brand bg-brand/5"
                      : "border-border hover:border-brand/40"
                  )}
                >
                  <Lock className="h-5 w-5 mb-2 text-muted-foreground" />
                  <p className="font-semibold text-foreground text-sm">Private</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Followers need your approval.
                  </p>
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="mt-0">
            <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-5 shadow-lg space-y-4">
              <div>
                <p className="text-foreground font-semibold">Appearance</p>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Choose how Twiller looks to you.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => theme !== "light" && toggleTheme()}
                  aria-pressed={theme === "light"}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-left transition-all",
                    theme === "light"
                      ? "border-brand bg-brand/5"
                      : "border-border hover:border-brand/40"
                  )}
                >
                  <div className="h-16 rounded-lg border border-border bg-white mb-3" />
                  <p className="font-semibold text-foreground text-sm">Light</p>
                </button>
                <button
                  type="button"
                  onClick={() => theme !== "dark" && toggleTheme()}
                  aria-pressed={theme === "dark"}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-left transition-all",
                    theme === "dark"
                      ? "border-brand bg-brand/5"
                      : "border-border hover:border-brand/40"
                  )}
                >
                  <div className="h-16 rounded-lg border border-border bg-black mb-3" />
                  <p className="font-semibold text-foreground text-sm">Dark</p>
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="language" className="mt-0">
            <LanguageSettingsCard />
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <NotificationSettingsCard />
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <LoginHistorySection />
          </TabsContent>
        </Tabs>
      </div>

      <Editprofile isopen={showEditModal} onclose={() => setShowEditModal(false)} />
    </div>
  );
}
