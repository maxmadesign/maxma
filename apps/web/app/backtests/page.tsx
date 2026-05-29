"use client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, EmptyState } from "@/components/ui/Card";
import { FlaskConical } from "lucide-react";

export default function BacktestsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("nav.backtests")} subtitle="策略回测 / 决策重放 / 市场重放 · 通过 CLI 运行" />
      <Card>
        <CardBody>
          <EmptyState
            icon={<FlaskConical size={28} />}
            title={t("common.empty")}
            hint="运行: python scripts/run_backtest.py --strategy vwap_momentum --data ./data --start 2024-01-01 --end 2025-01-01"
          />
        </CardBody>
      </Card>
    </div>
  );
}
