"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import axiosInstance from "@/lib/axiosInstance";
import { getErrorMessage } from "@/lib/types";
import { useToast } from "./Toast";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail, Phone } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;

type Step = "request" | "verify" | "done";

interface RequestInfo {
  channel?: string;
  deliveredTo?: string;
  smsFallback?: boolean;
  expiresIn?: number;
}

interface ResetResult {
  message?: string;
  note?: string;
  firebaseUpdated?: boolean;
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [result, setResult] = useState<ResetResult | null>(null);
  const [expiresAtMs, setExpiresAtMs] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const { toast } = useToast();

  // 1-second clock driving the code-expiry countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsLeft =
    expiresAtMs > 0
      ? Math.max(0, Math.floor((expiresAtMs - now) / 1000))
      : 10 * 60;
  const expired = step === "verify" && secondsLeft <= 0;

  const validate = () => {
    const value = identifier.trim();
    if (!value) return "Please enter your registered email or phone number.";
    const digits = value.replace(/\D/g, "");
    if (!EMAIL_RE.test(value) && !(PHONE_RE.test(value) && digits.length >= 7 && digits.length <= 15)) {
      return "Please enter a valid email address or phone number.";
    }
    return "";
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFieldError(err);
      return;
    }
    setFieldError("");
    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/forgot-password", {
        identifier: identifier.trim(),
      });
      setRequestInfo(res.data);
      const ttl = Number(res.data?.expiresIn) || 600;
      setExpiresAtMs(Date.now() + ttl * 1000);
      setStep("verify");
      toast("A verification code has been sent", "success");
    } catch (err) {
      const msg = getErrorMessage(err);
      setFieldError(msg);
      toast("Could not send verification code", "error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setCodeError("Please enter the 6-digit code.");
      return;
    }
    setCodeError("");
    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/forgot-password/verify", {
        identifier: identifier.trim(),
        code,
      });
      setResult(res.data);
      setStep("done");
      toast("Password reset successful", "success");
    } catch (err) {
      const msg = getErrorMessage(err);
      setCodeError(msg);
      toast("Password reset failed", "error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your registered email address or phone number, then verify the
          code we send you. We&apos;ll email or text you a new password.
        </p>
      </div>

      {step === "request" && (
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier" className="text-foreground">
              Email or Phone number
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="identifier"
                type="text"
                inputMode="email"
                autoComplete="username"
                placeholder="you@example.com or +91 98765 43210"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (fieldError) setFieldError("");
                }}
                className="pl-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-brand/30"
                disabled={loading}
              />
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            </div>
            {fieldError && <p className="text-sm text-red-500">{fieldError}</p>}
          </div>

          <Button
            type="submit"
            className="w-full bg-brand-gradient animate-gradient text-white font-semibold py-3 rounded-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending code...
              </>
            ) : (
              "Send verification code"
            )}
          </Button>
        </form>
      )}

      {step === "verify" && requestInfo && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="rounded-xl border border-brand/40 bg-brand/5 p-4 text-sm text-foreground space-y-1">
            <p className="flex items-start gap-2 font-medium">
              <KeyRound className="h-5 w-5 text-brand shrink-0 mt-0.5" />
              {requestInfo.channel === "sms"
                ? "We sent a verification code to your phone."
                : "We sent a verification code to your email."}
            </p>
            {requestInfo.deliveredTo && (
              <p className="text-xs text-muted-foreground">
                Delivered to {requestInfo.deliveredTo}
              </p>
            )}
            {requestInfo.smsFallback && (
              <p className="text-xs text-amber-500">
                SMS isn&apos;t configured, so the code was emailed instead.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code" className="text-foreground">
              6-digit code
            </Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (codeError) setCodeError("");
              }}
              className="text-foreground placeholder:text-muted-foreground focus-visible:ring-brand/30 text-center tracking-[0.5em]"
              disabled={loading}
              autoFocus
            />
            {codeError && <p className="text-sm text-red-500">{codeError}</p>}
          </div>

          <p
            className={`text-sm ${
              expired ? "text-red-500 font-semibold" : "text-muted-foreground"
            }`}
          >
            {expired
              ? "This code has expired. You can request a new one tomorrow."
              : `Code expires in ${formatClock(secondsLeft)}`}
          </p>

          <Button
            type="submit"
            className="w-full bg-brand-gradient animate-gradient text-white font-semibold py-3 rounded-full"
            disabled={loading || expired}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify and reset password"
            )}
          </Button>
        </form>
      )}

      {step === "done" && result && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-foreground space-y-3">
          <p className="flex items-start gap-2 font-medium">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            {result.message}
          </p>
          {result.note && (
            <p className="text-xs text-amber-500">{result.note}</p>
          )}
          {result.firebaseUpdated === false && (
            <p className="text-xs text-amber-500">
              Your new password was saved to your account record, but the
              live Firebase login password couldn&apos;t be updated (check
              FIREBASE_* env vars).
            </p>
          )}
        </div>
      )}

      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-brand hover:text-brand/80 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  );
}
