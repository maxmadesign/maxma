"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, CardHeader, CardBody, Skeleton } from "@/components/ui/Card";
import { ProviderBadge, StatusBadge, ActionTag } from "@/components/ui/Badge";
import { CandlestickChart } from "@/components/CandlestickChart";
import { DecisionLogDrawer } from "@/components/DecisionLogDrawer";
import { fmtPct, fmtUsd, cn } from "@/lib/utils";

const TABS = ["Overview", "Decisions", "Trades", "Positions", "Risk", "Settings"];

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { t } = useI18n();
  const [tab, setTab] = useState("Overview");
  const [selected, setSelected] = useState<any>(null);

  const { data: agent, isLoading } = useQuery({ queryKey: ["agent", agentId], queryFn: () => api.agent(agentId) });
  const { data: bars } = useQuery({ queryKey: ["bars", "SPY"], queryFn: () => api.bars("SPY", "5m") });
  const { data: decisions } = useQuery({ queryKey: ["agent-decisions", agentId], queryFn: () => api.agentDecisions(agentId) });

  if (isLoading || !agent) return <Skeleton className="h-96 w-full" />;
  const acct = agent.account || {};
  const totalReturn = acct.equity ? ((acct.equity - 10000) / 10000) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* header */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ProviderBadge provider={agent.provider} name={agent.name} />
            <span className="font-mono text-xs text-muted">{agent.model}</span>
            <StatusBadge status={agent.status} />
          </div>
          <div className="flex gap-6 text-sm">
            <Stat label={t("metric.currentEquity")} value={fmtUsd(acct.equity)} />
            <Stat label={t("leaderboard.totalReturn")} value={fmtPct(totalReturn)} tone={totalReturn} />
            <Stat label={t("metric.dailyPnl")} value={fmtUsd(acct.daily_pnl)} tone={acct.daily_pnl} />
            <Stat label={t("metric.maxDrawdown")} value={fmtPct(-(acct.drawdown_pct ?? 0) * 100)} />
          </div>
        </div>
      </Card>

      {/* tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)}
            className={cn("border-b-2 px-3 py-2 text-sm", tab === tb ? "border-accent font-medium text-accent" : "border-transparent text-muted hover:text-fg")}>
            {tb}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <Card>
          <CardHeader title={t("nav.market")} subtitle="SPY · 5m · VWAP / EMA20 / EMA50 / 买卖点" />
          <CardBody>{bars?.length ? <CandlestickChart bars={bars} /> : <Skeleton className="h-96 w-full" />}</CardBody>
        </Card>
      )}

      {tab === "Decisions" && (
        <Card>
          <CardHeader title={t("nav.decisions")} />
          <CardBody className="space-y-2">
            {decisions?.map((d) => (
              <button key={d.id} onClick={() => setSelected(d)} className="block w-full rounded-xl border border-border p-3 text-left hover:bg-surface-2">
                <div className="flex items-center gap-2">
                  {d.valid ? <ActionTag action={d.overall_action} /> : <ActionTag action="hold" label="INVALID" />}
                  <span className="text-[11px] text-muted">{new Date(d.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-fg/80">{d.summary || d.error}</p>
              </button>
            ))}
          </CardBody>
        </Card>
      )}

      {tab === "Positions" && (
        <Card>
          <CardHeader title={t("positions.title")} />
          <CardBody>
            {agent.positions?.length ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted"><th className="py-2">{t("positions.symbol")}</th><th className="py-2 text-right">{t("positions.qty")}</th><th className="py-2 text-right">{t("positions.avg")}</th><th className="py-2 text-right">{t("positions.price")}</th></tr></thead>
                <tbody>{agent.positions.map((p: any, i: number) => (
                  <tr key={i} className="border-t border-border/60"><td className="py-2 font-medium">{p.symbol}</td><td className="py-2 text-right tnum">{p.quantity}</td><td className="py-2 text-right tnum">{fmtUsd(p.avg_price)}</td><td className="py-2 text-right tnum">{fmtUsd(p.current_price)}</td></tr>
                ))}</tbody>
              </table>
            ) : <p className="text-sm text-muted">{t("positions.empty")}</p>}
          </CardBody>
        </Card>
      )}

      {(tab === "Trades" || tab === "Risk" || tab === "Settings") && (
        <Card><CardBody><p className="text-sm text-muted">{tab}: 行为画像、风控版本、Prompt 版本等详情见各专用页面。</p></CardBody></Card>
      )}

      <DecisionLogDrawer decision={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: number }) {
  const c = tone === undefined ? "" : tone >= 0 ? "text-emerald-500" : "text-rose-500";
  return <div><p className="text-[11px] text-muted">{label}</p><p className={cn("font-semibold tnum", c)}>{value}</p></div>;
}
