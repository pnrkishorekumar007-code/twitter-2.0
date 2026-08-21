"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import axiosInstance from "@/lib/axiosInstance";
import { getErrorMessage } from "@/lib/types";
import { useToast } from "./Toast";
import { ArrowLeft, KeyRound, Loader2, Mail, Phone } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;

/** Passed from /forgot-password to /reset-password via sessionStorage. */
export interface ResetRequestInfo {
  identifier: string;
  channel?: string;
  deliveredTo?: string;
  smsFallback?: boolean;
  expiresIn?: number;
}

export const RESET_REQUEST_KEY = "twiller-reset-request";

function validateIdentifier(value: string): string {
  const v = value.trim();
  if (!v) return "Please enter your registered email or phone number.";
  const digits = v.replace(/\D/g, "");
  if (
    !EMAIL_RE.test(v) &&
    !(PHONE_RE.test(v) && digits.length >= 7 && digits.length <= 15)
  ) {
    return "Please enter a valid email address or phone number.";
  }
  return "";
}

/**
 * /forgot-password — step 1 of recovery: request a verification code via
 * registered email OR phone. Step 2 (code entry + new password) lives on
 * /reset-password.
 */
export default function ForgotPassword() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const { toast } = useToast();

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateIdentifier(identifier);
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
      // Hand the context to /reset-password without exposing it in the URL.
      try {
        sessionStorage.setItem(
          RESET_REQUEST_KEY,
          JSON.stringify({
            identifier: identifier.trim(),
            channel: res.data?.channel,
            deliveredTo: res.data?.deliveredTo,
            smsFallback: !!res.data?.smsFallback,
            expiresIn: Number(res.data?.expiresIn) || 300,
          } satisfies ResetRequestInfo)
        );
      } catch {
        // storage unavailable — /reset-password will just ask to restart
      }
      toast("A verification code has been sent", "success");
      router.push("/reset-password");
    } catch (err) {
      const msg = getErrorMessage(err);
      setFieldError(msg);
      toast("Could not send verification code", "error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your registered email address or phone number. We&apos;ll send
          you a verification code, then generate a new letters-only password
          for you on the next page.
        </p>
      </div>

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
          className="w-full bg-brand text-white font-bold py-3 rounded-full hover:bg-x-blue-hover"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Sending code...
            </>
          ) : (
            "Send verification code"
          )}
        </Button>
      </form>

      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground space-y-1.5">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <KeyRound className="h-4 w-4 text-brand shrink-0" />
          How recovery works
        </p>
        <p>We generate a secure password using letters only (A–Z, a–z).</p>
        <p>You can regenerate it before confirming.</p>
        <p>For security, you can request a recovery code once per day.</p>
      </div>

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
