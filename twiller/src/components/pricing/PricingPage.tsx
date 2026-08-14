"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { useAuth } from "@/context/AuthContext";
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

const PLAN_META: Record<
  PlanKey,
  { title: string; tagline: string; features: string[] }
> = {
  FREE: {
    title: "Free",
    tagline: "Try Twiller before you commit",
    features: ["1 tweet", "Text + image posts", "Community access"],
  },
  BRONZE: {
    title: "Bronze",
    tagline: "For the casual tweeter",
    features: ["3 tweets / month", "Everything in Free", "Email support"],
  },
  SILVER: {
    title: "Silver",
    tagline: "For growing your voice",
    features: ["5 tweets / month", "Everything in Bronze", "Priority support"],
  },
  GOLD: {
    title: "Gold",
    tagline: "Unleash your posting power",
    features: ["Unlimited tweets", "Everything in Silver", "Premium badge"],
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
  const { user, refreshUser } = useAuth();
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
      toast("Please log in first", "error");
      return;
    }
    if (planKey === "FREE") return;
    if (!windowInfo.open) {
      toast("Payments are allowed only between 10:00 AM and 11:00 AM IST.", "error");
      return;
    }

    setLoadingPlan(planKey);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Razorpay checkout failed to load.");

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
        description: `${PLAN_META[planKey].title} plan subscription`,
        prefill: { email: user.email, name: user.displayName },
        handler: async (response: RazorpayResponse) => {
          try {
            await axiosInstance.post("/payment/verify", response);
            await refreshUser();
            toast("Subscription activated! Invoice emailed to you.", "success");
          } catch (err) {
            toast(
              "Payment verification failed",
              "error",
              getErrorMessage(err)
            );
          }
        },
        theme: { color: "#1d9bf0" },
      });
      rzp.on("payment.failed", () => {
        toast("Payment failed. Please try again.", "error");
      });
      setLoadingPlan(null);
      rzp.open();
    } catch (err) {
      setLoadingPlan(null);
      const msg =
        getErrorMessage(
          err,
          "Could not start payment. Payments are only allowed 10:00–11:00 AM IST."
        );
      toast(msg, "error");
    }
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
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
              Twiller Premium
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Payments open daily 10:00–11:00 AM IST only.
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
              <span className="font-semibold">Payment window is open — buy now.</span>
            ) : (
              <span>
                Payments are allowed only between{" "}
                <b>10:00 AM and 11:00 AM IST</b>. Next window opens in{" "}
                <b>{formatCountdown(windowInfo.nextOpenAt - now)}</b>.
              </span>
            )}
          </div>
        </div>

        {/* Remaining tweets */}
        {user && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {isUnlimited ? "Unlimited Tweets" : "Tweets Remaining"}
            </span>
            <span className="font-bold text-foreground">
              {isUnlimited ? "Unlimited" : tweetsRemaining}
            </span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {PLAN_ORDER.map((key, index) => {
            const meta = PLAN_META[key];
            const price = plans[key]?.price ?? 0;
            const limit =
              key === "GOLD"
                ? "Unlimited"
                : `${plans[key]?.tweetLimit ?? meta.features[0]} / month`;
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
                    ? "border-brand ring-2 ring-brand/40 shadow-lg shadow-brand/10"
                    : isRecommended
                    ? "border-brand/60 shadow-xl shadow-brand/10"
                    : "border-border hover:shadow-lg"
                )}
              >
                {isRecommended && !isCurrent && (
                  <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-brand px-3 py-0.5 text-xs font-bold text-brand-foreground shadow-md shadow-brand/40">
                    <Sparkles className="h-3.5 w-3.5" /> Recommended
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-0.5 text-xs font-bold text-background shadow-md">
                    <BadgeCheck className="h-3.5 w-3.5" /> Current plan
                  </span>
                )}

                <div>
                  <h2 className="text-lg font-extrabold text-foreground flex items-center gap-1.5">
                    {meta.title}
                    {key === "GOLD" && (
                      <Crown className="h-4 w-4 text-amber-400" />
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{meta.tagline}</p>
                </div>

                <div className="mt-4 text-3xl font-extrabold text-foreground">
                  {price === 0 ? "₹0" : `₹${price}`}
                  <span className="text-sm text-muted-foreground font-normal">
                    {" "}/mo
                  </span>
                </div>

                <ul className="mt-4 flex-1 space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <BadgeCheck className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                    <span className="font-medium text-foreground">{limit}</span>
                  </li>
                  {meta.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <BadgeCheck className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                      <span>{feature}</span>
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
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </>
                  ) : isCurrent ? (
                    "Current plan"
                  ) : isFree ? (
                    "Default"
                  ) : (
                    "Buy Now"
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
