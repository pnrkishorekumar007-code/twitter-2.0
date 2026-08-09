"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import axiosInstance from "../lib/axiosInstance";
import { LangCode, translations } from "../lib/translations";

interface LanguageContextType {
  lang: LangCode;
  t: (key: string) => string;
  requestLanguageOtp: (target: LangCode) => Promise<{ channel: string }>;
  verifyLanguageOtp: (target: LangCode, code: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [lang, setLang] = useState<LangCode>("en");

  useEffect(() => {
    if (user && (user as any).preferredLanguage) {
      setLang((user as any).preferredLanguage);
    } else {
      const saved = typeof window !== "undefined" ? localStorage.getItem("twiller-lang") : null;
      if (saved) setLang(saved as LangCode);
    }
  }, [user]);

  const t = (key: string) => translations[lang]?.[key] ?? translations.en[key] ?? key;

  const requestLanguageOtp = async (target: LangCode) => {
    if (!user) throw new Error("Log in first");
    const res = await axiosInstance.post("/language/otp/request", {
      email: (user as any).email,
      targetLanguage: target,
    });
    return res.data;
  };

  const verifyLanguageOtp = async (target: LangCode, code: string) => {
    if (!user) throw new Error("Log in first");
    const res = await axiosInstance.post("/language/otp/verify", {
      email: (user as any).email,
      code,
      targetLanguage: target,
    });
    if (res.data) {
      setLang(target);
      localStorage.setItem("twiller-lang", target);
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, t, requestLanguageOtp, verifyLanguageOtp }}>
      {children}
    </LanguageContext.Provider>
  );
};
