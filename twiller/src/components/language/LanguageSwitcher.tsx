"use client";

import React, { useState } from "react";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useLanguage } from "@/context/LanguageContext";
import { LANGUAGES, LangCode } from "@/lib/translations";
import OtpModal from "../otp/OtpModal";

export default function LanguageSwitcher() {
  const { lang, t, requestLanguageOtp, verifyLanguageOtp } = useLanguage();
  const [pending, setPending] = useState<LangCode | null>(null);
  const [channel, setChannel] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const handleSelect = async (code: LangCode) => {
    if (code === lang) return;
    try {
      const res = await requestLanguageOtp(code);
      setPending(code);
      setChannel(res.channel);
      setModalOpen(true);
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 text-white hover:bg-gray-900 rounded-full px-3 py-2">
            <Globe className="h-5 w-5" />
            <span className="hidden md:inline">{t("language")}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-black border-gray-800">
          {LANGUAGES.map((l) => (
            <DropdownMenuItem
              key={l.code}
              className={`text-white hover:bg-gray-900 ${l.code === lang ? "font-bold" : ""}`}
              onClick={() => handleSelect(l.code)}
            >
              {l.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {pending && (
        <OtpModal
          open={modalOpen}
          title="Verify to switch language"
          description={`We sent a code via ${channel === "email" ? "email" : "your registered mobile number"}.`}
          onVerify={async (code) => {
            await verifyLanguageOtp(pending, code);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
