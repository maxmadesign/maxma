"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, CardHeader, Skeleton } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const INDEXES = ["SPY", "QQQ", "IWM"];

export function MarketOverview() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["market-snapshot"], queryFn: api.marketSnapshot });

  return (
    <Card>
      <CardHeader title={t("market.overview")} action={<RegimeTag regime={data?.regime} />} />
      <div className="grid grid-cols-3 gap-3 p-4">
        {isLoading ? INDEXES.map((s) => <Skeleton key={s} className="h-20" />) : INDEXES.map((s) => {
          const sym = data?.symbols?.[s];
          const price = sym?.price ?? 0;
          const vwap = sym?.indicators?.vwap ?? price;
          const aboveVwap = price >= vwap;
          return (
            <div key={s} className="rounded-xl border border-border bg-surface-2/40 p-3">
              <p className="text-xs font-semibold">{s}</p>
              <p className="mt-1 text-lg font-semibold tnum">{price.toFixed(2)}</p>
              <p className={cn("text-[11px] font-medium", aboveVwap ? "text-emerald-500" : "text-rose-500")}>
                {aboveVwap ? "▲" : "▼"} {t("market.regime")} VWAP
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RegimeTag({ regime }: { regime?: string }) {
  const { t } = useI18n();
  if (!regime) return null;
  const color: Record<string, string> = {
    risk_on: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    risk_off: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    mixed: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    uncertain: "bg-slate-500/12 text-slate-500",
  };
  return <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", color[regime])}>{t(`regime.${regime}`)}</span>;
}
