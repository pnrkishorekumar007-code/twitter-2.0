"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { simulateSendOtp } from "@/lib/otp";

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: string;
  channel: "email" | "phone";
  title?: string;
  subtitle?: string;
  onVerify: (otp: string) => boolean;
}

export default function OtpModal({
  isOpen,
  onClose,
  target,
  channel,
  title,
  subtitle,
  onVerify,
}: OtpModalProps) {
  const { t, tf } = useLanguage();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState("");
  const [countdown, setCountdown] = useState(30);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setOtp("");
      setError("");
      setSent(false);
      const code = simulateSendOtp(target, channel);
      setDemoOtp(code);
      setCountdown(30);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, target, channel]);

  useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  const handleVerify = () => {
    if (!otp || otp.length !== 6) {
      setError(t("common.error"));
      return;
    }
    if (onVerify(otp)) {
      onClose();
    } else {
      setError(t("common.error"));
    }
  };

  const handleResend = () => {
    const code = simulateSendOtp(target, channel);
    setDemoOtp(code);
    setSent(true);
    setError("");
    setCountdown(30);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-black border-gray-800 text-white">
        <CardHeader className="relative pb-4 border-b border-gray-800">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-gray-900"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-blue-400" />
            </div>
            <CardTitle className="text-xl font-bold">
              {title || t("common.verify")}
            </CardTitle>
            <p className="text-gray-400 text-sm mt-2">
              {subtitle ||
                tf("auth.verifyOtp", {
                  target: channel === "email" ? t("common.email") : t("common.phone"),
                })}
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm text-gray-400">
            <span className="text-gray-500">
              {channel === "email" ? "✉️" : "📱"}{" "}
              {tf("forgot.otpSentTo", {
                target:
                  channel === "email"
                    ? t("common.email")
                    : t("common.phone"),
              })}{" "}
              <span className="text-white font-medium">{target}</span>
            </span>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-300">
            Demo mode: your OTP is <span className="font-bold text-lg tracking-widest">{demoOtp}</span>
          </div>

          <div className="space-y-2">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              className="bg-transparent border-gray-600 text-white text-center text-2xl tracking-[0.5em] placeholder-gray-600 focus:border-blue-500 h-14"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>

          <Button
            onClick={handleVerify}
            disabled={otp.length !== 6}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-full h-11"
          >
            {t("common.verify")}
          </Button>

          <div className="text-center text-sm text-gray-400">
            {countdown > 0 ? (
              <span>
                {t("common.resend")} ({countdown}s)
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-400 hover:text-blue-300"
                onClick={handleResend}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {t("common.resend")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
