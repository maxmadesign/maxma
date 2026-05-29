"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, CardHeader, Skeleton } from "@/components/ui/Card";
import { PROVIDER_CHART_COLOR } from "@/lib/semantic";

const AGENTS = ["openai", "anthropic", "gemini", "deepseek"];

export function EquityCurveChart() {
  const { t } = useI18n();
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const { data, isLoading } = useQuery({ queryKey: ["equity-curves"], queryFn: api.equityCurves });

  // merge per-agent series into one array keyed by index
  const merged: any[] = [];
  if (data) {
    const len = Math.max(...AGENTS.map((a) => data[a]?.length ?? 0), 0);
    for (let i = 0; i < len; i++) {
      const row: any = { i };
      for (const a of AGENTS) row[a] = data[a]?.[i]?.equity ?? null;
      merged.push(row);
    }
  }

  return (
    <Card>
      <CardHeader
        title={t("equityChart.title")}
        action={
          <div className="flex gap-1">
            {["today", "week", "month", "all"].map((k) => (
              <button key={k} className="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-2">{t(`equityChart.${k}`)}</button>
            ))}
          </div>
        }
      />
      <div className="p-4">
        {isLoading ? <Skeleton className="h-64 w-full" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={merged}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="i" tick={{ fontSize: 11 }} stroke="hsl(var(--muted))" />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted))" width={60} />
              <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend onClick={(e: any) => setHidden((h) => ({ ...h, [e.dataKey]: !h[e.dataKey] }))} wrapperStyle={{ fontSize: 12, cursor: "pointer" }} />
              {AGENTS.map((a) => (
                <Line key={a} type="monotone" dataKey={a} hide={hidden[a]} stroke={PROVIDER_CHART_COLOR[a]} dot={false} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
