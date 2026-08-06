"use client";

import React, { useState } from "react";
import { Check, X, CreditCard } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useLanguage } from "@/context/LanguageContext";

interface PaymentModalProps {
  isOpen: boolean;
  planId: string;
  price: number;
  limitText: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({
  isOpen,
  planId,
  price,
  limitText,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const { t, tf } = useLanguage();
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "", name: "" });
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);

  if (!isOpen) return null;

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setPaid(true);
      onSuccess();
    }, 2000);
  };

  const resetAndClose = () => {
    setPaid(false);
    setProcessing(false);
    setCard({ number: "", expiry: "", cvc: "", name: "" });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-black border-gray-800 text-white max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6 space-y-4">
          {paid ? (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold">{t("premium.paymentSuccess")}</h3>
              <p className="text-gray-400 text-sm">{t("premium.invoiceSent")}</p>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-left">
                <p className="text-gray-400 text-sm mb-2">
                  {t("premium.invoice")} #{Date.now().toString().slice(-8)}
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{t("premium.orderSummary")}</span>
                  <span className="text-white">
                    {t(`premium.${planId}`)} — ₹{price}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-2">{limitText}</p>
              </div>
              <Button
                className="w-full bg-blue-500 hover:bg-blue-600 rounded-full"
                onClick={resetAndClose}
              >
                {t("common.close")}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{t("premium.orderSummary")}</h3>
                <Button variant="ghost" size="sm" className="text-gray-400" onClick={resetAndClose} aria-label={t("common.close")}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold capitalize">
                    {t(`premium.${planId}`)}
                  </p>
                  <p className="text-gray-400 text-sm">{limitText}</p>
                </div>
                <p className="text-xl font-bold">₹{price}</p>
              </div>

              <div className="flex items-center justify-center py-2">
                <span className="text-xs text-gray-400">{t("premium.poweredBy")}</span>
                <span className="ml-2 text-sm font-bold text-blue-400">Razorpay</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    {t("premium.cardDetails")}
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      value={card.number}
                      onChange={(e) =>
                        setCard({ ...card, number: e.target.value.replace(/\D/g, "").slice(0, 16) })
                      }
                      placeholder="4242 4242 4242 4242"
                      className="w-full pl-10 pr-3 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={card.expiry}
                    onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                    placeholder="MM / YY"
                    className="px-3 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 outline-none text-sm"
                  />
                  <input
                    value={card.cvc}
                    onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                    placeholder="CVC"
                    className="px-3 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <input
                  value={card.name}
                  onChange={(e) => setCard({ ...card, name: e.target.value })}
                  placeholder={t("profile.name")}
                  className="w-full px-3 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>

              <Button
                onClick={handlePay}
                disabled={processing}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-full h-11"
              >
                {processing ? t("premium.processing") : tf("premium.payNow", { amount: String(price) })}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
