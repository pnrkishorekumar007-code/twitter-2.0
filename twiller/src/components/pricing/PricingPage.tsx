"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "../Toast";
import axiosInstance from "@/lib/axiosInstance";
import { BadgeCheck, Clock, Crown, Loader2, Sparkles, Menu } from "lucide-react";
import { motion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/types";

declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  on: (event: string, handler: () => void) => void;
  open: () => void;
}

interface RazorpayConstructor {
  new (options: Record<string, unknown>): RazorpayInstance;
}

type PlanKey = "FREE" | "BRONZE" | "SILVER" | "GOLD";

interface PlanPricing {
  price?: number;
  tweetLimit?: number;
}

const PLAN_ORDER: PlanKey[] = ["FREE", "BRONZE", "SILVER", "GOLD"];

// tagline/features hold translation keys resolved via t() at render time;
// plan titles stay as proper nouns (Free/Bronze/Silver/Gold).
const PLAN_META: Record<
  PlanKey,
  { title: string; tagline: string; features: string[] }
> = {
  FREE: {
    title: "Free",
    tagline: "pricing_free_tagline",
    features: ["pricing_free_f1", "pricing_free_f2", "pricing_free_f3"],
  },
  BRONZE: {
    title: "Bronze",
    tagline: "pricing_bronze_tagline",
    features: ["pricing_bronze_f1", "pricing_bronze_f2", "pricing_bronze_f3"],
  },
  SILVER: {
    title: "Silver",
    tagline: "pricing_silver_tagline",
    features: ["pricing_silver_f1", "pricing_silver_f2", "pricing_silver_f3"],
  },
  GOLD: {
    title: "Gold",
    tagline: "pricing_gold_tagline",
    features: ["pricing_gold_f1", "pricing_gold_f2", "pricing_gold_f3"],
  },
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Payments open daily 10:00–11:00 AM IST. IST has no DST, so the offset is
// constant and we can compute the next window reliably from UTC timestamps.
function getWindowInfo(now: number) {
  const ist = new Date(now + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();
  const openAt = Date.UTC(y, m, d, 4, 30, 0); // 10:00 IST
  const closeAt = Date.UTC(y, m, d, 5, 30, 0); // 11:00 IST
  if (now >= openAt && now < closeAt) {
    return { open: true, nextOpenAt: openAt };
  }
  return { open: false, nextOpenAt: now < openAt ? openAt : openAt + 24 * 60 * 60 * 1000 };
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PricingPage() {
  const { user, refreshUser, completeLogin } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Partial<Record<PlanKey, PlanPricing>>>({});
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    axiosInstance
      .get("/payment/plans")
      .then((res) => setPlans(res.data))
      .catch((err) => {
        console.error("Failed to load plans:", err);
        setPlans({});
      });
  }, []);

  // One-second tick keeps the countdown + window state live.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const windowInfo = useMemo(() => getWindowInfo(now), [now]);

  const isUnlimited = user?.subscriptionPlan === "GOLD";
  const tweetsRemaining = user
    ? Math.max(0, (user.tweetLimit ?? 1) - (user.tweetsUsed ?? 0))
    : null;

  const handleSubscribe = async (planKey: PlanKey) => {
    if (!user) {
      toast(t("pricing_please_login"), "error");
      return;
    }
    if (planKey === "FREE") return;
    if (!windowInfo.open) {
      toast(t("pricing_window_error"), "error");
      return;
    }

    setLoadingPlan(planKey);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error(t("pricing_razorpay_load_failed"));

      const orderRes = await axiosInstance.post("/payment/create-order", {
        plan: planKey,
      });
      const { order, key } = orderRes.data;

      const rzp = new window.Razorpay({
        key,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "Twiller",
        description: `${PLAN_META[planKey].title} ${t("pricing_description")}`,
        prefill: { email: user.email, name: user.displayName },
        handler: async (response: RazorpayResponse) => {
          setLoadingPlan(null);
          try {
            const verifyRes = await axiosInstance.post("/payment/verify", response);
            // Apply the freshly-activated plan immediately so the UI updates
            // even before the follow-up refresh completes.
            if (verifyRes.data?.user) {
              completeLogin({ user: verifyRes.data.user });
            }
            await refreshUser();
            toast(t("pricing_subscription_activated"), "success");
          } catch (err) {
            toast(
              t("pricing_verify_failed"),
              "error",
              getErrorMessage(err)
            );
          }
        },
        theme: { color: "#1d9bf0" },
      });
      rzp.on("payment.failed", () => {
        setLoadingPlan(null);
        toast(t("pricing_payment_failed"), "error");
      });
      rzp.open();
    } catch (err) {
      setLoadingPlan(null);
      const msg =
        getErrorMessage(
          err,
          t("pricing_could_not_start")
        );
      toast(msg, "error");
    }
  };

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("twiller:open-menu"))}
            className="md:hidden grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground hover:bg-accent transition-colors active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand" />
              {t("pricing_title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("pricing_subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Payment window banner */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border px-4 py-3",
            windowInfo.open
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-amber-500/40 bg-amber-500/10"
          )}
        >
          <Clock className="h-5 w-5 shrink-0 text-foreground" />
          <div className="flex-1 text-sm text-foreground">
            {windowInfo.open ? (
              <span className="font-semibold">{t("pricing_window_open")}</span>
            ) : (
              <span>
                {t("pricing_window_closed")}{" "}
                <b>10:00 AM and 11:00 AM IST</b>. {t("pricing_window_next")}{" "}
                <b>{formatCountdown(windowInfo.nextOpenAt - now)}</b>.
              </span>
            )}
          </div>
        </div>

        {/* Remaining tweets */}
        {user && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {isUnlimited ? t("pricing_unlimited") : t("pricing_tweets_remaining")}
            </span>
            <span className="font-bold text-foreground">
              {isUnlimited ? t("pricing_unlimited") : tweetsRemaining}
            </span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {PLAN_ORDER.map((key, index) => {
            const meta = PLAN_META[key];
            const price = plans[key]?.price ?? 0;
            const limit =
              key === "GOLD"
                ? t("pricing_unlimited")
                : `${plans[key]?.tweetLimit ?? t(meta.features[0])} ${t("pricing_per_month")}`;
            const isCurrent = user?.subscriptionPlan === key;
            const isFree = key === "FREE";
            const isRecommended = key === "GOLD";

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.3 }}
                whileHover={{ y: -4 }}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-5 transition-shadow duration-300",
                  isCurrent
                    ? "border-brand ring-2 ring-brand/40"
                    : isRecommended
                    ? "border-brand/60"
                    : "border-border"
                )}
              >
                {isRecommended && !isCurrent && (
                  <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-brand px-3 py-0.5 text-xs font-bold text-brand-foreground">
                    <Sparkles className="h-3.5 w-3.5" /> {t("pricing_recommended")}
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-0.5 text-xs font-bold text-background">
                    <BadgeCheck className="h-3.5 w-3.5" /> {t("pricing_current_plan")}
                  </span>
                )}

                <div>
                  <h2 className="text-lg font-extrabold text-foreground flex items-center gap-1.5">
                    {meta.title}
                    {key === "GOLD" && (
                      <Crown className="h-4 w-4 text-amber-400" />
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{t(meta.tagline)}</p>
                </div>

                <div className="mt-4 text-3xl font-extrabold text-foreground">
                  {price === 0 ? "₹0" : `₹${price}`}
                  <span className="text-sm text-muted-foreground font-normal">
                    {" "}{t("pricing_per_month")}
                  </span>
                </div>

                <ul className="mt-4 flex-1 space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <BadgeCheck className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                    <span className="font-medium text-foreground">{limit}</span>
                  </li>
                  {meta.features.map((featureKey) => (
                    <li key={featureKey} className="flex items-start gap-2">
                      <BadgeCheck className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="rounded-full font-bold w-full mt-5"
                  variant={
                    isRecommended && !isCurrent
                      ? "brand"
                      : isCurrent
                      ? "outline"
                      : "default"
                  }
                  disabled={
                    isFree ||
                    isCurrent ||
                    loadingPlan !== null ||
                    !windowInfo.open
                  }
                  onClick={() => handleSubscribe(key)}
                >
                  {loadingPlan === key ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> {t("pricing_loading")}
                    </>
                  ) : isCurrent ? (
                    t("pricing_current_plan")
                  ) : isFree ? (
                    t("pricing_default")
                  ) : (
                    t("pricing_buy_now")
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
