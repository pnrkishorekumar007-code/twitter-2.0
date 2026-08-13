"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import axiosInstance from "../lib/axiosInstance";
import { LangCode, translations, LANGUAGES } from "../lib/translations";

interface LanguageContextType {
  lang: LangCode;
  t: (key: string) => string;
  requestLanguageOtp: (
    target: LangCode
  ) => Promise<{ channel: string; devCode?: string; resendAfterSec?: number }>;
  verifyLanguageOtp: (target: LangCode, code: string) => Promise<boolean>;
  getCurrentLanguage: () => Promise<LangCode | undefined>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [lang, setLang] = useState<LangCode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("twiller-lang");
      if (saved) return saved as LangCode;
    }
    return "en";
  });

  // Pick up the persisted server preference immediately when the signed-in
  // user changes (React's "adjust state during render" pattern).
  const [lastUser, setLastUser] = useState(user);
  if (user !== lastUser) {
    setLastUser(user);
    if (user?.preferredLanguage) {
      setLang(user.preferredLanguage as LangCode);
    } else {
      const saved = typeof window !== "undefined" ? localStorage.getItem("twiller-lang") : null;
      if (saved) setLang(saved as LangCode);
    }
  }

  // Reconcile with the authoritative server value once per session (GET
  // /language/current). Guarantees the persisted preference wins after
  // refresh/new session even if localStorage was cleared.
  const [syncedEmail, setSyncedEmail] = useState<string | null>(null);
  const email = user?.email;
  useEffect(() => {
    if (!email || syncedEmail === email) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axiosInstance.get("/language/current");
        const serverLang = res.data?.preferredLanguage as LangCode | undefined;
        if (!cancelled && serverLang && LANGUAGES.some((l) => l.code === serverLang)) {
          setLang(serverLang);
        }
      } catch {
        // Token may not be ready yet — the in-render reconciliation above
        // (user.preferredLanguage) already covers the normal case.
      } finally {
        if (!cancelled) setSyncedEmail(email);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email, syncedEmail]);

  const t = (key: string) => translations[lang]?.[key] ?? translations.en[key] ?? key;

  // POST /language/request-otp — French → email OTP, everything else → mobile.
  const requestLanguageOtp = async (target: LangCode) => {
    if (!user) throw new Error("Log in first");
    const res = await axiosInstance.post("/language/request-otp", {
      targetLanguage: target,
    });
    return res.data as { channel: string; devCode?: string; resendAfterSec?: number };
  };

  // POST /language/verify-otp → short-lived language-change token, then
  // PUT /language/change. The language only updates after the OTP is verified.
  const verifyLanguageOtp = async (target: LangCode, code: string): Promise<boolean> => {
    if (!user) throw new Error("Log in first");
    const verify = await axiosInstance.post("/language/verify-otp", {
      targetLanguage: target,
      code,
    });
    const languageToken = verify.data?.languageToken;
    if (!languageToken) throw new Error("Verification failed. Please try again.");

    await axiosInstance.put("/language/change", {
      targetLanguage: target,
      languageToken,
    });

    setLang(target);
    localStorage.setItem("twiller-lang", target);
    return true;
  };

  // GET /language/current — the persisted preference.
  const getCurrentLanguage = async (): Promise<LangCode | undefined> => {
    const res = await axiosInstance.get("/language/current");
    return res.data?.preferredLanguage as LangCode | undefined;
  };

  return (
    <LanguageContext.Provider
      value={{ lang, t, requestLanguageOtp, verifyLanguageOtp, getCurrentLanguage }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
