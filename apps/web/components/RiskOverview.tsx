"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, CardHeader } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/Badge";
import { fmtUsd } from "@/lib/utils";

export function RiskOverview() {
  const { t } = useI18n();
  const { data: risk } = useQuery({ queryKey: ["risk-status"], queryFn: api.riskStatus });
  const { data: cost } = useQuery({ queryKey: ["cost"], queryFn: api.cost });

  const status = risk?.kill_switch ? "kill_switch" : risk?.paused_agents?.length ? "warning" : "safe";

  return (
    <Card>
      <CardHeader title={t("risk.overview")} action={<RiskBadge status={status} label={t(status === "kill_switch" ? "risk.killSwitch" : status === "warning" ? "providerStatus.degraded" : "providerStatus.connected")} />} />
      <div className="space-y-2.5 p-4 text-sm">
        <Row label={t("risk.pausedAgents")} value={risk?.paused_agents?.length ?? 0} />
        <Row label={t("risk.rejectedOrders")} value={risk?.rejected_orders ?? 0} danger={(risk?.rejected_orders ?? 0) > 0} />
        <Row label={t("risk.apiCost")} value={fmtUsd(cost?.total_cost_usd, 4)} />
        <div>
          <div className="flex justify-between text-xs"><span className="text-muted">{t("risk.monthlyBudget")}</span><span className="tnum">{cost?.budget_used_pct ?? 0}%</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, cost?.budget_used_pct ?? 0)}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted tnum">{fmtUsd(cost?.total_cost_usd, 2)} / {fmtUsd(cost?.monthly_budget_usd, 0)}</p>
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value, danger }: { label: string; value: React.ReactNode; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={danger ? "font-medium text-rose-500 tnum" : "font-medium tnum"}>{value}</span>
    </div>
  );
}
