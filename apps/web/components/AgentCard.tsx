"use client";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { ProviderBadge, StatusBadge, ActionTag } from "@/components/ui/Badge";
import { OptionExposureGauge } from "@/components/OptionExposureGauge";
import { fmtPct, fmtUsd, cn } from "@/lib/utils";

export function AgentCard({ agent }: { agent: any }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const acct = agent.account || {};
  const daily = acct.daily_pnl ?? 0;
  const totalReturn = acct.equity ? ((acct.equity - 10000) / 10000) * 100 : 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <Link href={`/agents/${agent.id}`} className="flex items-center gap-2 hover:underline">
          <ProviderBadge provider={agent.provider} name={agent.name} />
        </Link>
        <StatusBadge status={agent.status} />
      </div>
      <p className="mt-1 font-mono text-[11px] text-muted">{agent.model}</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-muted">{t("metric.currentEquity")}</p>
          <p className="text-lg font-semibold tnum">{fmtUsd(acct.equity)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted">{t("metric.dailyPnl")}</p>
          <p className={cn("text-lg font-semibold tnum", daily >= 0 ? "text-emerald-500" : "text-rose-500")}>{fmtUsd(daily)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted">{t("leaderboard.totalReturn")}</p>
          <p className={cn("text-sm font-medium tnum", totalReturn >= 0 ? "text-emerald-500" : "text-rose-500")}>{fmtPct(totalReturn)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted">{t("metric.maxDrawdown")}</p>
          <p className="text-sm font-medium tnum text-amber-500">{fmtPct(-(acct.drawdown_pct ?? 0) * 100)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted">
        <span>{t("metric.positions")}: <b className="text-fg tnum">{acct.open_positions ?? 0}</b></span>
        <span>{t("metric.orders")}: <b className="text-fg tnum">{agent.open_orders ?? 0}</b></span>
        {agent.last_action && <ActionTag action={agent.last_action} />}
      </div>

      <div className="mt-3">
        <OptionExposureGauge pct={(acct.option_exposure_pct ?? 0) * 100} />
      </div>

      <button
        onClick={async () => { await api.runAgentNow(agent.id); qc.invalidateQueries(); }}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-medium hover:bg-surface-2"
      >
        <Play size={13} /> {t("actions.runNow")}
      </button>
    </Card>
  );
}
