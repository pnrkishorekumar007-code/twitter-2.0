"use client";

import React, { useEffect, useState } from "react";
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
  Crown,
  ExternalLink,
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
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "./Toast";
import axiosInstance from "@/lib/axiosInstance";
import { getErrorMessage } from "@/lib/types";

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
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { toast } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [section, setSection] = useState("account");
  const [savingAccountType, setSavingAccountType] = useState(false);
  const [subHistory, setSubHistory] = useState<
    { planName: string; amount: number; status: string; invoiceNumber: string | null; startDate: string | null; endDate: string | null; createdAt: string }[]
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (section !== "subscription") return;
    let cancelled = false;
    (async () => {
      setLoadingHistory(true);
      try {
        const res = await axiosInstance.get("/payment/history");
        if (!cancelled) setSubHistory(res.data.subscriptions || []);
      } catch {
        if (!cancelled) toast("Failed to load payment history", "error");
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
  }, [section, toast]);

  if (!user) return null;

  const setAccountType = async (accountType: "public" | "private") => {
    if (savingAccountType || accountType === user.accountType) return;
    setSavingAccountType(true);
    try {
      await axiosInstance.patch("/profile/update", { accountType });
      await refreshUser();
      toast(
        accountType === "private"
          ? t("settings_account_now_private")
          : t("settings_account_now_public"),
        "success"
      );
    } catch (error) {
      toast(getErrorMessage(error), "error");
    } finally {
      setSavingAccountType(false);
    }
  };

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-20 bg-background border-b border-border">
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
            <SectionNav value="account" icon={User} label={t("settings_account")} />
            <SectionNav value="subscription" icon={Crown} label={t("settings_subscription")} />
            <SectionNav value="appearance" icon={Palette} label={t("settings_appearance")} />
            <SectionNav value="language" icon={Globe} label={t("language")} />
            <SectionNav value="notifications" icon={Bell} label={t("notif_pref")} />
            <SectionNav value="security" icon={ShieldCheck} label={t("settings_security")} />
          </TabsList>

          <TabsContent value="account" className="mt-0">
            <div className="rounded-2xl border border-border bg-card p-5">
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
                  {t("settings_edit_profile")}
                </Button>
              </div>
              {user.bio && <p className="mt-4 text-foreground text-sm">{user.bio}</p>}
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/15">
                  <Lock className="h-5 w-5 text-brand" />
                </span>
                <div>
                  <p className="text-foreground font-semibold">{t("settings_account_privacy")}</p>
                  <p className="text-muted-foreground text-sm">
                    {t("settings_private_desc")}
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
                  <p className="font-semibold text-foreground text-sm">{t("settings_public")}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {t("settings_public_desc")}
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
                  <p className="font-semibold text-foreground text-sm">{t("settings_private")}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {t("settings_private_approval")}
                  </p>
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="subscription" className="mt-0">
            {/* Current plan card */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/15">
                  <Crown className="h-5 w-5 text-brand" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-semibold">{t("settings_current_plan")}</p>
                  <p className="text-muted-foreground text-sm">
                    {user.subscriptionPlan === "GOLD" ? "Gold" : user.subscriptionPlan === "SILVER" ? "Silver" : user.subscriptionPlan === "BRONZE" ? "Bronze" : "Free"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-accent/50 px-4 py-3">
                  <p className="text-xs text-muted-foreground">{t("settings_tweets_used")}</p>
                  <p className="text-lg font-bold text-foreground">
                    {user.subscriptionPlan === "GOLD" ? "∞" : `${user.tweetsUsed ?? 0} / ${user.tweetLimit ?? 1}`}
                  </p>
                </div>
                <div className="rounded-xl bg-accent/50 px-4 py-3">
                  <p className="text-xs text-muted-foreground">{t("settings_expires")}</p>
                  <p className="text-lg font-bold text-foreground">
                    {user.subscriptionEndDate
                      ? new Date(user.subscriptionEndDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="rounded-full mt-4 w-full"
                onClick={() => router.push("/premium")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("settings_manage_plan")}
              </Button>
            </div>

            {/* Invoice history */}
            <div className="mt-5 rounded-2xl border border-border bg-card p-5">
              <p className="text-foreground font-semibold mb-3">{t("settings_invoice_history")}</p>
              {loadingHistory ? (
                <p className="text-muted-foreground text-sm">{t("settings_loading")}</p>
              ) : subHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("settings_no_invoices")}</p>
              ) : (
                <div className="space-y-3">
                  {subHistory.map((sub, i) => (
                    <div
                      key={sub.invoiceNumber || i}
                      className="flex items-center justify-between rounded-xl bg-accent/50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-foreground text-sm font-medium">
                          {sub.planName === "GOLD" ? "Gold" : sub.planName === "SILVER" ? "Silver" : sub.planName === "BRONZE" ? "Bronze" : "Free"}
                          <span className="ml-2 text-muted-foreground font-normal">₹{sub.amount}</span>
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {sub.startDate
                            ? new Date(sub.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                            : new Date(sub.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium rounded-full px-2.5 py-0.5",
                          sub.status === "ACTIVE"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : sub.status === "FAILED"
                            ? "bg-red-500/15 text-red-600"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {sub.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="mt-0">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div>
                <p className="text-foreground font-semibold">{t("settings_appearance_title")}</p>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {t("settings_appearance_desc")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["light", "dark"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={theme === mode}
                    onClick={() => setTheme(mode)}
                    className={cn(
                      "rounded-2xl border-2 p-4 text-left transition-colors",
                      theme === mode
                        ? "border-brand bg-brand/5"
                        : "border-border hover:bg-hover-overlay"
                    )}
                  >
                    <div
                      className={cn(
                        "h-16 rounded-lg border border-border mb-3",
                        mode === "dark" ? "bg-black" : "bg-white"
                      )}
                    />
                    <p className="font-semibold text-foreground text-sm">
                      {mode === "dark" ? t("settings_dark") : t("settings_light")}
                    </p>
                  </button>
                ))}
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
