"use client";
import { useI18n } from "@/lib/i18n";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <button
      aria-label="toggle language"
      onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-fg hover:bg-surface-2"
    >
      <Languages size={15} />
      {locale === "zh-CN" ? "中" : "EN"}
    </button>
  );
}
