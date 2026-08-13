"use client";

import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import { getErrorMessage, type LoginHistoryEntry, type LoginHistoryResponse } from "@/lib/types";
import { useToast } from "./Toast";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "./ui/button";

const PAGE_SIZE = 10;

function deviceIcon(deviceType: string | undefined) {
  switch (deviceType) {
    case "mobile":
      return <Smartphone className="h-5 w-5 text-brand" />;
    case "tablet":
      return <Tablet className="h-5 w-5 text-brand" />;
    case "laptop":
      return <Laptop className="h-5 w-5 text-brand" />;
    case "desktop":
      return <Monitor className="h-5 w-5 text-brand" />;
    default:
      return <Globe className="h-5 w-5 text-muted-foreground" />;
  }
}

function deviceLabel(entry: LoginHistoryEntry) {
  const parts: string[] = [];
  if (entry.os) parts.push(entry.os);
  if (entry.deviceType && entry.deviceType !== "unknown") parts.push(entry.deviceType);
  if (entry.browser) parts.push(entry.browser);
  return parts.length ? parts.join(" · ") : "Unknown device";
}

function formatIST(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function LoginHistorySection() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [items, setItems] = useState<LoginHistoryEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const goToPage = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/login-history", { params: { page, limit: PAGE_SIZE } })
      .then((res) => {
        if (cancelled) return;
        const data = res.data as LoginHistoryResponse;
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotalPages(data.totalPages ?? 1);
        setTotal(data.total ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        toast(getErrorMessage(err, "Could not load login history"), "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, toast]);

  return (
    <div className="py-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">{t("login_history")}</h2>
        {!loading && total > 0 && (
          <span className="text-xs text-muted-foreground">
            {total} total
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-border bg-card p-4 h-16"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-semibold text-foreground">
            {t("login_history")}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Your sign-ins will appear here for security.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((entry) => (
            <div
              key={entry._id ?? `${entry.loginTime ?? ""}-${entry.ipAddress ?? ""}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
            >
              <span className="grid place-items-center h-10 w-10 shrink-0 rounded-full bg-brand/10">
                {deviceIcon(entry.deviceType)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {deviceLabel(entry)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {entry.browserVersion ? `${entry.browser} ${entry.browserVersion}` : entry.browser}
                  {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-foreground">
                  {formatIST(entry.loginTime ?? entry.loggedInAt)}
                </p>
                <p className="text-xs capitalize text-muted-foreground">
                  {entry.loginMethod || "email"}
                </p>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-border"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-border"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
