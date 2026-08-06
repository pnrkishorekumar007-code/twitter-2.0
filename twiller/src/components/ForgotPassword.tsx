"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  RefreshCw,
  Copy,
  Check,
  KeyRound,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import TwitterLogo from "./Twitterlogo";
import OtpModal from "./OtpModal";
import { useLanguage } from "@/context/LanguageContext";
import {
  generateLettersPassword,
  simulateSendOtp,
  verifyOtp,
  consumeOtp,
} from "@/lib/otp";

type ResetTab = "email" | "phone";
type Step = "input" | "otp" | "password" | "success";

export default function ForgotPassword() {
  const { t, tf } = useLanguage();
  const [tab, setTab] = useState<ResetTab>("email");
  const [value, setValue] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");
  const [usedToday, setUsedToday] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const lastReset = localStorage.getItem("twiller-last-reset");
    const today = new Date().toISOString().slice(0, 10);
    if (lastReset === today) {
      setUsedToday(true);
      setStep("input");
    }
  }, []);

  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (usedToday) return;
    if (!value.trim()) {
      setError(
        tab === "email" ? t("auth.emailRequired") : t("common.error")
      );
      return;
    }
    if (tab === "email" && !/\S+@\S+\.\S+/.test(value)) {
      setError(t("auth.invalidEmail"));
      return;
    }
    simulateSendOtp(value, tab);
    setShowOtp(true);
  };

  const handleOtpVerify = (otp: string): boolean => {
    if (verifyOtp(otp)) {
      consumeOtp();
      setShowOtp(false);
      setStep("password");
      return true;
    }
    return false;
  };

  const handleGenerate = () => {
    const pwd = generateLettersPassword(12);
    setGenerated(pwd);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDone = () => {
    localStorage.setItem("twiller-last-reset", new Date().toISOString().slice(0, 10));
    setStep("success");
  };

  if (usedToday && step === "input") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black border-gray-800 text-white">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold">{t("forgot.oncePerDay")}</h1>
            <p className="text-gray-400">{t("forgot.resetAgainLater")}</p>
            <Link href="/" className="block">
              <Button className="w-full bg-blue-500 hover:bg-blue-600 rounded-full mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("common.back")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="p-4">
        <Link
          href="/"
          className="inline-flex items-center text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          {t("common.back")}
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black border-gray-800 text-white">
          <CardContent className="p-8">
            <div className="mb-6 flex justify-center">
              <TwitterLogo size="xl" className="text-white" />
            </div>

            {step === "input" && (
              <>
                <h1 className="text-2xl font-bold mb-2">{t("forgot.title")}</h1>
                <p className="text-gray-400 mb-6">{t("forgot.subtitle")}</p>

                <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-900 rounded-xl p-1">
                  <button
                    onClick={() => setTab("email")}
                    className={`py-2 rounded-lg text-sm font-semibold flex items-center justify-center ${
                      tab === "email"
                        ? "bg-blue-500 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {t("forgot.byEmail")}
                  </button>
                  <button
                    onClick={() => setTab("phone")}
                    className={`py-2 rounded-lg text-sm font-semibold flex items-center justify-center ${
                      tab === "phone"
                        ? "bg-blue-500 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {t("forgot.byPhone")}
                  </button>
                </div>

                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetTarget" className="text-white">
                      {tab === "email" ? t("common.email") : t("common.phone")}
                    </Label>
                    <div className="relative">
                      {tab === "email" ? (
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      ) : (
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      )}
                      <Input
                        id="resetTarget"
                        type={tab === "email" ? "email" : "tel"}
                        placeholder={
                          tab === "email"
                            ? "you@example.com"
                            : "+91 98765 43210"
                        }
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                      />
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full h-11"
                  >
                    {t("forgot.requestReset")}
                  </Button>
                </form>

                <p className="text-xs text-gray-500 mt-4 text-center">
                  {t("forgot.oncePerDay")}
                </p>
              </>
            )}

            {step === "password" && (
              <div className="space-y-5">
                <div className="flex items-start space-x-3">
                  <KeyRound className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <h2 className="text-xl font-bold">{t("forgot.newPassword")}</h2>
                    <p className="text-gray-400 text-sm mt-1">{t("forgot.generateHint")}</p>
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full h-11"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t("forgot.generatePassword")}
                </Button>

                {generated && (
                  <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                    <p className="text-center text-2xl font-mono font-bold tracking-widest text-blue-300 break-all">
                      {generated}
                    </p>
                    <div className="flex justify-center mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="border-gray-600 text-white hover:bg-gray-800"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-2 text-green-400" />
                            {t("forgot.copied")}
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            {t("common.confirm")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleDone}
                  disabled={!generated}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-full h-11"
                >
                  {t("forgot.done")}
                </Button>
              </div>
            )}

            {step === "success" && (
              <div className="text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                  <ShieldCheck className="h-7 w-7 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold">{t("forgot.passwordResetSuccess")}</h2>
                <p className="text-gray-400 text-sm">{t("forgot.oncePerDay")}</p>
                <Link href="/" className="block">
                  <Button className="w-full bg-blue-500 hover:bg-blue-600 rounded-full">
                    {t("common.continue")}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <OtpModal
        isOpen={showOtp}
        onClose={() => setShowOtp(false)}
        target={value}
        channel={tab}
        title={t("forgot.verifyToReset")}
        onVerify={handleOtpVerify}
      />
    </div>
  );
}
