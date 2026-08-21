"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { TwillerBrand } from "./Twitterlogo";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";
import { getErrorMessage } from "@/lib/types";
import { useToast } from "./Toast";

interface PendingSession {
  token: string;
  email: string;
  expiresAt: number;
  method: string;
}

const DEFAULT_TTL_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

function readPendingSession(): PendingSession | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("twiller-login-token");
  if (!token) return null;
  const storedExpiry = Number(localStorage.getItem("twiller-login-expires-at"));
  return {
    token,
    email: localStorage.getItem("twiller-login-email") || "",
    expiresAt: storedExpiry || Date.now() + DEFAULT_TTL_SECONDS * 1000,
    method: localStorage.getItem("twiller-login-method") || "email",
  };
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function VerifyLoginOtp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeLogin } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<PendingSession | null>(() =>
    readPendingSession()
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // 1-second clock driving the expiry countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Resend button cooldown countdown (60s).
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const urlEmail = searchParams.get("email") || "";
  const effectiveEmail = (urlEmail || session?.email || "").trim();
  const expiresAt = session?.expiresAt || 0;
  const secondsLeft =
    expiresAt > 0
      ? Math.max(0, Math.floor((expiresAt - now) / 1000))
      : DEFAULT_TTL_SECONDS;
  const expired = expiresAt > 0 && secondsLeft <= 0;
  const canVerify = code.length === 6 && !!session?.token && !verifying;
  const canResend = cooldown <= 0 && !!session?.token && !sending;

  const clearPending = () => {
    localStorage.removeItem("twiller-login-token");
    localStorage.removeItem("twiller-login-email");
    localStorage.removeItem("twiller-login-expires-at");
    localStorage.removeItem("twiller-login-method");
    localStorage.removeItem("twiller-login-dev-code");
    localStorage.removeItem("twiller-otp-pending");
    localStorage.removeItem("twiller-login-is-registration");
    localStorage.removeItem("twiller-registration-data");
  };

  const handleVerify = async () => {
    if (!canVerify || !session) return;
    setVerifying(true);
    setError("");
    try {
      const isRegistration = localStorage.getItem("twiller-login-is-registration") === "1";

      if (isRegistration) {
        const regData = JSON.parse(localStorage.getItem("twiller-registration-data") || "{}");
        const res = await axiosInstance.post("/auth/register-verify", {
          email: effectiveEmail,
          code,
          loginToken: session.token,
          displayName: regData.displayName || effectiveEmail.split("@")[0],
          username: regData.username || effectiveEmail.split("@")[0],
          phone: regData.phone,
          avatar: regData.avatar,
        });
        completeLogin(res.data);
      } else {
        const res = await axiosInstance.post("/auth/verify-login-otp", {
          email: effectiveEmail,
          code,
          loginToken: session.token,
          method: session.method,
        });
        completeLogin(res.data);
      }

      clearPending();
      toast("Login successful", "success");
      router.replace("/");
    } catch (err) {
      setError(getErrorMessage(err, "Verification failed. Please try again."));
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !session) return;
    setSending(true);
    setError("");
    try {
      const isRegistration = localStorage.getItem("twiller-login-is-registration") === "1";
      const endpoint = isRegistration ? "/auth/send-register-otp" : "/auth/send-login-otp";

      const res = await axiosInstance.post(endpoint, {
        email: effectiveEmail,
        loginToken: session.token,
      });
      const expiresIn = Number(res.data?.expiresIn) || DEFAULT_TTL_SECONDS;
      const newExpiry = Date.now() + expiresIn * 1000;
      localStorage.setItem("twiller-login-expires-at", String(newExpiry));
      setSession((s) =>
        s
          ? {
              ...s,
              expiresAt: newExpiry,
            }
          : s
      );
      setCooldown(Number(res.data?.resendAfter) || RESEND_COOLDOWN_SECONDS);
      setCode("");
      toast("A new code has been sent to your email", "success");
    } catch (err) {
      const msg = getErrorMessage(err, "Could not send a new code.");
      setError(msg);
      const axiosErr = err as {
        response?: { data?: { resendAfter?: number } };
      };
      const wait = Number(axiosErr?.response?.data?.resendAfter);
      if (wait > 0) setCooldown(wait);
    } finally {
      setSending(false);
    }
  };

  const renderNoSession = () => (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <CardContent className="p-6 sm:p-8 text-center space-y-4">
          <span className="grid place-items-center h-12 w-12 rounded-full bg-brand-gradient animate-gradient text-white shadow-lg shadow-brand/40 mx-auto">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold">No pending login</h1>
          <p className="text-gray-400 text-sm">
            {urlEmail
              ? "Your login session has expired. Please sign in again to receive a new code."
              : "There is no login in progress to verify."}
          </p>
          <Button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-full"
            onClick={() => router.push("/")}
          >
            Back to Twiller
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  if (!session) return renderNoSession();

  return (
    <div className="min-h-screen bg-black/30 backdrop-blur-xl text-white flex flex-col relative overflow-hidden">
      {/* Ambient brand background (matches forgot-password page) */}
      <div
        className="absolute inset-0 opacity-30 bg-brand-gradient animate-gradient"
        style={{ filter: "blur(120px)" }}
      />
      <div className="absolute top-1/4 right-1/4 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl animate-float-slow" />

      <div className="relative flex flex-col items-center justify-center flex-1 px-4 py-10">
        <Link href="/" aria-label="Twiller home" className="mb-8">
          <TwillerBrand />
        </Link>

        <Card className="w-full max-w-md bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center h-10 w-10 rounded-full bg-brand-gradient animate-gradient text-white shadow-lg shadow-brand/40">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-white">Verify it&apos;s you</h1>
                <p className="text-gray-400 text-sm">
                  Enter the 6-digit code emailed to{" "}
                  <span className="text-gray-200 font-medium">{effectiveEmail || "your account"}</span>
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (error) setError("");
                }}
                placeholder="6-digit code"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                disabled={verifying || sending}
                className="h-14 text-center text-2xl tracking-[0.5em] bg-white/[0.03] border-white/[0.1] text-white placeholder-gray-500 focus:border-brand focus:ring-brand/30"
              />
              {session?.method === "google" && (
                <p className="text-xs text-gray-500">
                  This code verifies your Google login.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span
                className={expired ? "text-red-400 font-semibold" : "text-gray-400"}
              >
                {expired
                  ? "Code expired"
                  : `Code expires in ${formatClock(secondsLeft)}`}
              </span>
            </div>

            <Button
              className="w-full bg-brand-gradient animate-gradient text-white font-bold py-3 rounded-full text-base shadow-lg shadow-brand/30 hover:brightness-110 hover:scale-[1.02] transition-all"
              disabled={!canVerify}
              onClick={handleVerify}
            >
              {verifying ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                "Verify and sign in"
              )}
            </Button>

            <div className="text-center">
              <Button
                variant="ghost"
                className="text-blue-400 hover:text-blue-300 hover:bg-transparent text-sm font-semibold"
                disabled={!canResend}
                onClick={handleResend}
              >
                {sending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {cooldown > 0
                      ? `Resend code in ${cooldown}s`
                      : "Resend code"}
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-gray-500 mt-6">
          © 2026 Twiller ·{" "}
          <Link href="/" className="hover:text-gray-300 hover:underline">
            Back to Twiller
          </Link>
        </p>
      </div>
    </div>
  );
}
