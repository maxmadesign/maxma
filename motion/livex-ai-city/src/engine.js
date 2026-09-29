// Tiny deterministic motion engine: every visual is a pure function of time `t`.

export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const DURATION = 30;
export const BPM = 120;
export const BEAT = 60 / BPM;

// ---------------------------------------------------------------- math

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, u) => a + (b - a) * u;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const lerpPt = (p, q, u) => ({ x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u) });
export const lerpRect = (a, b, u) => ({
  x: lerp(a.x, b.x, u),
  y: lerp(a.y, b.y, u),
  w: lerp(a.w, b.w, u),
  h: lerp(a.h, b.h, u),
  r: lerp(a.r ?? 0, b.r ?? 0, u),
});

export const E = {
  linear: (u) => u,
  inQuad: (u) => u * u,
  outQuad: (u) => 1 - (1 - u) * (1 - u),
  inSine: (u) => 1 - Math.cos((u * Math.PI) / 2),
  outSine: (u) => Math.sin((u * Math.PI) / 2),
  inOutSine: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
  inCubic: (u) => u * u * u,
  outCubic: (u) => 1 - Math.pow(1 - u, 3),
  inOutCubic: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  inQuart: (u) => u * u * u * u,
  outQuart: (u) => 1 - Math.pow(1 - u, 4),
  inOutQuart: (u) => (u < 0.5 ? 8 * u ** 4 : 1 - Math.pow(-2 * u + 2, 4) / 2),
  outQuint: (u) => 1 - Math.pow(1 - u, 5),
  inExpo: (u) => (u <= 0 ? 0 : Math.pow(2, 10 * u - 10)),
  outExpo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
  inOutExpo: (u) =>
    u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2,
  outBack: (u, s = 1.70158) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2)),
  inBack: (u, s = 1.70158) => (s + 1) * u * u * u - s * u * u,
};

/** CSS-style cubic-bezier easing. Returns f(x) -> y, plus f.pt(u) for the raw curve. */
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u) => ((ax * u + bx) * u + cx) * u;
  const sy = (u) => ((ay * u + by) * u + cy) * u;
  const dsx = (u) => (3 * ax * u + 2 * bx) * u + cx;
  const solve = (x) => {
    let u = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(u) - x;
      if (Math.abs(e) < 1e-7) return u;
      const d = dsx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    let lo = 0, hi = 1;
    u = x;
    for (let i = 0; i < 40; i++) {
      if (sx(u) < x) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return u;
  };
  const f = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sy(solve(x)));
  f.pt = (u) => ({ x: sx(u), y: sy(u) });
  return f;
}

/** Analytic damped spring from 0 -> 1. k = stiffness, c = damping, m = mass, v0 = initial velocity. */
export function spring(t, { k = 170, c = 26, m = 1, v0 = 0 } = {}) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k / m);
  const z = c / (2 * Math.sqrt(k * m));
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    const B = (v0 - z * w0) / wd;
    return 1 + Math.exp(-z * w0 * t) * (-Math.cos(wd * t) + B * Math.sin(wd * t));
  }
  return 1 + (-1 + (v0 - w0) * t) * Math.exp(-w0 * t);
}

/** Decaying wobble 0 -> peak -> 0, used for squash/impact reactions. */
export const wobble = (t, freq = 14, decay = 7) => (t <= 0 ? 0 : Math.exp(-decay * t) * Math.sin(freq * t));

/** Quadratic arc between two points; `lift` raises the midpoint (px, screen-up). */
export function arc(p0, p1, u, lift = 0) {
  const cx = (p0.x + p1.x) / 2, cy = (p0.y + p1.y) / 2 - lift;
  const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
  return { x: a * p0.x + b * cx + c * p1.x, y: a * p0.y + b * cy + c * p1.y };
}

/** Ballistic hop: x linear, y parabolic with apex height h above the chord. */
export function hop(p0, p1, u, h) {
  return { x: lerp(p0.x, p1.x, u), y: lerp(p0.y, p1.y, u) - 4 * h * u * (1 - u) };
}

// ---------------------------------------------------------------- colour

export function hex(c) {
  if (Array.isArray(c)) return c;
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(c, a = 1) {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
}
export function mixc(a, b, u) {
  const p = hex(a), q = hex(b);
  return p.map((v, i) => Math.round(lerp(v, q[i], clamp(u))));
}
export function luminance(c) {
  const [r, g, b] = hex(c).map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
export function wcag(ratio) {
  if (ratio >= 7) return { pass: true, label: 'AAA' };
  if (ratio >= 4.5) return { pass: true, label: 'AA' };
  if (ratio >= 3) return { pass: false, label: 'Large only' };
  return { pass: false, label: 'Fails AA' };
}

// ---------------------------------------------------------------- type

export const F = {
  sans: (s, w = 700) => `${w} ${s}px "Inter Tight"`,
  serif: (s) => `italic 400 ${s}px "Instrument Serif"`,
  mono: (s, w = 500) => `${w} ${s}px "JetBrains Mono"`,
};

let mctx = null;
const mcache = new Map();
export function setMeasureContext(ctx) {
  mctx = ctx;
}

function applyFont(ctx, font, tr) {
  ctx.font = font;
  ctx.letterSpacing = `${tr}px`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/** Visual advance width of a string (tracking after the last glyph removed). */
export function textW(text, font, tr = 0) {
  const key = `${font}|${tr}|${text}`;
  let w = mcache.get(key);
  if (w === undefined) {
    applyFont(mctx, font, tr);
    w = mctx.measureText(text).width - (text.length ? tr : 0);
    mcache.set(key, w);
  }
  return w;
}

/** Kerning-aware glyph positions: [{ch, x, w}] relative to the string origin. */
export function glyphs(text, font, tr = 0) {
  const out = [];
  const chars = [...text];
  let prefix = '';
  for (const ch of chars) {
    prefix += ch;
    const upto = textW(prefix, font, tr) + tr;
    const own = textW(ch, font, tr) + tr;
    out.push({ ch, x: upto - own, w: own - tr });
  }
  return out;
}

export function metrics(font, sample = 'H') {
  applyFont(mctx, font, 0);
  const m = mctx.measureText(sample);
  return { asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
}

/** Draw text with manual alignment so tracking never skews centring. Returns width. */
export function text(ctx, s, x, y, { font, color, align = 'left', tr = 0, alpha = 1 }) {
  const w = textW(s, font, tr);
  if (alpha <= 0) return w;
  applyFont(ctx, font, tr);
  ctx.fillStyle = typeof color === 'string' ? color : rgba(color);
  const pa = ctx.globalAlpha;
  ctx.globalAlpha = pa * alpha;
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.fillText(s, x0, y);
  ctx.globalAlpha = pa;
  return w;
}

/** Mixed-style run of text on one line. spans: [{s, font, color, tr}] */
export function spansWidth(spans) {
  return spans.reduce((w, sp) => w + textW(sp.s, sp.font, sp.tr ?? 0) + (sp.pad ?? 0), 0);
}
export function spans(ctx, list, x, y, { align = 'left', alpha = 1 } = {}) {
  const w = spansWidth(list);
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  for (const sp of list) {
    text(ctx, sp.s, cx, y, { font: sp.font, color: sp.color, tr: sp.tr ?? 0, alpha: alpha * (sp.alpha ?? 1) });
    cx += textW(sp.s, sp.font, sp.tr ?? 0) + (sp.pad ?? 0);
  }
  return w;
}

/**
 * Masked line reveal — the text slides up from behind an invisible edge.
 * pin: 0..1 entrance, pout: 0..1 exit. `box` = {x0, x1, top, bottom} clip band.
 */
export function reveal(ctx, box, pin, pout, draw) {
  if (pin <= 0 || pout >= 1) return;
  const h = box.bottom - box.top;
  const dy = (1 - pin) * h * 1.05 - pout * h * 1.05;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x0, box.top, box.x1 - box.x0, h);
  ctx.clip();
  ctx.translate(0, dy);
  draw();
  ctx.restore();
}

// ---------------------------------------------------------------- shapes

export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
}
export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(0, w), Math.max(0, h), Math.max(0, Math.min(r, w / 2, h / 2)));
}
export function line(ctx, x0, y0, x1, y1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
}

/** Check-mark path drawn progressively (p: 0..1) inside a box of size s centred at x,y. */
export function check(ctx, x, y, s, p, color, lw) {
  if (p <= 0) return;
  const a = { x: x - s * 0.36, y: y + s * 0.02 };
  const b = { x: x - s * 0.1, y: y + s * 0.28 };
  const c = { x: x + s * 0.4, y: y - s * 0.3 };
  const l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(c.x - b.x, c.y - b.y);
  const d = p * (l1 + l2);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  if (d <= l1) ctx.lineTo(lerp(a.x, b.x, d / l1), lerp(a.y, b.y, d / l1));
  else {
    ctx.lineTo(b.x, b.y);
    const u = (d - l1) / l2;
    ctx.lineTo(lerp(b.x, c.x, u), lerp(b.y, c.y, u));
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

export function cross(ctx, x, y, s, p, color, lw) {
  if (p <= 0) return;
  const q = s * 0.3;
  const u1 = clamp(p * 2), u2 = clamp(p * 2 - 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  line(ctx, x - q, y - q, lerp(x - q, x + q, u1), lerp(y - q, y + q, u1));
  ctx.stroke();
  if (u2 > 0) {
    line(ctx, x + q, y - q, lerp(x + q, x - q, u2), lerp(y - q, y + q, u2));
    ctx.stroke();
  }
}

/** Classic arrow pointer, tip at (x, y). */
export function cursor(ctx, x, y, { scale = 1, alpha = 1, press = 0 } = {}) {
  if (alpha <= 0) return;
  const s = 1.55 * scale * (1 - 0.14 * press);
  const pts = [
    [0, 0], [0, 25.5], [6.2, 19.6], [10.4, 29.4], [14.6, 27.6], [10.5, 18], [18.4, 18],
  ];
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(-0.04);
  ctx.scale(s, s);
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#111110';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- misc

/** Deterministic PRNG. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const fmt = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
