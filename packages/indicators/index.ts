/** Lightweight TS technical indicators for client-side chart overlays.
 * The authoritative implementations used for decisions are the Python ones in
 * apps/api/tradepilot/indicators.py. */

export function ema(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = [];
  let prev: number | null = null;
  values.forEach((v, i) => {
    if (i < period - 1) { out.push(null); return; }
    prev = prev === null ? v : v * k + prev * (1 - k);
    out.push(prev);
  });
  return out;
}

export function vwap(bars: { high: number; low: number; close: number; volume: number }[]): number | null {
  let pv = 0, vol = 0;
  for (const b of bars) { const tp = (b.high + b.low + b.close) / 3; pv += tp * b.volume; vol += b.volume; }
  return vol ? pv / vol : null;
}
