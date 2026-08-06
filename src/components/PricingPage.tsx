"use client";

import React, { useState, useEffect } from "react";
import { BadgeCheck, Check, X, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useAuth, type Plan, PLAN_LIMITS } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { isPaymentWindowOpen, getIstTimeLabel, pluralize } from "@/lib/otp";
import PaymentModal from "./PaymentModal";

interface PlanConfig {
  id: Plan;
  price: number;
  limit: number;
  buttonClass: string;
  popular?: boolean;
}

const PLANS: PlanConfig[] = [
  { id: "free", price: 0, limit: 1, buttonClass: "bg-gray-700 hover:bg-gray-600 text-white" },
  { id: "bronze", price: 100, limit: 3, buttonClass: "bg-amber-600 hover:bg-amber-700 text-white" },
  { id: "silver", price: 300, limit: 5, buttonClass: "bg-slate-300 hover:bg-slate-200 text-black", popular: true },
  { id: "gold", price: 1000, limit: Infinity, buttonClass: "bg-yellow-500 hover:bg-yellow-600 text-black" },
];

export default function PricingPage() {
  const { t, tf } = useLanguage();
  const { user, plan: currentPlan, setPlan, tweetsUsed } = useAuth();
  const [selected, setSelected] = useState<Plan | null>(null);
  const [windowOpen, setWindowOpen] = useState(false);

  useEffect(() => {
    setWindowOpen(isPaymentWindowOpen());
  }, []);

  if (!user) return null;

  const planConfig = PLANS.find((p) => p.id === selected);
  const limitText = (p: PlanConfig) =>
    p.limit === Infinity
      ? t("premium.unlimited")
      : tf("premium.tweetsLimit", {
          count: String(p.limit),
          s: pluralize(p.limit, "", "s"),
        });

  const handleSubscribe = (id: Plan) => {
    if (id === "free") {
      setPlan("free");
      return;
    }
    if (!windowOpen) return;
    setSelected(id);
  };

  const isActive = (id: Plan) => id === currentPlan;

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-white">{t("premium.title")}</h1>
          <p className="text-gray-400 text-sm">{t("premium.subtitle")}</p>
        </div>
      </div>

      <div className="p-4">
        <div
          className={`rounded-xl border p-4 mb-4 flex items-start space-x-3 ${
            windowOpen
              ? "bg-green-500/10 border-green-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}
        >
          <Clock className="h-5 w-5 shrink-0 mt-0.5 text-white" />
          <div>
            <p className="text-white font-semibold">{t("premium.paymentWindowTitle")}</p>
            <p className="text-gray-300 text-sm">{t("premium.paymentWindowText")}</p>
            <p className="text-sm mt-1 text-blue-300">
              {tf("auth.istTime", { time: getIstTimeLabel() })}{" "}
              {windowOpen ? "✓" : "✗"}
            </p>
          </div>
        </div>

        {!windowOpen && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
            <p className="text-red-300 font-semibold">{t("premium.windowClosed")}</p>
            <p className="text-gray-400 text-sm mt-1">{t("premium.windowClosedText")}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLANS.map((p) => {
            const active = isActive(p.id);
            return (
              <Card
                key={p.id}
                className={`bg-gray-900 border ${
                  active ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-800"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white capitalize">
                      {t(`premium.${p.id}`)}
                    </h3>
                    {p.popular && !active && (
                      <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        {t("premium.popular")}
                      </span>
                    )}
                    {active && (
                      <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        {t("premium.currentPlan")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline mb-2">
                    <span className="text-3xl font-extrabold text-white">₹{p.price}</span>
                    {p.price > 0 && (
                      <span className="text-gray-400 ml-1">{t("premium.perMonth")}</span>
                    )}
                  </div>

                  <p className="text-gray-400 text-sm mb-4">{t(`premium.${p.id}Desc`)}</p>

                  <ul className="space-y-2 mb-5">
                    <li className="flex items-center text-sm text-white">
                      <Check className="h-4 w-4 text-blue-400 mr-2" />
                      {limitText(p)}
                    </li>
                    <li
                      className={`flex items-center text-sm ${
                        p.id === "free" ? "text-gray-500" : "text-white"
                      }`}
                    >
                      {p.id === "free" ? (
                        <X className="h-4 w-4 text-gray-500 mr-2" />
                      ) : (
                        <Check className="h-4 w-4 text-blue-400 mr-2" />
                      )}
                      {t("premium.invoiceIncluded")}
                    </li>
                  </ul>

                  <Button
                    className={`w-full rounded-full font-semibold ${
                      active ? "bg-gray-700 text-gray-300 cursor-default" : p.buttonClass
                    }`}
                    onClick={() => handleSubscribe(p.id)}
                    disabled={active}
                  >
                    {active
                      ? t("premium.currentPlan")
                      : p.id === "free"
                      ? t("premium.choosePlan")
                      : t("premium.subscribe")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-gray-900 border-gray-800 mt-4">
          <CardContent className="p-4 flex items-center space-x-3">
            <BadgeCheck className="h-6 w-6 text-blue-400 shrink-0" />
            <div>
              <p className="text-white font-semibold">
                {t(`premium.${currentPlan}`)} —{" "}
                {currentPlan === "gold"
                  ? t("premium.unlimited")
                  : `${tweetsUsed}/${PLAN_LIMITS[currentPlan]} ${t("common.posts")}`}
              </p>
              <p className="text-gray-400 text-sm">{t("premium.currentUsage")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {planConfig && selected && (
        <PaymentModal
          isOpen={Boolean(selected)}
          planId={planConfig.id}
          price={planConfig.price}
          limitText={limitText(planConfig)}
          onClose={() => setSelected(null)}
          onSuccess={() => setPlan(planConfig.id)}
        />
      )}
    </div>
  );
}
