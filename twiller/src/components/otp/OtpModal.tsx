"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { getErrorMessage } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

interface OtpModalProps {
  open: boolean;
  title: string;
  description: string;
  onVerify: (code: string) => Promise<void>;
  onClose: () => void;
  /** When provided, a "Resend code" button with countdown is shown. */
  onResend?: () => Promise<void>;
  resendCooldownSec?: number;
}

export default function OtpModal({
  open,
  title,
  description,
  onVerify,
  onClose,
  onResend,
  resendCooldownSec = 60,
}: OtpModalProps) {
  const { t } = useLanguage();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(onResend ? resendCooldownSec : 0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start the resend countdown from scratch each time the modal opens
  // or the cooldown duration changes (adjusting state during render, per React docs).
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevCooldown, setPrevCooldown] = useState(resendCooldownSec);
  if (prevOpen !== open || prevCooldown !== resendCooldownSec) {
    setPrevOpen(open);
    setPrevCooldown(resendCooldownSec);
    if (open) setCountdown(resendCooldownSec);
  }

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !onResend) {
      return () => {
        if (resendTimerRef.current !== null) clearInterval(resendTimerRef.current);
      };
    }
  }, [open, onResend]);

  useEffect(() => {
    if (countdown <= 0) {
      if (resendTimerRef.current !== null) clearInterval(resendTimerRef.current);
      return;
    }
    resendTimerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (resendTimerRef.current !== null) clearInterval(resendTimerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (resendTimerRef.current !== null) clearInterval(resendTimerRef.current);
    };
  }, [countdown]);

  if (!open) return null;

  const handleVerify = async () => {
    setLoading(true);
    setError("");
    try {
      await onVerify(code);
      setCode("");
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Verification failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!onResend || countdown > 0) return;
    setResending(true);
    setError("");
    try {
      await onResend();
      setCode("");
      setCountdown(resendCooldownSec);
    } catch (err) {
      setError(getErrorMessage(err, "Could not resend code"));
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-start sm:items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm my-auto max-h-[90dvh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-foreground text-xl font-bold mb-1">{title}</h3>
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder={t("otp_placeholder")}
          maxLength={6}
          className="mb-2 text-foreground"
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        {onResend && (
          <div className="mb-2">
            <button
              type="button"
              disabled={countdown > 0 || resending}
              onClick={handleResend}
              className="text-brand text-sm hover:underline disabled:text-muted-foreground/60 disabled:no-underline"
            >
              {resending
                ? t("otp_sending")
                : countdown > 0
                ? `${t("otp_resend_in")} ${countdown}s`
                : t("otp_resend")}
            </button>
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t("otp_cancel")}
          </Button>
          <Button
            className="flex-1 bg-brand hover:bg-brand/90"
            disabled={loading || code.length !== 6}
            onClick={handleVerify}
          >
            {loading ? t("otp_verifying") : t("otp_verify")}
          </Button>
        </div>
      </div>
    </div>
  );
}
