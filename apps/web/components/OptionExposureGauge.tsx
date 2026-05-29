import { cn } from "@/lib/utils";

/** Option exposure gauge with the 30% hard limit clearly marked (colour + text). */
export function OptionExposureGauge({ pct, limit = 30 }: { pct: number; limit?: number }) {
  const ratio = Math.min(1, pct / limit);
  const danger = pct >= limit * 0.9;
  const warn = pct >= limit * 0.6;
  const color = danger ? "bg-rose-500" : warn ? "bg-amber-500" : "bg-violet-500";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">期权敞口 / Option Exposure</span>
        <span className={cn("font-medium tnum", danger ? "text-rose-500" : warn ? "text-amber-500" : "text-violet-500")}>
          {pct.toFixed(1)}% / {limit}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
