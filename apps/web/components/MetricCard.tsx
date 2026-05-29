import { cn } from "@/lib/utils";

export function MetricCard({ label, value, sub, tone, icon }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "pos" | "neg" | "neutral"; icon?: React.ReactNode;
}) {
  const toneClass = tone === "pos" ? "text-emerald-500" : tone === "neg" ? "text-rose-500" : "text-fg";
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <p className={cn("mt-1.5 text-2xl font-semibold tnum tracking-tight", toneClass)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted tnum">{sub}</p>}
    </div>
  );
}
