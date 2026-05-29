"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, CardHeader, EmptyState, Skeleton } from "@/components/ui/Card";
import { ActionTag, ProviderBadge } from "@/components/ui/Badge";
import { DecisionLogDrawer } from "@/components/DecisionLogDrawer";
import { cn } from "@/lib/utils";

export function DecisionFeed() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["decisions"], queryFn: () => api.decisions("?limit=20") });
  const [selected, setSelected] = useState<any>(null);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader title={t("feed.title")} />
      <div className="flex-1 space-y-2 overflow-y-auto p-4" style={{ maxHeight: 520 }}>
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : !data?.length ? (
          <EmptyState title={t("feed.empty")} />
        ) : (
          data.map((d) => (
            <button key={d.id} onClick={() => setSelected(d)}
              className="w-full rounded-xl border border-border bg-surface-2/40 p-3 text-left transition-colors hover:bg-surface-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ProviderBadge provider={d.provider} />
                  {d.valid ? <ActionTag action={d.overall_action} /> : <ActionTag action="hold" label="INVALID" />}
                </div>
                <span className="text-[11px] text-muted">{d.confidence ? `${t("feed.confidence")} ${d.confidence}` : ""}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs text-fg/80">{d.summary || d.error}</p>
              {d.risk_results?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {d.risk_results.map((r: any, i: number) => (
                    <span key={i} className={cn("rounded px-1.5 py-0.5 text-[10px]", r.approved ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/12 text-rose-600 dark:text-rose-400")}>
                      {r.symbol} {r.approved ? "✓" : `✕ ${r.rule}`}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))
        )}
      </div>
      <DecisionLogDrawer decision={selected} onClose={() => setSelected(null)} />
    </Card>
  );
}
