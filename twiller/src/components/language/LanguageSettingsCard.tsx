"use client";

import React, { useState } from "react";
import { Check, Globe, Loader2 } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import OtpModal from "../otp/OtpModal";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { LANGUAGES, LangCode } from "@/lib/translations";
import { getErrorMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Language settings card (profile → settings).
 *
 * Switching to French verifies with an email OTP; every other language verifies
 * with a "mobile" OTP. Only after the single-use code is verified does the
 * preference update (via the backend's token-gated /language/change flow).
 */
export default function LanguageSettingsCard() {
  const { user } = useAuth();
  const { lang, t, requestLanguageOtp, verifyLanguageOtp } = useLanguage();

  const [pending, setPending] = useState<LangCode | null>(null);
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [deliveredTo, setDeliveredTo] = useState<"email" | "sms" | undefined>(undefined);
  const [devCode, setDevCode] = useState<string | undefined>(undefined);
  const [resendAfterSec, setResendAfterSec] = useState(60);
  const [modalOpen, setModalOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (code: LangCode) => {
    if (code === lang) return;
    setSuccess(null);
    setError(null);
    setRequesting(true);
    try {
      const res = await requestLanguageOtp(code);
      setPending(code);
      setChannel(res.channel === "email" ? "email" : "sms");
      setDeliveredTo(res.deliveredTo === "sms" ? "sms" : "email");
      setDevCode(res.devCode);
      setResendAfterSec(res.resendAfterSec ?? 60);
      setModalOpen(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRequesting(false);
    }
  };

  const handleResend = async () => {
    if (!pending) return;
    setError(null);
    try {
      const res = await requestLanguageOtp(pending);
      setChannel(res.channel === "email" ? "email" : "sms");
      setDeliveredTo(res.deliveredTo === "sms" ? "sms" : "email");
      setDevCode(res.devCode);
      setResendAfterSec(res.resendAfterSec ?? 60);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleVerify = async (code: string) => {
    if (!pending) return;
    await verifyLanguageOtp(pending, code);
    setSuccess(t("lang_success"));
  };

  const currentLabel = LANGUAGES.find((l) => l.code === lang)?.label ?? lang;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-brand/15">
            <Globe className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="text-foreground font-semibold">{t("language_title")}</p>
            <p className="text-muted-foreground text-sm">{t("language_desc")}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm">
            <p className="text-muted-foreground">{t("current_language")}</p>
            <p className="text-foreground font-semibold flex items-center gap-2">
              {currentLabel}
              <Check className="h-4 w-4 text-emerald-500" />
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={requesting}
                className="rounded-full"
              >
                {requesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                {t("language")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl p-1.5">
              {LANGUAGES.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  className={cn(
                    "rounded-xl py-2",
                    l.code === lang && "font-bold text-brand"
                  )}
                  onClick={() => handleSelect(l.code)}
                >
                  {l.label}
                  {l.code === lang && <Check className="ml-2 h-4 w-4 text-brand" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-muted-foreground text-xs">
          {t("language_desc")} {user?.email ? `(${user.email})` : ""}
        </p>

        {success && <p className="text-emerald-600 dark:text-emerald-400 text-sm">{success}</p>}
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </CardContent>

      {pending && (
        <OtpModal
          open={modalOpen}
          title={t("language_switch_verify")}
          description={(deliveredTo ?? channel) === "email" ? t("otp_channel_email") : t("otp_channel_sms")}
          devCode={devCode}
          onVerify={handleVerify}
          onResend={handleResend}
          resendCooldownSec={resendAfterSec}
          onClose={() => setModalOpen(false)}
        />
      )}
    </Card>
  );
}
