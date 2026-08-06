"use client";

import React, { useState } from "react";
import { Languages, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import OtpModal from "./OtpModal";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { LANGUAGES } from "@/lib/translations";
import { consumeOtp } from "@/lib/otp";

interface LanguageSwitcherProps {
  compact?: boolean;
  variant?: "sidebar" | "inline";
}

export default function LanguageSwitcher({
  compact = false,
  variant = "sidebar",
}: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const [pendingLang, setPendingLang] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const [channel, setChannel] = useState<"email" | "phone">("email");

  const currentLang =
    LANGUAGES.find((l) => l.code === language)?.label || "English";

  const handleSelect = (code: (typeof LANGUAGES)[number]["code"]) => {
    if (code === language) return;
    if (!user) {
      setLanguage(code);
      return;
    }
    const targetValue = user.phone || "";
    if (code === "fr") {
      setTarget(user.email || "");
      setChannel("email");
    } else {
      setTarget(targetValue);
      setChannel("phone");
    }
    setPendingLang(code);
  };

  const handleVerify = (otp: string): boolean => {
    if (pendingLang) {
      setLanguage(pendingLang as (typeof LANGUAGES)[number]["code"]);
      consumeOtp();
      setPendingLang(null);
      return true;
    }
    return false;
  };

  if (variant === "inline") {
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`flex items-center justify-between px-3 py-3 rounded-lg border text-sm font-semibold transition-colors ${
                lang.code === language
                  ? "border-blue-500 bg-blue-500/10 text-white"
                  : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
              }`}
            >
              <span className="truncate">
                {lang.native} · {lang.label}
              </span>
              {lang.code === language && (
                <Check className="h-4 w-4 text-blue-400 shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
        <OtpModal
          isOpen={Boolean(pendingLang)}
          onClose={() => {
            setPendingLang(null);
            consumeOtp();
          }}
          target={target}
          channel={channel}
          title={t("settings.switchOtpTitle")}
          subtitle={t("settings.switchOtpText").replace(
            "{target}",
            channel === "email" ? t("common.email") : t("common.phone")
          )}
          onVerify={handleVerify}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-center lg:justify-start text-xl py-3 lg:py-4 lg:px-4 rounded-full hover:bg-gray-900 text-white ${
              compact ? "lg:hidden" : "hidden lg:flex"
            }`}
          >
            <Languages className="h-6 w-6 lg:h-7 lg:w-7 lg:mr-4" />
            <span className="hidden lg:inline">{currentLang}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-black border-gray-800">
          <DropdownMenuLabel className="text-gray-400">
            {t("settings.language")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-800" />
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              className="text-white hover:bg-gray-900"
              onClick={() => handleSelect(lang.code)}
            >
              <span className="flex-1">
                {lang.native} ({lang.label})
              </span>
              {lang.code === language && (
                <Check className="h-4 w-4 text-blue-400" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <OtpModal
        isOpen={Boolean(pendingLang)}
        onClose={() => {
          setPendingLang(null);
          consumeOtp();
        }}
        target={target}
        channel={channel}
        title={t("settings.switchOtpTitle")}
        subtitle={t("settings.switchOtpText").replace(
          "{target}",
          channel === "email" ? t("common.email") : t("common.phone")
        )}
        onVerify={handleVerify}
      />
    </>
  );
}
