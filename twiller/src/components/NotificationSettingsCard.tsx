"use client";

import React, { useState } from "react";
import { Bell, BellRing, BellOff, Plus, X } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
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
  const [keywords, setKeywords] = useState<string[]>(settings.keywords || []);
  const [input, setInput] = useState("");

  // Keep local state in sync if settings change from elsewhere (e.g. user swap).
  const [lastEnabled, setLastEnabled] = useState(settings.keywordNotifications);
  const [lastKeywords, setLastKeywords] = useState(settings.keywords || []);
  if (settings.keywordNotifications !== lastEnabled) {
    setLastEnabled(settings.keywordNotifications);
    setEnabled(settings.keywordNotifications);
  }
  const joined = (settings.keywords || []).join("\u0000");
  const joinedLast = (lastKeywords || []).join("\u0000");
  if (joined !== joinedLast) {
    setLastKeywords(settings.keywords || []);
    setKeywords(settings.keywords || []);
  }

  const addKeyword = () => {
    const value = input.trim();
    if (!value) return;
    const exists = keywords.some(
      (kw) => kw.toLowerCase() === value.toLowerCase()
    );
    if (exists) {
      setInput("");
      return;
    }
    setKeywords((prev) => [...prev, value]);
    setInput("");
  };

  const removeKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

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
    // Enabling keyword notifications is only meaningful if the browser can
    // actually show popups. Prompt for permission before persisting; if it
    // can't be granted, revert the toggle instead of silently reporting success.
    if (enabled && permission !== "granted") {
      if (permission === "denied" || permission === "unsupported") {
        setEnabled(false);
        return;
      }
      const result = await requestPermission();
      if (result !== "granted") {
        setEnabled(false);
        return;
      }
    }
    const ok = await updateSettings(enabled, keywords);
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

          {/* Add keyword */}
          <div className="flex items-center gap-2 mb-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("enter_keyword")}
              className="flex-1 rounded-full"
              maxLength={50}
            />
            <Button
              onClick={addKeyword}
              disabled={!input.trim()}
              className="rounded-full shrink-0"
              variant="brand"
            >
              <Plus className="h-4 w-4" />
              {t("add")}
            </Button>
          </div>

          {keywords.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("no_keywords")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="px-3 py-1 text-sm gap-1.5"
                >
                  <BellRing className="h-3.5 w-3.5 text-brand" />
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    aria-label={`Remove ${kw}`}
                    className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
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
