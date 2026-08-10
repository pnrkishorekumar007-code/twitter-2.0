"use client";

import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PLAN_ORDER = ["free", "bronze", "silver", "gold"] as const;

const PLAN_META: Record<string, { title: string; tagline: string }> = {
  free: { title: "Free", tagline: "1 tweet total" },
  bronze: { title: "Bronze", tagline: "Up to 3 tweets / month" },
  silver: { title: "Silver", tagline: "Up to 5 tweets / month" },
  gold: { title: "Gold", tagline: "Unlimited tweeting" },
};

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
  const { user } = useAuth();
  const [plans, setPlans] = useState<Record<string, any>>({});
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    axiosInstance
      .get("/payment/plans")
      .then((res) => setPlans(res.data))
      .catch((error) => {
        console.error("Failed to load plans:", error);
        setPlans({});
      });
  }, []);

  const handleSubscribe = async (planKey: string) => {
    if (!user) return alert("Log in first");
    if (planKey === "free") return;
    setMessage("");
    setLoadingPlan(planKey);
    try {
      await loadRazorpayScript();
      const orderRes = await axiosInstance.post("/payment/create-order", { plan: planKey });
      const { order, key } = orderRes.data;

      const rzp = new window.Razorpay({
        key,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "Twiller",
        description: `${PLAN_META[planKey].title} plan subscription`,
        prefill: { email: (user as any).email, name: (user as any).displayName },
        handler: async (response: any) => {
          try {
            await axiosInstance.post("/payment/verify", {
              ...response,
              plan: planKey,
              email: (user as any).email,
            });
            setMessage("✅ Subscribed! A confirmation invoice has been emailed to you.");
          } catch (err: any) {
            setMessage(err?.response?.data?.error || "Payment verification failed.");
          }
        },
        theme: { color: "#1d9bf0" },
      });
      rzp.on("payment.failed", () => setMessage("Payment failed. Please try again."));
      rzp.open();
    } catch (err: any) {
      setMessage(err?.response?.data?.error || "Could not start payment. Payments are only allowed 10:00-11:00 IST.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-1">Twiller Premium</h1>
      <p className="text-gray-400 mb-4">
        Payments are open daily between <b>10:00–11:00 AM IST</b> only.
      </p>
      {message && <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 mb-4">{message}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        {PLAN_ORDER.map((key) => {
          const plan = plans[key];
          const meta = PLAN_META[key];
          const isCurrent = (user as any)?.subscription?.plan === key;
          return (
            <Card key={key} className="bg-black border-gray-800 p-5 flex flex-col gap-3">
              <div>
                <h2 className="text-xl font-bold">{meta.title}</h2>
                <p className="text-gray-400 text-sm">{meta.tagline}</p>
              </div>
              <div className="text-3xl font-extrabold">
                {plan?.price ? `₹${plan.price}` : "₹0"}
                <span className="text-sm text-gray-400 font-normal"> /mo</span>
              </div>
              <Button
                disabled={key === "free" || isCurrent || loadingPlan === key}
                onClick={() => handleSubscribe(key)}
                className={`rounded-full font-bold ${
                  isCurrent ? "bg-gray-700" : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {isCurrent ? "Current plan" : key === "free" ? "Default" : loadingPlan === key ? "Loading..." : "Subscribe"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
