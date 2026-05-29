"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { AssetTypeBadge, ProviderBadge } from "@/components/ui/Badge";
import { fmtUsd, cn } from "@/lib/utils";

export function PositionsTable() {
  const { t } = useI18n();
  const { data } = useQuery({ queryKey: ["positions"], queryFn: api.positions });

  return (
    <Card>
      <CardHeader title={t("positions.title")} />
      <div className="overflow-x-auto p-1">
        {!data?.length ? (
          <div className="p-4"><EmptyState title={t("positions.empty")} /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="px-3 py-2">Agent</th>
                <th className="px-3 py-2">{t("positions.symbol")}</th>
                <th className="px-3 py-2 text-right">{t("positions.qty")}</th>
                <th className="px-3 py-2 text-right">{t("positions.avg")}</th>
                <th className="px-3 py-2 text-right">{t("positions.price")}</th>
                <th className="px-3 py-2 text-right">{t("positions.upnl")}</th>
                <th className="px-3 py-2 text-right">{t("positions.stop")}</th>
                <th className="px-3 py-2 text-right">{t("positions.target")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p, i) => {
                const upnl = (p.current_price - p.avg_price) * p.quantity * (p.multiplier || 1);
                return (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-3 py-2"><ProviderBadge provider={p.agent_id} /></td>
                    <td className="px-3 py-2"><div className="flex items-center gap-1.5"><span className="font-medium">{p.symbol}</span><AssetTypeBadge asset={p.asset_type} /></div></td>
                    <td className="px-3 py-2 text-right tnum">{p.quantity}</td>
                    <td className="px-3 py-2 text-right tnum">{fmtUsd(p.avg_price)}</td>
                    <td className="px-3 py-2 text-right tnum">{fmtUsd(p.current_price)}</td>
                    <td className={cn("px-3 py-2 text-right tnum", upnl >= 0 ? "text-emerald-500" : "text-rose-500")}>{fmtUsd(upnl)}</td>
                    <td className="px-3 py-2 text-right tnum text-muted">{p.stop_loss ? fmtUsd(p.stop_loss) : "—"}</td>
                    <td className="px-3 py-2 text-right tnum text-muted">{p.take_profit ? fmtUsd(p.take_profit) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
