"use client";

import React from "react";
import { Monitor, Smartphone, Laptop, Globe } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import NotificationSettingsCard from "./NotificationSettingsCard";
import LanguageSettingsCard from "./language/LanguageSettingsCard";
import type { LoginHistoryEntry } from "@/lib/types";

function deviceIcon(device: string) {
  if (device === "mobile") return <Smartphone className="h-5 w-5 text-brand" />;
  if (device === "laptop") return <Laptop className="h-5 w-5 text-brand" />;
  if (device === "tablet") return <Monitor className="h-5 w-5 text-brand" />;
  return <Globe className="h-5 w-5 text-muted-foreground" />;
}

export default function ProfileSettingsPanel() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const loginHistory = user?.loginHistory || [];

  return (
    <div className="p-4 space-y-6">
      {/* Keyword-based browser notifications */}
      <NotificationSettingsCard />

      {/* Multi-language with OTP verification */}
      <LanguageSettingsCard />

      {/* Login history */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <p className="text-foreground font-semibold mb-3">{t("login_history")}</p>
          {loginHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("profile_no_login_history")}</p>
          ) : (
            <div className="space-y-3">
              {loginHistory.map((entry: LoginHistoryEntry, idx: number) => (
                <div key={idx} className="flex items-center gap-3 border-b border-border pb-3 last:border-0">
                  {deviceIcon(entry.device ?? "")}
                  <div className="flex-1 text-sm">
                    <p className="text-foreground">
                      {entry.browser} on {entry.os} · <span className="capitalize">{entry.device}</span>
                    </p>
                    <p className="text-muted-foreground">
                      {entry.ip} · {entry.loggedInAt && new Date(entry.loggedInAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
