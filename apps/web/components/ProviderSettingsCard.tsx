"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, RefreshCw, Plug, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { ProviderBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  connected: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  missing_key: "bg-slate-500/12 text-slate-500",
  invalid_key: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  rate_limited: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  degraded: "bg-orange-500/12 text-orange-600 dark:text-orange-400",
  disabled: "bg-slate-500/12 text-slate-400",
};

export function ProviderSettingsCard({ provider }: { provider: any }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["providers"] });

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <ProviderBadge provider={provider.provider} name={provider.display_name} />
        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", STATUS_TONE[provider.status])}>
          {t(`providerStatus.${provider.status}`)}
        </span>
      </div>

      <p className="mt-3 text-xs text-muted">{t("settings.maskedHint")}</p>

      <div className="mt-2 flex items-center gap-2">
        <div className="relative flex-1">
          <KeyRound size={14} className="absolute left-2.5 top-2.5 text-muted" />
          <input
            type="password"
            value={key}
            placeholder={provider.masked_key || "sk-…"}
            onChange={(e) => setKey(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <button
          disabled={!key || busy === "save"}
          onClick={async () => { setBusy("save"); await api.saveKey(provider.provider, key); setKey(""); refresh(); setBusy(null); }}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {t("settings.save")}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={async () => { setBusy("test"); const r = await api.testProvider(provider.provider) as any; setTestResult(r.detail); refresh(); setBusy(null); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-surface-2">
          <Plug size={13} /> {t("settings.testConnection")}
        </button>
        <button onClick={async () => { setBusy("refresh"); await api.refreshModels(provider.provider); refresh(); setBusy(null); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-surface-2">
          <RefreshCw size={13} className={busy === "refresh" ? "animate-spin" : ""} /> {t("settings.refreshModels")}
        </button>
        {provider.status === "connected" && (
          <button onClick={async () => { await api.deleteKey(provider.provider); refresh(); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10">
            <Trash2 size={13} /> {t("settings.delete")}
          </button>
        )}
      </div>

      {testResult && <p className="mt-2 text-xs text-muted">{testResult}</p>}

      <div className="mt-4 border-t border-border pt-3">
        <p className="text-[11px] font-medium text-muted">{t("settings.modelSettings")}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {provider.models?.map((m: string) => (
            <span key={m} className={cn("rounded-md px-2 py-0.5 font-mono text-[11px]",
              m === provider.default_model ? "bg-accent/15 text-accent ring-1 ring-accent/30" : "bg-surface-2 text-muted")}>
              {m}{m === provider.default_model ? " ★" : ""}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">fallback: <span className="font-mono">{provider.fallback_model}</span></p>
      </div>
    </Card>
  );
}
