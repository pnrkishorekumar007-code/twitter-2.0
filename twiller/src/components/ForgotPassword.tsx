"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import axiosInstance from "@/lib/axiosInstance";
import { getErrorMessage } from "@/lib/types";
import { useToast } from "./Toast";
import { ArrowLeft, CheckCircle2, Loader2, Mail, Phone } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;

interface ResetResult {
  message?: string;
  newPassword?: string;
  note?: string;
  firebaseUpdated?: boolean;
}

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [result, setResult] = useState<ResetResult | null>(null);
  const { toast } = useToast();

  const validate = () => {
    const value = identifier.trim();
    if (!value) return "Please enter your registered email or phone number.";
    const digits = value.replace(/\D/g, "");
    if (!EMAIL_RE.test(value) && !(PHONE_RE.test(value) && digits.length >= 7 && digits.length <= 15)) {
      return "Please enter a valid email address or phone number.";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFieldError(err);
      return;
    }
    setFieldError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/forgot-password", {
        identifier: identifier.trim(),
      });
      setResult(res.data);
      toast(
        res.data?.newPassword
          ? "Password reset successful"
          : "Check your email for the new password",
        "success"
      );
    } catch (err) {
      const msg = getErrorMessage(err);
      setFieldError(msg);
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
          Enter your registered email address or phone number and we&apos;ll reset
          your password for you.
        </p>
      </div>

      {result && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-foreground space-y-3">
          <p className="flex items-start gap-2 font-medium">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            {result.message}
          </p>
          {result.newPassword && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                New password
              </p>
              <p className="font-mono text-lg font-bold tracking-widest bg-black/40 border border-border rounded-lg px-3 py-2 break-all">
                {result.newPassword}
              </p>
            </div>
          )}
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

      {!result && (
        <form onSubmit={handleSubmit} className="space-y-4">
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
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
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
