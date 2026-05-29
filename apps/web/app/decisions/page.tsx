"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, EmptyState, Skeleton } from "@/components/ui/Card";
import { ActionTag, ProviderBadge } from "@/components/ui/Badge";
import { DecisionLogDrawer } from "@/components/DecisionLogDrawer";

export default function DecisionsPage() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<string>("");
  const [selected, setSelected] = useState<any>(null);
  const { data, isLoading } = useQuery({ queryKey: ["all-decisions"], queryFn: () => api.decisions("?limit=200") });

  const filtered = data?.filter((d) => !filter || d.agent_id === filter);

  return (
    <div>
      <PageHeader title={t("nav.decisions")} subtitle="点击任意决策查看浅显易懂的完整解释 / Click any decision for a plain-language explanation" />
      <div className="mb-4 flex gap-1.5">
        {["", "openai", "anthropic", "gemini", "deepseek"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs ${filter === f ? "bg-accent text-white" : "border border-border hover:bg-surface-2"}`}>
            {f || (t("common.empty") === "暂无数据" ? "全部" : "All")}
          </button>
        ))}
      </div>
      <Card>
        <CardBody className="space-y-2">
          {isLoading ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)
            : !filtered?.length ? <EmptyState title={t("feed.empty")} />
              : filtered.map((d) => (
                <button key={d.id} onClick={() => setSelected(d)} className="block w-full rounded-xl border border-border p-3 text-left hover:bg-surface-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ProviderBadge provider={d.provider} />
                      {d.valid ? <ActionTag action={d.overall_action} /> : <ActionTag action="hold" label="INVALID" />}
                    </div>
                    <span className="text-[11px] text-muted">{new Date(d.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-fg/80">{d.summary || d.error}</p>
                </button>
              ))}
        </CardBody>
      </Card>
      <DecisionLogDrawer decision={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
