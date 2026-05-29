"use client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, EmptyState } from "@/components/ui/Card";

export default function OrdersPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("nav.orders")} subtitle="模拟订单在同一轮内即时成交，未成交挂单显示于此 / Simulated orders fill within the round" />
      <Card><CardBody><EmptyState title={t("common.empty")} hint="市价/限价模拟单成交后会出现在交易历史。" /></CardBody></Card>
    </div>
  );
}
