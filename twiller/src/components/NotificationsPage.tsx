"use client";

import React, { useEffect, useState } from "react";
import { BellRing, BellOff, Settings2, UserPlus, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useNotifications } from "@/context/NotificationsContext";
import { useLanguage } from "@/context/LanguageContext";
import { motion, fadeUp, staggerContainer } from "@/lib/motion";
import axiosInstance from "@/lib/axiosInstance";
import { getErrorMessage, type FollowNotification } from "@/lib/types";
import { useToast } from "./Toast";

function timeAgoShort(ts?: string) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString();
}

const followMessages: Record<string, string> = {
  follow: "started following you",
  follow_request: "sent you a follow request",
  request_accepted: "accepted your follow request",
};

const followSectionTitle = "Follow activity";

export default function NotificationsPage() {
  const { settings, permission } = useNotifications();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [followNotifications, setFollowNotifications] = useState<
    FollowNotification[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/users/notifications")
      .then((res) => {
        if (!cancelled)
          setFollowNotifications(
            Array.isArray(res.data) ? res.data : []
          );
      })
      .catch(() => {
        if (!cancelled) {
          setFollowNotifications([]);
          toast("Failed to load notifications", "error", getErrorMessage(new Error("Fetch failed")));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10"
            onClick={() => window.dispatchEvent(new CustomEvent("twiller:open-menu"))}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("notifications")}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Follows and keyword alerts about tweets you care about
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {followNotifications.length > 0 && (
          <section className="divide-y divide-border">
            <h2 className="px-4 py-2 text-sm font-semibold text-muted-foreground">
              {followSectionTitle}
            </h2>
            {followNotifications.map((n) => (
              <div
                key={n._id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/60 transition-colors"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/15">
                  <UserPlus className="h-4 w-4 text-brand" />
                </span>
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={n.actor.avatar} alt={n.actor.displayName} />
                  <AvatarFallback>
                    {n.actor.displayName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm">
                    <span className="font-bold">
                      {n.actor.displayName || "Unknown User"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {followMessages[n.type] || "started following you"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{n.actor.username || "unknown"} · {timeAgoShort(n.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}
        {settings.keywordNotifications ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="px-4 py-5 space-y-5"
          >
            <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/15">
                <BellRing className="h-5 w-5 text-brand" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-semibold text-sm">Keyword alerts are on</p>
                <p className="text-muted-foreground text-sm">
                  We&apos;ll pop a notification when a new tweet matches a keyword you track.
                </p>
              </div>
              <Badge variant="brand">{t("enabled")}</Badge>
            </motion.div>

            {settings.keywords.length > 0 && (
              <motion.div variants={fadeUp}>
                <p className="text-sm text-muted-foreground mb-2">{t("keywords_monitored")}</p>
                <div className="flex flex-wrap gap-2">
                  {settings.keywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="px-3 py-1 text-sm">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div variants={fadeUp} className="py-10 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted mb-3">
                <BellRing className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-foreground font-bold text-lg">You&apos;re all caught up</p>
              <p className="text-muted-foreground text-sm">
                When a keyword tweet lands here, it&apos;ll show up.
              </p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="px-4 py-10 text-center"
          >
            <motion.div
              variants={fadeUp}
              className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-muted mb-4"
            >
              <BellOff className="h-7 w-7 text-muted-foreground" />
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-foreground font-bold text-xl">
              Notifications are off
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
              {t("notif_desc")} Enable them from your settings.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-5">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => window.dispatchEvent(new CustomEvent("twiller:go-settings"))}
              >
                <Settings2 className="h-4 w-4" />
                Open notification settings
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>

      {permission === "denied" && (
        <div className="px-4 py-4 border-t border-border bg-destructive/10">
          <p className="text-sm text-destructive">
            {t("blocked_message")}
          </p>
        </div>
      )}
    </div>
  );
}
