"use client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { PositionsTable } from "@/components/PositionsTable";

export default function PositionsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("nav.positions")} />
      <PositionsTable />
    </div>
  );
}
