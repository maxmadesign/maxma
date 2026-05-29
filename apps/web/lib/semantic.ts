/**
 * Unified semantic visual system. Do NOT scatter raw colour classes for domain states —
 * map them here. Every state carries colour AND a text label (never colour alone).
 * Mirrors the backend enums in apps/api/tradepilot/schemas/enums.py.
 */

export type Tone = {
  // tailwind classes for a soft badge (bg + text + ring)
  badge: string;
  dot: string;
};

const tone = (badge: string, dot: string): Tone => ({ badge, dot });

// ---- Trade actions ----
export const ACTION_TONES: Record<string, Tone> = {
  buy: tone("bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30", "bg-emerald-500"),
  sell: tone("bg-rose-500/12 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30", "bg-rose-500"),
  hold: tone("bg-slate-500/12 text-slate-600 dark:text-slate-300 ring-1 ring-slate-500/30", "bg-slate-400"),
  watch: tone("bg-sky-500/12 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30", "bg-sky-500"),
  reduce: tone("bg-amber-500/12 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30", "bg-amber-500"),
  close: tone("bg-violet-500/12 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/30", "bg-violet-500"),
  trade: tone("bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30", "bg-emerald-500"),
  reduce_risk: tone("bg-amber-500/12 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30", "bg-amber-500"),
  close_positions: tone("bg-violet-500/12 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/30", "bg-violet-500"),
};

// ---- Order status ----
export const ORDER_STATUS_TONES: Record<string, Tone> = {
  pending: tone("bg-blue-500/12 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30", "bg-blue-500"),
  submitted: tone("bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30", "bg-indigo-500"),
  partially_filled: tone("bg-cyan-500/12 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30", "bg-cyan-500"),
  filled: tone("bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30", "bg-emerald-500"),
  cancelled: tone("bg-slate-500/12 text-slate-500 ring-1 ring-slate-500/30", "bg-slate-400"),
  rejected: tone("bg-orange-600/12 text-orange-600 dark:text-orange-400 ring-1 ring-orange-600/30", "bg-orange-600"),
  expired: tone("bg-zinc-500/12 text-zinc-500 ring-1 ring-zinc-500/30", "bg-zinc-400"),
};

// ---- Risk status ----
export const RISK_TONES: Record<string, Tone> = {
  safe: tone("bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30", "bg-emerald-500"),
  warning: tone("bg-amber-500/12 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30", "bg-amber-500"),
  danger: tone("bg-rose-500/12 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30", "bg-rose-500"),
  paused: tone("bg-yellow-500/12 text-yellow-600 dark:text-yellow-400 ring-1 ring-yellow-500/30", "bg-yellow-500"),
  kill_switch: tone("bg-red-950 text-red-300 ring-1 ring-red-500/60", "bg-red-500"),
};

// ---- Agent status ----
export const AGENT_STATUS_TONES: Record<string, Tone> = {
  thinking: tone("bg-violet-500/12 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/30 animate-pulseSoft", "bg-violet-500 animate-pulseSoft"),
  idle: tone("bg-slate-500/12 text-slate-500 ring-1 ring-slate-500/30", "bg-slate-400"),
  waiting_for_market: tone("bg-blue-500/12 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30", "bg-blue-500"),
  trading: tone("bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30", "bg-emerald-500"),
  paused: tone("bg-amber-500/12 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30", "bg-amber-500"),
  error: tone("bg-rose-500/12 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30", "bg-rose-500"),
  disabled: tone("bg-slate-500/12 text-slate-400 ring-1 ring-slate-500/30", "bg-slate-300"),
};

// ---- Asset type ----
export const ASSET_TONES: Record<string, Tone> = {
  stock: tone("bg-blue-500/12 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30", "bg-blue-500"),
  etf: tone("bg-cyan-500/12 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30", "bg-cyan-500"),
  option: tone("bg-violet-500/12 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/30", "bg-violet-500"),
  call: tone("bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30", "bg-emerald-500"),
  put: tone("bg-rose-500/12 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30", "bg-rose-500"),
  cash: tone("bg-slate-500/12 text-slate-500 ring-1 ring-slate-500/30", "bg-slate-400"),
};

// ---- Provider visual identity ----
export const PROVIDER_THEME: Record<string, { ring: string; text: string; bg: string; gradient: string }> = {
  openai: { ring: "ring-emerald-500/40", text: "text-emerald-500", bg: "bg-emerald-500/10", gradient: "from-emerald-500 to-cyan-500" },
  anthropic: { ring: "ring-amber-500/40", text: "text-amber-500", bg: "bg-amber-500/10", gradient: "from-amber-500 to-orange-500" },
  gemini: { ring: "ring-blue-500/40", text: "text-blue-500", bg: "bg-blue-500/10", gradient: "from-blue-500 to-violet-500" },
  deepseek: { ring: "ring-indigo-500/40", text: "text-indigo-500", bg: "bg-indigo-500/10", gradient: "from-indigo-500 to-slate-500" },
};

export const PROVIDER_CHART_COLOR: Record<string, string> = {
  openai: "#10b981",
  anthropic: "#f59e0b",
  gemini: "#3b82f6",
  deepseek: "#6366f1",
};
