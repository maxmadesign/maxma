"use client";
import Link from "next/link";
import { KeyRound, Database, SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/PageHeader";

export default function SettingsPage() {
  const { t } = useI18n();
  const items = [
    { href: "/settings/providers", title: t("settings.providers"), icon: KeyRound, desc: "OpenAI · Anthropic · Gemini · DeepSeek" },
    { href: "/settings/market-data", title: t("settings.marketData"), icon: Database, desc: "Synthetic / Replay / Watchlist" },
    { href: "/settings/advanced", title: t("settings.advanced"), icon: SlidersHorizontal, desc: "Export · Import · Reset" },
  ];
  return (
    <div>
      <PageHeader title={t("settings.title")} subtitle={t("common.disclaimer")} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map(({ href, title, icon: Icon, desc }) => (
          <Link key={href} href={href}>
            <Card className="p-5 transition-colors hover:bg-surface-2">
              <Icon className="text-accent" size={22} />
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-xs text-muted">{desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
