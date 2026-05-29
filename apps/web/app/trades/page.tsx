"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, EmptyState } from "@/components/ui/Card";
import { ProviderBadge } from "@/components/ui/Badge";
import { fmtUsd, cn } from "@/lib/utils";

export default function TradesPage() {
  const { t } = useI18n();
  const { data } = useQuery({ queryKey: ["trades"], queryFn: api.trades });
  const closed = data?.filter((tr) => tr.closed_at);

  return (
    <div>
      <PageHeader title={t("nav.trades")} />
      <Card>
        <CardBody>
          {!closed?.length ? <EmptyState title={t("common.empty")} /> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted">
                <th className="py-2">Agent</th><th className="py-2">{t("positions.symbol")}</th>
                <th className="py-2 text-right">{t("positions.qty")}</th><th className="py-2 text-right">Entry</th>
                <th className="py-2 text-right">Exit</th><th className="py-2 text-right">PnL</th><th className="py-2">Reason</th>
              </tr></thead>
              <tbody>{closed.map((tr, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="py-2"><ProviderBadge provider={tr.agent_id} /></td>
                  <td className="py-2 font-medium">{tr.symbol}</td>
                  <td className="py-2 text-right tnum">{tr.quantity}</td>
                  <td className="py-2 text-right tnum">{fmtUsd(tr.entry_price)}</td>
                  <td className="py-2 text-right tnum">{fmtUsd(tr.exit_price)}</td>
                  <td className={cn("py-2 text-right tnum", tr.realized_pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>{fmtUsd(tr.realized_pnl)}</td>
                  <td className="py-2 text-xs text-muted">{tr.reason_closed}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
