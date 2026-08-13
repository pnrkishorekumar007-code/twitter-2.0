"use client";

import React, { useState } from "react";
import { Bell, BellRing, BellOff } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { useNotifications } from "@/context/NotificationsContext";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export default function NotificationSettingsCard() {
  const {
    loading,
    saving,
    permission,
    settings,
    saveMessage,
    requestPermission,
    updateSettings,
  } = useNotifications();
  const { t } = useLanguage();

  const [enabled, setEnabled] = useState(settings.keywordNotifications);

  // Keep local toggle in sync if settings change from elsewhere.
  const [lastValue, setLastValue] = useState(settings.keywordNotifications);
  if (settings.keywordNotifications !== lastValue) {
    setLastValue(settings.keywordNotifications);
    setEnabled(settings.keywordNotifications);
  }

  const permissionMeta = {
    granted: {
      label: t("allowed"),
      classes: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
    },
    denied: {
      label: t("blocked"),
      classes: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40",
    },
    default: {
      label: t("not_requested"),
      classes: "bg-muted text-muted-foreground border-border",
    },
    unsupported: {
      label: t("unsupported"),
      classes: "bg-muted text-muted-foreground border-border",
    },
  }[permission];

  const save = async () => {
    const ok = await updateSettings(enabled);
    if (!ok) setEnabled(settings.keywordNotifications);
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-brand/15">
              <Bell className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-foreground font-semibold">{t("keyword_notif")}</p>
              <p className="text-muted-foreground text-sm">{t("notif_desc")}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 border", permissionMeta.classes)}
          >
            {permissionMeta.label}
          </Badge>
        </div>

        {/* Browser permission */}
        {permission === "default" && (
          <div className="rounded-xl border border-brand/30 bg-brand/10 p-4">
            <p className="text-foreground text-sm font-medium mb-2">
              {t("notif_desc")}
            </p>
            <Button
              onClick={requestPermission}
              variant="outline"
              className="rounded-full border-brand text-brand hover:bg-brand/10"
            >
              {t("enable_browser_notif")}
            </Button>
          </div>
        )}

        {permission === "denied" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-destructive text-sm">{t("blocked_message")}</p>
          </div>
        )}

        {/* Monitored keywords */}
        <div>
          <p className="text-foreground text-sm font-medium mb-2">{t("keywords_monitored")}</p>
          {settings.keywords.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("no_keywords")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {settings.keywords.map((kw) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="px-3 py-1 text-sm gap-1.5"
                >
                  <BellRing className="h-3.5 w-3.5 text-brand" />
                  {kw}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Toggle + save */}
        <div className="space-y-3">
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-3">
              {enabled ? (
                <Bell className="h-5 w-5 text-brand" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-foreground">{enabled ? t("enabled") : t("disabled")}</span>
            </span>
            <Switch checked={enabled} onCheckedChange={(v) => setEnabled(v)} />
          </div>

          <Button
            onClick={save}
            disabled={saving || loading}
            className="w-full rounded-full"
            variant={enabled ? "brand" : "outline"}
          >
            {saving ? t("saving") : t("save")}
          </Button>

          {saveMessage && (
            <p
              className={cn(
                "text-sm",
                saveMessage.startsWith("Couldn't")
                  ? "text-red-500"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {saveMessage}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
