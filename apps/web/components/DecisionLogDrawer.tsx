"use client";
import { X, Check, XCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ActionTag, AssetTypeBadge, ProviderBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

/** Decision Log drawer — plain, beginner-friendly Chinese/English explanation. */
export function DecisionLogDrawer({ decision, onClose }: { decision: any; onClose: () => void }) {
  const { t } = useI18n();
  if (!decision) return null;
  const dec = decision.decision;
  const symDec = dec?.decisions?.[0];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto border-l border-border bg-surface p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ProviderBadge provider={decision.provider} />
            {decision.valid ? <ActionTag action={decision.overall_action} /> : <ActionTag action="hold" label="INVALID_RESPONSE" />}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-surface-2"><X size={18} /></button>
        </div>

        <p className="mt-4 text-base font-medium leading-relaxed">{decision.summary || decision.error}</p>
        <p className="mt-1 font-mono text-[11px] text-muted">
          {decision.model} · hash {decision.input_hash} · {new Date(decision.timestamp).toLocaleString()}
        </p>

        {symDec && (
          <div className="mt-5 space-y-4">
            <Section title={`${symDec.symbol} · ${symDec.action.toUpperCase()}`}>
              <div className="flex items-center gap-2"><AssetTypeBadge asset={symDec.asset_type} /><ActionTag action={symDec.action} /></div>
              <p className="mt-2 text-sm text-fg/80">{symDec.thesis_summary}</p>
            </Section>

            <Section title="指标检查表 / Signal Checklist">
              <ul className="space-y-1.5">
                {symDec.signal_checklist?.map((c: any, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {c.passed ? <Check size={15} className="mt-0.5 shrink-0 text-emerald-500" /> : <XCircle size={15} className="mt-0.5 shrink-0 text-rose-500" />}
                    <span><b>{c.label}</b>{c.value != null && <span className="text-muted"> ({c.value})</span>} — <span className="text-muted">{c.explanation}</span></span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="证据 / Evidence">
              <ul className="list-inside list-disc space-y-1 text-sm text-fg/80">
                {symDec.evidence?.map((e: string, i: number) => <li key={i}>{e}</li>)}
              </ul>
            </Section>

            <div className="grid grid-cols-1 gap-3">
              <Field label="风险评估 / Risk" value={symDec.risk_assessment} />
              <Field label="仓位计算 / Sizing" value={symDec.position_sizing_reason} />
              <Field label="止损逻辑 / Stop" value={symDec.stop_loss_reason} />
              <Field label="止盈逻辑 / Target" value={symDec.take_profit_reason} />
              <Field label="失效条件 / Invalidation" value={symDec.invalidation_condition} />
              <Field label="不确定性 / Uncertainty" value={symDec.uncertainty_notes} />
            </div>
          </div>
        )}

        {decision.risk_results?.length > 0 && (
          <Section title={`${t("feed.riskResult")} / Risk Engine`}>
            {decision.risk_results.map((r: any, i: number) => (
              <div key={i} className={cn("mb-1.5 rounded-lg px-3 py-2 text-sm", r.approved ? "bg-emerald-500/10" : "bg-rose-500/10")}>
                <b>{r.symbol}</b> — {r.approved ? `✓ approved (qty ${r.quantity})` : `✕ rejected: ${r.rule}`}
                <p className="text-xs text-muted">{r.reason}</p>
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
      {children}
    </div>
  );
}
function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <div><p className="text-[11px] font-medium text-muted">{label}</p><p className="text-sm text-fg/80">{value}</p></div>;
}
