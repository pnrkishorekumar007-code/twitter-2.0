"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { LANGUAGES, translations, type LanguageCode } from "@/lib/translations";

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  tf: (key: string, vars?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    const stored = localStorage.getItem("twiller-language");
    if (stored && LANGUAGES.some((l) => l.code === stored)) {
      setLanguageState(stored as LanguageCode);
    }
  }, []);

  const lookup = (key: string): string => {
    const dict = translations[language] || translations.en;
    const value = key.split(".").reduce<any>((acc, part) => acc?.[part], dict);
    return typeof value === "string" ? value : key;
  };

  const tf = (key: string, vars?: Record<string, string>) => {
    let str = lookup(key);
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replaceAll(`{${k}}`, v);
      });
    }
    return str;
  };

  const setLanguage = (lang: LanguageCode) => {
    localStorage.setItem("twiller-language", lang);
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: lookup, tf }}>
      {children}
    </LanguageContext.Provider>
  );
};
