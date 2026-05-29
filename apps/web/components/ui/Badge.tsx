import { cn } from "@/lib/utils";
import {
  ACTION_TONES, AGENT_STATUS_TONES, ASSET_TONES, ORDER_STATUS_TONES, RISK_TONES, PROVIDER_THEME,
} from "@/lib/semantic";

function Pill({ tone, label, pulse }: { tone: { badge: string; dot: string }; label: string; pulse?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", tone.badge)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {label}
    </span>
  );
}

const FALLBACK = { badge: "bg-slate-500/12 text-slate-500 ring-1 ring-slate-500/30", dot: "bg-slate-400" };

export function ActionTag({ action, label }: { action: string; label?: string }) {
  return <Pill tone={ACTION_TONES[action] ?? FALLBACK} label={label ?? action.toUpperCase()} />;
}
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Pill tone={AGENT_STATUS_TONES[status] ?? FALLBACK} label={label ?? status} />;
}
export function RiskBadge({ status, label }: { status: string; label?: string }) {
  return <Pill tone={RISK_TONES[status] ?? FALLBACK} label={label ?? status} />;
}
export function OrderStatusBadge({ status, label }: { status: string; label?: string }) {
  return <Pill tone={ORDER_STATUS_TONES[status] ?? FALLBACK} label={label ?? status} />;
}
export function AssetTypeBadge({ asset, label }: { asset: string; label?: string }) {
  return <Pill tone={ASSET_TONES[asset] ?? FALLBACK} label={label ?? asset.toUpperCase()} />;
}
export function ProviderBadge({ provider, name }: { provider: string; name?: string }) {
  const th = PROVIDER_THEME[provider] ?? { ring: "ring-slate-500/40", text: "text-slate-500", bg: "bg-slate-500/10", gradient: "" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1", th.bg, th.text, th.ring)}>
      <span className={cn("h-2 w-2 rounded-sm bg-gradient-to-br", th.gradient)} />
      {name ?? provider}
    </span>
  );
}
