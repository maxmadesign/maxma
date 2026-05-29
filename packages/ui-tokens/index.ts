/** Design tokens shared across the UI. The canonical semantic colour mappings live in
 * apps/web/lib/semantic.ts; this package re-exports the primitive token names so other
 * surfaces (reports, future native apps) can reuse them. */

export const RADII = { card: "1.25rem", pill: "9999px", input: "0.625rem" } as const;

export const SEMANTIC_COLORS = {
  buy: "emerald", sell: "rose", hold: "slate", watch: "sky", reduce: "amber", close: "violet",
  safe: "emerald", warning: "amber", danger: "rose", paused: "yellow", kill_switch: "red",
  stock: "blue", etf: "cyan", option: "violet", cash: "slate",
} as const;

export const PROVIDER_ACCENT = {
  openai: ["emerald", "cyan"],
  anthropic: ["amber", "orange"],
  gemini: ["blue", "violet"],
  deepseek: ["indigo", "slate"],
} as const;
