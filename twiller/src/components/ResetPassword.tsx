"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import axiosInstance from "@/lib/axiosInstance";
import { getErrorMessage } from "@/lib/types";
import { useToast } from "./Toast";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  RESET_REQUEST_KEY,
  type ResetRequestInfo,
} from "./ForgotPassword";

/* sessionStorage-backed store (useSyncExternalStore keeps SSR/hydration safe) */
let cachedRaw: string | null | undefined;
let cachedValue: ResetRequestInfo | null;

function readResetRequest(): ResetRequestInfo | null {
  const raw = window.sessionStorage.getItem(RESET_REQUEST_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedValue = raw ? (JSON.parse(raw) as ResetRequestInfo) : null;
    } catch {
      cachedValue = null;
    }
  }
  return cachedValue ?? null;
}

const subscribe = () => () => {}; // no cross-tab events for sessionStorage

type Step = "verify" | "done";

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

/**
 * /reset-password — step 2 of recovery: enter the verification code, then the
 * server generates a letters-only password and delivers it. The user may
 * regenerate it within the same reset session (10 min token window).
 */
export default function ResetPassword() {
  const [step, setStep] = useState<Step>("verify");
  const requestInfo = useSyncExternalStore(
    subscribe,
    readResetRequest,
    () => null
  );
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [result, setResult] = useState<ResetResult | null>(null);
  // Captured at verify time so regeneration still works after we clear
  // the sessionStorage handoff.
  const [savedIdentifier, setSavedIdentifier] = useState("");
  const [resetToken, setResetToken] = useState("");
  // Code deadline: derived from server-provided TTL; falls back to 5 minutes.
  const [deadlineMs] = useState(() => {
    const ttl = requestInfo?.expiresIn;
    return Date.now() + (typeof ttl === "number" ? ttl * 1000 : 5 * 60 * 1000);
  });
  const [now, setNow] = useState(() => Date.now());
  const { toast } = useToast();

  // 1-second clock driving the code-expiry countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsLeft = Math.max(0, Math.floor((deadlineMs - now) / 1000));
  const expired = step === "verify" && secondsLeft <= 0;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestInfo) return;
    if (code.length !== 6) {
      setCodeError("Please enter the 6-digit code.");
      return;
    }
    setCodeError("");
    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/forgot-password/verify", {
        identifier: requestInfo.identifier,
        code,
      });
      setResult(res.data);
      setResetToken(String(res.data?.resetToken || ""));
      setSavedIdentifier(requestInfo.identifier);
      setStep("done");
      toast("Password reset successful", "success");
      try {
        sessionStorage.removeItem(RESET_REQUEST_KEY);
      } catch {
        // ignore
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setCodeError(msg);
      toast("Password reset failed", "error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!savedIdentifier || !resetToken) return;
    setRegenerating(true);
    try {
      const res = await axiosInstance.post("/auth/forgot-password/regenerate", {
        identifier: savedIdentifier,
        resetToken,
      });
      setResult({
        message: res.data?.message,
        note: res.data?.note,
        firebaseUpdated: res.data?.firebaseUpdated,
      });
      toast("A new password has been sent", "success");
    } catch (err) {
      const msg = getErrorMessage(err);
      toast("Could not regenerate password", "error", msg);
    } finally {
      setRegenerating(false);
    }
  };

  if (!requestInfo) {
    return (
      <div className="w-full space-y-5">
        <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
          No active recovery request found. Start by requesting a verification
          code — you can use this option one time per day.
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand/80 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Go to forgot password
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter the verification code we sent you. We&apos;ll generate a new
          password using letters only (A–Z, a–z) and deliver it to you.
        </p>
      </div>

      {step === "verify" && (
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
            className="w-full bg-brand text-white font-bold py-3 rounded-full hover:bg-x-blue-hover"
            disabled={loading || expired}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Verifying...
              </>
            ) : (
              "Verify and reset password"
            )}
          </Button>

          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-1 text-sm text-brand hover:text-brand/80 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Use a different email or phone
          </Link>
        </form>
      )}

      {step === "done" && result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-foreground space-y-3">
            <p className="flex items-start gap-2 font-medium">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              {result.message}
            </p>
            {result.note && <p className="text-xs text-amber-500">{result.note}</p>}
            {result.firebaseUpdated === false && (
              <p className="text-xs text-amber-500">
                Your new password was saved to your account record, but the live
                Firebase login password couldn&apos;t be updated.
              </p>
            )}
          </div>

          {resetToken && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">
                Not happy with the generated password?
              </p>
              <p className="text-sm text-muted-foreground">
                Regenerate a different letters-only password. This doesn&apos;t
                use another daily recovery attempt.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full font-bold border-border text-foreground hover:bg-hover-overlay"
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Regenerate password
                  </>
                )}
              </Button>
            </div>
          )}

          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand/80 hover:underline"
          >
            Continue to sign in
          </Link>
        </div>
      )}
    </div>
  );
}
