"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardBody, EmptyState } from "@/components/ui/Card";
import { RiskBadge, ProviderBadge } from "@/components/ui/Badge";
import { RiskOverview } from "@/components/RiskOverview";

export default function RiskPage() {
  const { t } = useI18n();
  const { data: events } = useQuery({ queryKey: ["risk-events"], queryFn: api.riskEvents });
  const { data: status } = useQuery({ queryKey: ["risk-status"], queryFn: api.riskStatus });

  return (
    <div className="space-y-5">
      <PageHeader title={t("nav.risk")} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1"><RiskOverview /></div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title={t("risk.events")} />
            <CardBody className="space-y-2">
              {!events?.length ? <EmptyState title={t("common.empty")} /> : events.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <ProviderBadge provider={e.agent_id} />
                    <RiskBadge status={e.severity === "danger" ? "danger" : "warning"} label={e.rule} />
                    <span className="text-fg/80">{e.message}</span>
                  </div>
                  <span className="text-[11px] text-muted">{new Date(e.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
      {status?.settings && (
        <Card>
          <CardHeader title="风控参数 / Risk Settings" />
          <CardBody>
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3 lg:grid-cols-4">
              {Object.entries(status.settings).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface-2/50 px-3 py-2">
                  <p className="text-[11px] text-muted">{k}</p>
                  <p className="font-mono text-sm tnum">{String(v)}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
