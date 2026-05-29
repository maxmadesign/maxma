"use client";
import { useState } from "react";
import { Save } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/PageHeader";

const DEFAULT = "SPY,QQQ,IWM,AAPL,MSFT,NVDA,AMD,META,AMZN,TSLA,GOOGL,NFLX,AVGO";

export default function MarketDataSettingsPage() {
  const { t } = useI18n();
  const [watchlist, setWatchlist] = useState(DEFAULT);
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeader title={t("settings.marketData")} subtitle="默认使用合成行情，无需真实数据 key / Synthetic by default" />
      <Card>
        <CardHeader title={t("settings.watchlist")} />
        <CardBody>
          <textarea value={watchlist} onChange={(e) => { setWatchlist(e.target.value); setSaved(false); }}
            className="h-24 w-full resize-none rounded-lg border border-border bg-surface-2 p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-accent/40" />
          <button
            onClick={async () => {
              const symbols = watchlist.split(",").map((s) => s.trim()).filter(Boolean);
              await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/market/watchlist`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbols }),
              });
              setSaved(true);
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white">
            <Save size={15} /> {t("settings.save")}
          </button>
          {saved && <span className="ml-3 text-xs text-emerald-500">✓ {t("settings.save")}</span>}
        </CardBody>
      </Card>
    </div>
  );
}
