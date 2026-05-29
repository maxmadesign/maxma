"use client";
import { useQuery } from "@tanstack/react-query";
import { api, API_BASE } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Download } from "lucide-react";

export default function ReportsPage() {
  const { t, locale } = useI18n();
  const { data } = useQuery({ queryKey: ["report", locale], queryFn: () => api.report(locale) });

  return (
    <div className="space-y-5">
      <PageHeader title={t("nav.reports")}
        action={<a href={`${API_BASE}/reports/simulation?lang=${locale}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2"><Download size={15} /> JSON</a>} />
      <Card>
        <CardHeader title={t("nav.reports")} subtitle={data?.disclaimer} />
        <CardBody className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label={t("hero.decisionsToday")} value={data?.total_decisions ?? 0} />
            <Stat label={t("leaderboard.trades")} value={data?.total_trades ?? 0} />
            <Stat label={t("risk.events")} value={data?.total_risk_events ?? 0} />
            <Stat label={t("risk.apiCost")} value={`$${data?.total_cost_usd ?? 0}`} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-surface-2/50 p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-semibold tnum">{value}</p></div>;
}
