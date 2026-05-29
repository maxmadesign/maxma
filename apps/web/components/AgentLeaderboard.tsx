"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, CardHeader, Skeleton } from "@/components/ui/Card";
import { ProviderBadge, StatusBadge } from "@/components/ui/Badge";
import { fmtPct, fmtUsd, cn } from "@/lib/utils";
import Link from "next/link";

export function AgentLeaderboard() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["leaderboard"], queryFn: api.leaderboard });

  return (
    <Card>
      <CardHeader title={t("leaderboard.title")} />
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="space-y-2 p-5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">{t("leaderboard.rank")}</th>
                <th className="px-4 py-2.5 font-medium">{t("leaderboard.name")}</th>
                <th className="px-4 py-2.5 font-medium">{t("leaderboard.model")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("leaderboard.equity")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("leaderboard.totalReturn")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("leaderboard.todayPnl")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("leaderboard.maxDrawdown")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("leaderboard.winRate")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("leaderboard.profitFactor")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("leaderboard.trades")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("leaderboard.optionExposure")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("leaderboard.violations")}</th>
                <th className="px-4 py-2.5 text-center font-medium">{t("leaderboard.status")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("leaderboard.score")}</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((r) => (
                <tr key={r.agent_id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3 font-semibold tnum">#{r.rank}</td>
                  <td className="px-4 py-3">
                    <Link href={`/agents/${r.agent_id}`} className="flex items-center gap-2 hover:underline">
                      <ProviderBadge provider={r.provider} name={r.name} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{r.model}</td>
                  <td className="px-4 py-3 text-right tnum">{fmtUsd(r.equity)}</td>
                  <td className={cn("px-4 py-3 text-right tnum", r.total_return_pct >= 0 ? "text-emerald-500" : "text-rose-500")}>{fmtPct(r.total_return_pct)}</td>
                  <td className={cn("px-4 py-3 text-right tnum", r.daily_pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>{fmtUsd(r.daily_pnl)}</td>
                  <td className="px-4 py-3 text-right tnum text-amber-500">{fmtPct(-r.max_drawdown_pct)}</td>
                  <td className="px-4 py-3 text-right tnum">{r.win_rate}%</td>
                  <td className="px-4 py-3 text-right tnum">{r.profit_factor ?? "∞"}</td>
                  <td className="px-4 py-3 text-right tnum">{r.total_trades}</td>
                  <td className="px-4 py-3 text-right tnum text-violet-500">{r.option_exposure_pct}%</td>
                  <td className={cn("px-4 py-3 text-right tnum", r.risk_violations > 0 ? "text-rose-500" : "text-muted")}>{r.risk_violations}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-right font-semibold tnum">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
