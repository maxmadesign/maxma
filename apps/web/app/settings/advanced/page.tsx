"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, RotateCcw } from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDangerDialog } from "@/components/ConfirmDangerDialog";

export default function AdvancedSettingsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeader title={t("settings.advanced")} subtitle={t("common.disclaimer")} />

      <Card>
        <CardHeader title={t("actions.exportLogs")} />
        <CardBody className="flex flex-wrap gap-2">
          <a href={`${API_BASE}/export/trades.csv`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2"><Download size={15} /> trades.csv</a>
          <a href={`${API_BASE}/reports/simulation`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2"><Download size={15} /> report.json</a>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("sim.reset")} subtitle="导出后再重置，所有重置都需要确认 / Export first; reset requires confirmation" />
        <CardBody>
          <button onClick={() => setConfirmReset(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-2 text-sm text-rose-500 hover:bg-rose-500/10">
            <RotateCcw size={15} /> {t("sim.reset")}
          </button>
        </CardBody>
      </Card>

      <ConfirmDangerDialog
        open={confirmReset}
        title={t("sim.reset")}
        message="确认重置整个模拟盘？所有 Agent 的现金、持仓、订单、交易和日志将被清空。"
        confirmLabel={t("actions.confirm")}
        cancelLabel={t("actions.cancel")}
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => { await api.reset(); await qc.invalidateQueries(); setConfirmReset(false); }}
      />
    </div>
  );
}
