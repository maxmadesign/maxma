"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { dictionaries, type Locale } from "@pkg/i18n";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (path: string) => string };
const I18nContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "tradepilot.locale";

function resolve(dict: any, path: string): string {
  const v = path.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), dict);
  return typeof v === "string" ? v : path;
}

export function I18nProvider({ children, defaultLocale = "zh-CN" as Locale }: { children: React.ReactNode; defaultLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) as Locale | null;
    if (saved && (saved === "zh-CN" || saved === "en-US")) setLocaleState(saved);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (path: string) => resolve(dictionaries[locale], path);
  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
