"use client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { AgentCardGrid } from "@/components/AgentCardGrid";

export default function AgentsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("nav.agents")} />
      <AgentCardGrid />
    </div>
  );
}
