"use client";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Trophy, TrendingDown, Activity, Bot, Brain, ShieldX } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { MetricCard } from "@/components/MetricCard";
import { fmtUsd } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Card";

export function HeroMetrics() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["metrics"], queryFn: api.metrics });

  if (isLoading) return <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">{[...Array(7)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      <MetricCard label={t("hero.totalEquity")} value={fmtUsd(data?.total_equity)} icon={<Wallet size={15} />} />
      <MetricCard label={t("hero.bestAgent")} value={<span className="text-emerald-500">{data?.best_agent ?? "—"}</span>} icon={<Trophy size={15} />} />
      <MetricCard label={t("hero.worstDrawdown")} value={<span className="text-amber-500">{data?.max_drawdown_agent ?? "—"}</span>} icon={<TrendingDown size={15} />} />
      <MetricCard label={t("hero.todayPnl")} value={fmtUsd(data?.today_pnl)} tone={data?.today_pnl >= 0 ? "pos" : "neg"} icon={<Activity size={15} />} />
      <MetricCard label={t("hero.activeAgents")} value={data?.active_agents ?? 0} icon={<Bot size={15} />} />
      <MetricCard label={t("hero.decisionsToday")} value={data?.decisions_today ?? 0} icon={<Brain size={15} />} />
      <MetricCard label={t("hero.riskRejections")} value={data?.risk_rejections_today ?? 0} icon={<ShieldX size={15} />} />
    </div>
  );
}
