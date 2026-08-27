"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import axiosInstance from "../lib/axiosInstance";
import { LangCode, translations, LANGUAGES } from "../lib/translations";
import { translationsExtra } from "../lib/translationsExtra";

interface LanguageContextType {
  lang: LangCode;
  t: (key: string) => string;
  requestLanguageOtp: (
    target: LangCode
  ) => Promise<{ channel: string; deliveredTo?: string; resendAfterSec?: number }>;
  verifyLanguageOtp: (target: LangCode, code: string) => Promise<boolean>;
  getCurrentLanguage: () => Promise<LangCode | undefined>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

const VALID_CODES = new Set<string>(LANGUAGES.map((l) => l.code));

function isValidLangCode(v: string | null): v is LangCode {
  return v !== null && VALID_CODES.has(v);
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [lang, setLang] = useState<LangCode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("twiller-lang");
      if (isValidLangCode(saved)) return saved;
    }
    return "en";
  });

  // Pick up the persisted server preference immediately when the signed-in
  // user changes (React's "adjust state during render" pattern).
  const [lastUser, setLastUser] = useState(user);
  if (user !== lastUser) {
    setLastUser(user);
    if (user?.preferredLanguage && isValidLangCode(user.preferredLanguage)) {
      setLang(user.preferredLanguage);
    } else {
      const saved = typeof window !== "undefined" ? localStorage.getItem("twiller-lang") : null;
      if (isValidLangCode(saved)) setLang(saved);
    }
  }

  // Reconcile with the authoritative server value once per session (GET
  // /language/current). Guarantees the persisted preference wins after
  // refresh/new session even if localStorage was cleared.
  //
  // A locally-made switch must never be clobbered by a slow in-flight server
  // sync (the GET can resolve AFTER the user already switched). localOverrideRef
  // is set on every successful switch, and once set it wins for this session.
  const [syncedEmail, setSyncedEmail] = useState<string | null>(null);
  const localOverrideRef = useRef(false);
  const email = user?.email;
  useEffect(() => {
    if (!email || syncedEmail === email) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axiosInstance.get("/language/current");
        const serverLang = res.data?.preferredLanguage as LangCode | undefined;
        if (
          !cancelled &&
          serverLang &&
          isValidLangCode(serverLang) &&
          !localOverrideRef.current
        ) {
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

  const t = useCallback(
    (key: string) =>
      translationsExtra[lang]?.[key] ??
      translationsExtra.en?.[key] ??
      translations[lang]?.[key] ??
      translations.en[key] ??
      key,
    [lang],
  );

  // Keep the document in sync with the active language so the browser and the
  // CSS (see globals.css) can adapt: <html lang> for screen readers/translators,
  // data-lang to trigger script-appropriate fonts, sizing and line-height.
  // The language-specific font class is applied to <body> so it covers the
  // entire page without an extra wrapper <div> that could break flex/grid layouts.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.lang = lang;
    html.dir = "ltr";
    html.setAttribute("data-lang", lang);

    // Remove all previous lang-* classes from body, then add the current one.
    body.classList.forEach((cls) => {
      if (cls.startsWith("lang-")) body.classList.remove(cls);
    });
    body.classList.add("lang-font", `lang-${lang}`);
  }, [lang]);

  // POST /language/request-otp — French → email OTP, everything else → mobile.
  // `deliveredTo` reports where the code actually went (email fallback is used
  // when no SMS provider is configured), so the UI can say the right thing.
  const requestLanguageOtp = async (target: LangCode) => {
    if (!user) throw new Error("Log in first");
    const res = await axiosInstance.post("/language/request-otp", {
      targetLanguage: target,
    });
    return res.data as {
      channel: string;
      deliveredTo?: string;
      resendAfterSec?: number;
    };
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

    // The token is valid for 10 minutes, so a transient failure on the change
    // request is retried once rather than forcing the user to re-request a code.
    let lastErr: unknown;
    try {
      await axiosInstance.put("/language/change", {
        targetLanguage: target,
        languageToken,
      });
    } catch (firstErr) {
      lastErr = firstErr;
      try {
        await axiosInstance.put("/language/change", {
          targetLanguage: target,
          languageToken,
        });
        lastErr = undefined;
      } catch (secondErr) {
        lastErr = secondErr;
      }
    }

    // If we fell through the catch without succeeding, throw the last error.
    if (lastErr) throw lastErr;

    localOverrideRef.current = true;
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
