// Claude — Motion Résumé. 30 s · 1920×1080 · 60 fps · 120 BPM (one bar = 2 s).
// One continuous take. The protagonist is a single dot; every skill is demonstrated
// on screen at the moment it is named.

import {
  W, H, DURATION, E, clamp, lerp, prog, lerpRect, bezier, spring, wobble, arc, hop,
  rgba, mixc, contrast, wcag, F, textW, glyphs, metrics, text, spans, spansWidth, reveal,
  circle, rrect, line, check, cross, cursor, fmt,
} from './engine.js';

// ================================================================= palette

export const PAL = {
  paper: '#F4F1EA',
  ink: '#151514',
  ink2: '#5E5A52',
  clay: '#D97757',
  clay7: '#A94F2E',
  blue: '#6A9BCC',
  olive: '#788C5D',
  sand: '#E2D7C1',
  night: '#121211',
};

export const LIGHT = {
  name: 'light', bg: PAL.paper, fg: PAL.ink, muted: PAL.ink2, faint: rgba(PAL.ink, 0.12),
  hair: rgba(PAL.ink, 0.07), card: '#FBFAF6', page: '#ECE8DF', accent: PAL.clay7, clay: PAL.clay,
  onFg: PAL.paper, shadow: 'rgba(70,45,20,0.10)', grid: rgba(PAL.clay, 0.075),
};
export const DARK = {
  name: 'dark', bg: PAL.night, fg: PAL.paper, muted: '#A39E92', faint: rgba(PAL.paper, 0.14),
  hair: rgba(PAL.paper, 0.07), card: '#1D1C1A', page: '#181816', accent: '#E8916F', clay: PAL.clay,
  onFg: PAL.night, shadow: 'rgba(0,0,0,0.5)', grid: rgba(PAL.clay, 0.1),
};

export const CHAPTERS = [
  [0, '00', 'HELLO'],
  [4, '01', 'MOTION'],
  [10, '02', 'GRAPHICS'],
  [16.5, '03', 'INTERACTION'],
  [24, '04', 'SIGNATURE'],
];

// ================================================================= layout constants

const R0 = 17; // the hero's resting radius (first & last frame)
const G = { x: 1180, y: 800, s: 460 }; // easing graph: origin (bottom-left) and size
const P_LIN = [0.25, 0.25, 0.75, 0.75];
const P_OUT = [0.16, 1, 0.3, 1];
const EF = bezier(...P_OUT);
const TK = { x0: 560, x1: 1480, ys: [560, 690, 820] };
const RACE = [
  (s) => clamp(s / 0.9),
  (s) => E.inOutCubic(clamp(s / 0.9)),
  (s) => spring(s, { k: 100, c: 12 }),
];
const GROUND = 880;
const BR = 34; // hero radius in the bounce
const COL = (c) => 120 + c * 142; // 12-col grid, 118 px columns, 24 px gutters
const STEP_Y = 760;
const NODES = [440, 700, 960, 1220, 1480];
const ST = [16.9, 17.12, 17.5, 17.62, 18.3]; // idle, hover, pressed, loading, success
const KNOB = { l: 908, r: 1012, y: 560, R: 44 };

let L = null;

// ================================================================= init / measurement

export function init() {
  L = {};

  // --- hello headline: "Hi, I’m Claude" + the hero as its full stop
  {
    const font = F.sans(168, 700), tr = -6, s = 'Hi, I’m Claude';
    const w = textW(s, font, tr), gap = 9;
    const x0 = 960 - (w + gap + 2 * R0) / 2;
    const cap = metrics(font, 'H').asc;
    const base0 = Math.round(540 + cap / 2);
    L.hello = { font, tr, s, w, x0, base0, dotX: x0 + w + gap + R0, g: glyphs(s, font, tr) };
    // when the pen-dot passes each glyph, that glyph pops up
    L.hello.times = L.hello.g.map((g) => {
      const target = x0 + g.x + g.w * 0.35;
      for (let t = 0.7; t < 1.6; t += 0.001) if (helloPenX(t) >= target) return t;
      return 1.52;
    });
    const l2font = F.serif(80);
    const words = ['Every', 'frame', 'of', 'this', 'résumé', 'is'];
    const sp = textW(' ', l2font);
    const codeFont = F.mono(56, 500);
    const codeW = textW('code', codeFont);
    const pill = { padX: 18, w: codeW + 36 };
    let total = words.reduce((a, wd) => a + textW(wd, l2font) + sp, 0) + pill.w;
    let x = 960 - total / 2;
    L.l2 = { font: l2font, codeFont, pill, items: [] };
    for (const wd of words) {
      L.l2.items.push({ s: wd, x });
      x += textW(wd, l2font) + sp;
    }
    L.l2.pillX = x;
  }

  // --- big specimen word; the hero becomes the tittle of the dotless ı
  {
    const w100 = textW('Hıerarchy', F.sans(100, 800), -4);
    const size = Math.round((8 * 142 - 24) / w100 * 100 * 10) / 10;
    const font = F.sans(size, 800), tr = -0.04 * size;
    const g = glyphs('Hıerarchy', font, tr);
    const tit = measureTittle(size);
    L.big = {
      size, font, tr, g, base: 610, w: textW('Hıerarchy', font, tr),
      tit: { dx: g[1].x + tit.cx, dy: tit.cy, r: tit.r },
      cap: metrics(font, 'H').asc, xh: metrics(font, 'x').asc,
    };
  }

  // --- montage words, each punctuated by the hero
  L.mont = [
    { s: 'Graphics', font: F.sans(250, 800), tr: -11, r: 21 },
    { s: 'Motion', font: F.serif(310), tr: -3, r: 19 },
    { s: 'Interaction', font: F.sans(222, 700), tr: -9, r: 19 },
    { s: 'Systems', font: F.mono(206, 500), tr: -10, r: 19 },
  ].map((m) => {
    const w = textW(m.s, m.font, m.tr);
    const gap = { Graphics: 12, Motion: 6, Interaction: 2, Systems: 4 }[m.s];
    const x0 = 960 - (w + gap + 2 * m.r) / 2;
    const base = 630;
    return { ...m, w, x0, base, dot: { x: x0 + w + gap + m.r, y: base - m.r } };
  });

  // --- end card
  {
    const font = F.sans(260, 800), tr = -11, s = 'Claude';
    const w = textW(s, font, tr), r = 26, gap = 14;
    const x0 = 960 - (w + gap + 2 * r) / 2;
    const base = 585;
    L.end = { font, tr, s, w, x0, base, r, g: glyphs(s, font, tr), dot: { x: x0 + w + gap + r, y: base - r } };
  }

  buildHero();
}

/** Render ‘i’ and ‘ı’ offscreen and diff them to find the exact tittle. */
function measureTittle(size) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(size * 1.2);
  c.height = Math.ceil(size * 1.4);
  const x = c.getContext('2d', { willReadFrequently: true });
  const ox = size * 0.3, oy = size * 1.1;
  const draw = (ch) => {
    x.clearRect(0, 0, c.width, c.height);
    x.font = F.sans(size, 800);
    x.fillStyle = '#000';
    x.fillText(ch, ox, oy);
    return x.getImageData(0, 0, c.width, c.height).data;
  };
  const a = draw('i'), b = draw('ı');
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  for (let py = 0; py < c.height; py++)
    for (let px = 0; px < c.width; px++) {
      const k = (py * c.width + px) * 4 + 3;
      if (a[k] > 128 && b[k] < 20) {
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
    }
  if (maxX < 0) return { cx: size * 0.13, cy: -size * 0.7, r: size * 0.07 };
  return {
    cx: (minX + maxX + 1) / 2 - ox,
    cy: (minY + maxY + 1) / 2 - oy,
    r: Math.max(maxX - minX + 1, maxY - minY + 1) / 2,
  };
}

// ================================================================= shared poses

function helloPenX(t) {
  const Hh = L.hello;
  return lerp(Hh.x0 - 36, Hh.dotX, E.inOutCubic(prog(t, 0.74, 1.52)));
}
const helloBase = (t) => L.hello.base0 - 86 * E.outExpo(prog(t, 2.0, 2.7));

function handles(t) {
  const u = spring(t - 4.8, { k: 110, c: 15 });
  return P_LIN.map((v, i) => lerp(v, P_OUT[i], u));
}

const DSG = [{ w: 900, h: 694 }, { w: 712, h: 337 }, { w: 346, h: 337 }, { w: 346, h: 337 }];
const DESK = [
  { x: 144, y: 222, w: 900, h: 694, r: 24 },
  { x: 1064, y: 222, w: 712, h: 337, r: 24 },
  { x: 1064, y: 579, w: 346, h: 337, r: 24 },
  { x: 1430, y: 579, w: 346, h: 337, r: 24 },
];
const MOB = [
  { x: 1270, y: 182, w: 390, h: 300, r: 20 },
  { x: 1270, y: 498, w: 390, h: 150, r: 20 },
  { x: 1270, y: 664, w: 187, h: 186, r: 20 },
  { x: 1473, y: 664, w: 187, h: 186, r: 20 },
];
const reflowU = (t, i) => E.inOutCubic(prog(t, 15.1 + i * 0.05, 15.9 + i * 0.05));
const cardRect = (t, i) => lerpRect(DESK[i], MOB[i], reflowU(t, i));
const cardScale = (i, r) => Math.min(r.w / DSG[i].w, r.h / DSG[i].h);
const frameU = (t) => E.inOutCubic(prog(t, 15.08, 15.9));
const frameRect = (t) =>
  lerpRect({ x: 120, y: 150, w: 1680, h: 790, r: 30 }, { x: 1250, y: 122, w: 430, h: 850, r: 56 }, frameU(t));

function wordPose(t) {
  const grid = { x: COL(0), base: L.big.base, size: L.big.size };
  if (t < 14.0) return grid;
  const A = cardRect(t, 0), s = cardScale(0, A);
  const bento = { x: A.x + 40 * s, base: A.y + 430 * s, size: 150 * s };
  const u = E.inOutCubic(prog(t, 14.0, 14.7));
  return { x: lerp(grid.x, bento.x, u), base: lerp(grid.base, bento.base, u), size: lerp(grid.size, bento.size, u) };
}
function tittlePose(t) {
  const p = wordPose(t), k = p.size / L.big.size;
  return { x: p.x + L.big.tit.dx * k, y: p.base + L.big.tit.dy * k, r: L.big.tit.r * k };
}

function swatchPose(t, i) {
  const grid = { x: COL(i), y: 760, w: 118, h: 118, r: 28 };
  if (t < 14.0) return grid;
  const B = cardRect(t, 1), s = cardScale(1, B);
  const cx = 40 + 34 + i * 92, cy = 178;
  const bento = { x: B.x + (cx - 34) * s, y: B.y + (cy - 34) * s, w: 68 * s, h: 68 * s, r: 34 * s };
  return lerpRect(grid, bento, E.inOutCubic(prog(t, 14.02 + i * 0.03, 14.72 + i * 0.03)));
}

function stepperX(t) {
  let x = NODES[0];
  for (let i = 1; i < ST.length; i++)
    if (t >= ST[i]) x = lerp(NODES[i - 1], NODES[i], spring(t - ST[i], { k: 260, c: 21 }));
  return x;
}
function stepperIndex(t) {
  let k = -1;
  for (let i = 0; i < ST.length; i++) if (t >= ST[i]) k = i;
  return k;
}

// explain scene cards
const CARDS = [
  { title: 'Micro-interactions', meta: 'hover · press · focus', c: PAL.olive },
  { title: 'Accessibility', meta: 'WCAG 2.2 · reduced motion', c: PAL.blue },
  { title: 'Design tokens', meta: 'color · type · motion', c: PAL.sand },
];
const cardBase = (i) => ({ x: 1000, y: 330 + i * 150, w: 760, h: 132, r: 24 });
const PANEL = { x: 1000, y: 178, w: 760, h: 744, r: 30 };
const expandU = (t) => E.outQuart(prog(t, 22.05, 22.55));
function thumbRect(t) {
  const b = cardBase(1), u = expandU(t);
  const card = explainCard(t, 1);
  const small = { x: card.x + 24, y: card.y + 24, w: 84, h: 84, r: 18 };
  const big = { x: PANEL.x, y: PANEL.y, w: PANEL.w, h: 210, r: 30 };
  return u <= 0 ? small : lerpRect({ x: b.x + 24, y: b.y + 24, w: 84, h: 84, r: 18 }, big, u);
}
function explainCard(t, i) {
  const b = cardBase(i);
  const lift = i === 1 ? 4 * E.outCubic(prog(t, 21.76, 21.92)) : 0;
  if (i === 1) return lerpRect({ ...b, y: b.y - lift }, PANEL, expandU(t));
  return b;
}
function badgePose(t) {
  const th = thumbRect(t);
  const u = expandU(t);
  return { x: th.x + th.w - lerp(6, 34, u), y: th.y + lerp(6, 34, u), r: lerp(11, 14, u) };
}

// cursor keyframes (one continuous hand across three scenes)
const CUR = [
  { t: 16.75, x: 1560, y: 1110 },
  { t: 17.15, x: 1046, y: 522, e: E.outCubic, lift: 50 },
  { t: 17.5, x: 1032, y: 514, e: E.inOutSine },
  { t: 17.85, x: 1032, y: 514 },
  { t: 18.35, x: 1212, y: 668, e: E.inOutCubic, lift: 24 },
  { t: 19.12, x: 1212, y: 668 },
  { t: 19.45, x: 928, y: 578, e: E.inOutCubic, lift: 40 },
  { t: 19.64, x: 928, y: 578 },
  { t: 20.1, x: 1030, y: 690, e: E.inOutSine },
  { t: 21.35, x: 1520, y: 1110 },
  { t: 21.76, x: 1392, y: 566, e: E.outCubic, lift: 40 },
  { t: 22.04, x: 1386, y: 560, e: E.inOutSine },
  { t: 22.5, x: 1600, y: 1000, e: E.inOutCubic },
  { t: 24.98, x: 1480, y: 1000 },
  { t: 25.2, x: 1120, y: 628, e: E.outCubic, lift: 30 },
];
function cursorState(t) {
  const vis = (a, b, fi = 0.15, fo = 0.2) => prog(t, a, a + fi) * (1 - prog(t, b - fo, b));
  const alpha = Math.max(vis(16.75, 20.25, 0.15, 0.3), vis(21.35, 22.6), t >= 24.98 && t < 25.5 ? 1 : 0);
  if (alpha <= 0) return null;
  let k = 0;
  while (k < CUR.length - 1 && t >= CUR[k + 1].t) k++;
  const a = CUR[k], b = CUR[k + 1];
  let x = a.x, y = a.y;
  if (b && t >= a.t) {
    const u = (b.e || E.linear)(prog(t, a.t, b.t));
    const p = arc(a, b, u, b.lift || 0);
    x = p.x; y = p.y;
  }
  const press = (t0) => E.outCubic(prog(t, t0, t0 + 0.06)) * (1 - E.outCubic(prog(t, t0 + 0.08, t0 + 0.2)));
  return { x, y, alpha, press: Math.max(press(17.5), press(19.5), press(22.0), press(25.22)) };
}

// ================================================================= hero choreography

let SEGS = null;
const seg = (t0, t1, f, extra = {}) => ({ t0, t1, f, ...extra });

function heroSegments() {
  const Hh = L.hello;
  const S0 = { x: 960, y: 540, r: R0, sx: 1, sy: 1, a: 1, smear: 1 };
  const writeY = Hh.base0 - R0;
  const pen = { x: Hh.x0 - 36, y: writeY };
  const origin = { x: G.x, y: G.y };
  const knob = (x) => ({ x, y: KNOB.y });

  return [
    seg(0, 0.18, () => S0),
    // anticipation: lean back before dashing left
    seg(0.18, 0.46, (t) => {
      const e = E.inOutSine(prog(t, 0.18, 0.46));
      return { ...S0, x: 960 + 18 * e, sx: 1 + 0.3 * e, sy: 1 - 0.24 * e };
    }),
    seg(0.46, 0.74, (t, S) => {
      const p = arc(S, pen, E.outCubic(prog(t, 0.46, 0.74)), 46);
      const k = 1 - E.outCubic(prog(t, 0.46, 0.58));
      return { ...S, ...p, sx: 1 + 0.3 * k, sy: 1 - 0.24 * k };
    }),
    // the pen: writes “Hi, I’m Claude” and becomes its full stop
    seg(0.74, 1.52, (t, S) => ({ ...S, sx: 1, sy: 1, x: helloPenX(t), y: writeY })),
    seg(1.52, 2.0, (t, S) => {
      const w = wobble(t - 1.52, 22, 9);
      return { ...S, sx: 1 - 0.3 * w, sy: 1 + 0.3 * w, y: Hh.base0 - R0 * (1 + 0.3 * w) };
    }),
    seg(2.0, 3.42, (t, S) => ({ ...S, sx: 1, sy: 1, x: Hh.dotX, y: helloBase(t) - R0 })),
    seg(3.42, 3.56, (t, S) => {
      const e = E.inOutSine(prog(t, 3.42, 3.56));
      return { ...S, sx: 1 + 0.2 * e, sy: 1 - 0.2 * e, y: helloBase(t) - R0 * (1 - 0.2 * e) };
    }),
    // the full stop drops off the sentence and lands on the graph origin
    seg(3.56, 4.1, (t, S) => ({ ...S, ...hop(S, origin, prog(t, 3.56, 4.1), 80), sx: 1, sy: 1 })),
    seg(4.1, 5.45, (t, S) => {
      const w = wobble(t - 4.1, 20, 8);
      return { ...S, x: G.x, y: G.y, sx: 1 + 0.34 * w, sy: 1 - 0.34 * w };
    }),
    // ride the curve
    seg(5.45, 6.25, (t, S) => {
      const u = prog(t, 5.45, 6.25);
      return { ...S, sx: 1, sy: 1, x: G.x + u * G.s, y: G.y - EF(u) * G.s };
    }),
    seg(6.25, 6.95, (t, S) => ({ ...S, ...arc(S, { x: TK.x0, y: TK.ys[2] }, E.inOutCubic(prog(t, 6.25, 6.95)), 170) })),
    seg(6.95, 7.0, (t, S) => S),
    seg(7.0, 8.45, (t, S) => ({ ...S, x: TK.x0 + (TK.x1 - TK.x0) * RACE[2](t - 7.0), y: TK.ys[2] })),
    // grow into a ball on the ground
    seg(8.45, 8.85, (t, S) => {
      const u = spring(t - 8.45, { k: 240, c: 22 });
      const r = lerp(R0, BR, u);
      return { ...S, r, y: lerp(TK.ys[2], GROUND - r, clamp(u)) };
    }),
    seg(8.85, 9.35, (t, S) => {
      const e = E.inOutSine(prog(t, 8.85, 9.35));
      const sy = 1 - 0.38 * e;
      return { ...S, r: BR, sx: 1 + 0.34 * e, sy, y: GROUND - BR * sy };
    }),
    seg(9.35, 10.0, (t, S) => {
      const u = prog(t, 9.35, 10.0);
      const p = hop({ x: S.x, y: GROUND - BR }, { x: 960, y: GROUND - BR }, u, 400);
      const k1 = prog(t, 9.35, 9.41), k2 = prog(t, 9.41, 9.62);
      const sy = t < 9.41 ? lerp(0.62, 1.36, E.outQuad(k1)) : lerp(1.36, 1, E.inOutSine(k2));
      return { ...S, ...p, sy, sx: 1 / sy, smear: u < 0.3 ? 0.3 : 0.9 };
    }),
    seg(10.0, 10.36, (t, S) => {
      const tau = t - 10.0;
      const sy = 1 - 0.46 * Math.exp(-9 * tau) * Math.cos(17 * tau);
      return { ...S, x: 960, sy, sx: 1 / sy, y: GROUND - BR * sy, smear: 1 };
    }),
    // leap into the specimen word and become the dot on the i
    seg(10.36, 10.9, (t, S) => {
      const u = prog(t, 10.36, 10.9);
      const tt = tittlePose(t);
      return { ...S, ...hop({ x: 960, y: GROUND - BR }, tt, u, 170), r: lerp(BR, tt.r, E.inOutCubic(u)), sx: 1, sy: 1 };
    }),
    seg(10.9, 16.42, (t, S) => {
      const tt = tittlePose(t);
      const w = wobble(t - 10.9, 22, 10);
      return { ...S, x: tt.x, y: tt.y, r: tt.r, sx: 1 + 0.3 * w, sy: 1 - 0.3 * w };
    }),
    // becomes the state indicator
    seg(16.42, 16.9, (t, S) => {
      const u = E.inOutCubic(prog(t, 16.42, 16.9));
      return { ...S, ...arc(S, { x: NODES[0], y: STEP_Y }, u, 140), r: lerp(S.r, 12, u), sx: 1, sy: 1 };
    }),
    seg(16.9, 18.95, (t, S) => {
      let y = STEP_Y;
      for (let i = 1; i < ST.length; i++) {
        const q = prog(t, ST[i], ST[i] + 0.2);
        if (q > 0 && q < 1) y = STEP_Y - 26 * Math.sin(Math.PI * q);
      }
      return { ...S, x: stepperX(t), y, r: 12 };
    }),
    // becomes the knob of the theme switch
    seg(18.95, 19.35, (t, S) => {
      const u = E.inOutCubic(prog(t, 18.95, 19.35));
      return { ...S, ...arc(S, knob(KNOB.l), u, 160), r: lerp(12, KNOB.R, u) };
    }),
    seg(19.35, 19.52, (t, S) => {
      const w = wobble(t - 19.35, 18, 9) * 0.5 + 0.18 * E.outCubic(prog(t, 19.5, 19.52));
      return { ...S, ...knob(KNOB.l), r: KNOB.R, sx: 1 + 0.25 * w, sy: 1 - 0.25 * w };
    }),
    seg(19.52, 20.75, (t, S) => ({
      ...S, sx: 1, sy: 1, y: KNOB.y, x: lerp(KNOB.l, KNOB.r, spring(t - 19.52, { k: 240, c: 17 })),
    })),
    // a notification badge on the card it wants you to open
    seg(20.75, 21.3, (t, S) => {
      const u = E.inOutCubic(prog(t, 20.75, 21.3));
      const b = badgePose(t);
      return { ...S, ...arc(S, b, u, 120), r: lerp(KNOB.R, b.r, u) };
    }),
    seg(21.3, 23.72, (t, S) => ({ ...S, ...badgePose(t) })),
    seg(23.72, 24.0, (t, S) => {
      const u = E.inOutCubic(prog(t, 23.72, 24.0));
      const d = L.mont[0];
      return { ...S, ...arc(S, d.dot, u, 90), r: lerp(S.r, d.r, u) };
    }),
    // the full stop of every word in the montage
    seg(24.0, 26.5, (t, S) => {
      const k = clamp(Math.floor((t - 24.0) / 0.5), 0, 3);
      const m = L.mont[k];
      const local = t - (24.0 + 0.5 * k);
      if (k > 0 && local < 0.16) {
        const p = L.mont[k - 1];
        const u = E.outCubic(local / 0.16);
        return { ...S, ...arc(p.dot, m.dot, u, 60), r: lerp(p.r, m.r, u) };
      }
      return { ...S, ...m.dot, r: m.r };
    }),
    // … and finally, the full stop of the signature
    seg(26.5, 27.0, (t, S) => {
      const u = E.inOutCubic(prog(t, 26.5, 27.0));
      return { ...S, ...arc(S, L.end.dot, u, 150), r: lerp(S.r, L.end.r, u) };
    }),
    seg(27.0, 29.3, (t, S) => {
      const w = wobble(t - 27.0, 20, 8);
      return { ...S, ...L.end.dot, r: L.end.r, sx: 1 + 0.3 * w, sy: 1 - 0.3 * w, y: L.end.dot.y + L.end.r * 0.3 * w };
    }),
    // back to where it all began — the loop point
    seg(29.3, 29.9, (t, S) => {
      const u = E.inOutCubic(prog(t, 29.3, 29.9));
      return { ...S, sx: 1, sy: 1, ...arc(S, S0, u, 40), r: lerp(L.end.r, R0, u) };
    }),
    seg(29.9, DURATION + 1, () => S0),
  ];
}

function buildHero() {
  SEGS = heroSegments();
  let S = { x: 960, y: 540, r: R0, sx: 1, sy: 1, a: 1, smear: 1 };
  for (const s of SEGS) {
    s.S = S;
    S = { ...S, ...s.f(s.t1, S) };
  }
}

export function hero(t) {
  t = clamp(t, 0, DURATION);
  for (const s of SEGS) if (t < s.t1) return { sx: 1, sy: 1, a: 1, smear: 1, ...s.S, ...s.f(t, s.S) };
  const s = SEGS[SEGS.length - 1];
  return { ...s.S, ...s.f(t, s.S) };
}

export function drawHero(ctx, t, th) {
  const s = hero(t);
  if (s.a <= 0) return;
  const p = hero(t - 1 / 60);
  const vx = (s.x - p.x) * 60, vy = (s.y - p.y) * 60;
  const disp = Math.hypot(vx, vy) / 60;
  const st = 1 + Math.min(1.8, (disp * 0.5) / (2 * s.r)) * (s.smear ?? 1);
  ctx.save();
  ctx.translate(s.x, s.y);
  if (st > 1.01) {
    const ang = Math.atan2(vy, vx);
    ctx.rotate(ang);
    ctx.translate(-(st - 1) * s.r * 0.55, 0);
    ctx.scale(st, 1 / Math.sqrt(st));
    ctx.rotate(-ang);
  }
  ctx.scale(s.sx ?? 1, s.sy ?? 1);
  circle(ctx, 0, 0, s.r);
  ctx.fillStyle = th.clay;
  ctx.globalAlpha = s.a;
  ctx.fill();
  ctx.restore();
}

export function drawCursor(ctx, t) {
  const c = cursorState(t);
  if (c) cursor(ctx, c.x, c.y, { alpha: c.alpha, press: c.press });
}

// ================================================================= world (light / dark)

export function world(t) {
  if (t >= 20.0 && t < 20.72) {
    const u = E.inOutQuart(prog(t, 20.0, 20.72));
    return { mode: 'mix', x: KNOB.r, y: KNOB.y, r: lerp(KNOB.R, 1250, u), edge: 1 - prog(t, 20.55, 20.72) };
  }
  if (t >= 20.72 && t < 26.0) return { mode: 'dark' };
  if (t >= 26.0 && t < 26.5) {
    const d = L.mont[3].dot;
    const u = E.inOutQuart(prog(t, 26.0, 26.5));
    return { mode: 'mix', x: d.x, y: d.y, r: lerp(1750, L.mont[3].r, u), edge: prog(t, 26.0, 26.1) };
  }
  return { mode: 'light' };
}

// ================================================================= helpers

function line2(ctx, t, tin, tout, x, y, list, size, { align = 'left', dur = 0.7, outDur = 0.38, alpha = 1 } = {}) {
  const pin = E.outExpo(prog(t, tin, tin + dur));
  const pout = E.inCubic(prog(t, tout, tout + outDur));
  if (pin <= 0 || pout >= 1) return;
  const w = spansWidth(list);
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  reveal(ctx, { x0: x0 - 30, x1: x0 + w + 60, top: y - size * 1.05, bottom: y + size * 0.32 }, pin, pout, () =>
    spans(ctx, list, x0, y, { alpha }),
  );
}

function pill(ctx, x, y, label, { font = F.mono(22), fg, bg, stroke, h = 46, pad = 20, alpha = 1, icon = null, iconColor }) {
  const tw = textW(label, font);
  const iw = icon ? h * 0.62 : 0;
  const w = tw + pad * 2 + iw;
  ctx.save();
  ctx.globalAlpha *= alpha;
  rrect(ctx, x, y - h / 2, w, h, h / 2);
  if (bg) { ctx.fillStyle = bg; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  if (icon === 'check') check(ctx, x + pad + iw * 0.35, y, h * 0.5, 1, iconColor || fg, 3);
  if (icon === 'cross') cross(ctx, x + pad + iw * 0.3, y, h * 0.62, 1, iconColor || fg, 3);
  text(ctx, label, x + pad + iw, y + 7.5 * (h / 46), { font, color: fg });
  ctx.restore();
  return w;
}

const pad2 = (n) => String(n).padStart(2, '0');

// ================================================================= scenes

function sHello(ctx, t, th) {
  if (t > 4.0) return;
  const Hh = L.hello;
  const base = helloBase(t);
  const n = Hh.g.length;

  // hello ping
  const pp = prog(t, 0.04, 0.9);
  if (pp > 0 && pp < 1) {
    for (let k = 0; k < 2; k++) {
      const q = clamp(pp * 1.25 - k * 0.25);
      if (q <= 0 || q >= 1) continue;
      circle(ctx, 960, 540, R0 + 150 * E.outCubic(q));
      ctx.strokeStyle = rgba(th.clay, 0.55 * (1 - q));
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  Hh.g.forEach((g, i) => {
    if (g.ch === ' ') return;
    const dt = t - Hh.times[i];
    if (dt <= 0) return;
    const s = spring(dt, { k: 320, c: 19 });
    let dy = (1 - s) * 72, sc = 0.3 + 0.7 * s, a = clamp(dt / 0.05), rot = 0;
    const te = 3.52 + (n - 1 - i) * 0.018;
    const pe = prog(t, te, te + 0.3);
    if (pe > 0) {
      dy += 70 * E.inCubic(pe);
      a *= 1 - E.inQuad(pe);
      rot = 0.22 * E.inCubic(pe) * (i % 2 ? 1 : -1);
    }
    ctx.save();
    ctx.translate(Hh.x0 + g.x + g.w / 2, base + dy);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    text(ctx, g.ch, -g.w / 2, 0, { font: Hh.font, color: th.fg, alpha: a });
    ctx.restore();
  });

  // “Every frame of this résumé is [code]”
  const l2 = L.l2, y2 = L.hello.base0 + 110;
  l2.items.forEach((it, i) => {
    const t0 = 2.2 + i * 0.06;
    const pin = E.outExpo(prog(t, t0, t0 + 0.6));
    const pe = prog(t, 3.56 + (6 - i) * 0.02, 3.86 + (6 - i) * 0.02);
    if (pin <= 0 || pe >= 1) return;
    const w = textW(it.s, l2.font);
    ctx.save();
    ctx.globalAlpha = 1 - E.inQuad(pe);
    ctx.translate(0, 60 * E.inCubic(pe));
    reveal(ctx, { x0: it.x - 20, x1: it.x + w + 30, top: y2 - 80, bottom: y2 + 26 }, pin, 0, () =>
      text(ctx, it.s, it.x, y2, { font: l2.font, color: th.muted }),
    );
    ctx.restore();
  });
  const pw = E.outExpo(prog(t, 2.58, 2.95));
  const pe = prog(t, 3.56, 3.86);
  if (pw > 0 && pe < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - E.inQuad(pe);
    ctx.translate(0, 60 * E.inCubic(pe));
    const px = l2.pillX, ph = 76;
    rrect(ctx, px, y2 - 56, l2.pill.w * pw, ph, 14);
    ctx.fillStyle = rgba(th.clay, 0.16);
    ctx.fill();
    const pin = E.outExpo(prog(t, 2.66, 3.2));
    reveal(ctx, { x0: px, x1: px + l2.pill.w, top: y2 - 56, bottom: y2 + 20 }, pin, 0, () =>
      text(ctx, 'code', px + l2.pill.padX, y2, { font: l2.codeFont, color: th.accent }),
    );
    // blinking caret
    const on = t > 3.0 && Math.floor((t - 3.0) / 0.25) % 2 === 0;
    if (on && pin > 0.9) {
      ctx.fillStyle = th.accent;
      ctx.fillRect(px + l2.pill.w - 12, y2 - 46, 4, 56);
    }
    ctx.restore();
  }
}

function sEase(ctx, t, th) {
  if (t < 3.95 || t > 6.7) return;
  const { x: gx, y: gy, s } = G;
  const out = E.inCubic(prog(t, 6.2, 6.55));
  const P = (x, y) => ({ x: gx + x * s, y: gy - y * s });

  // title
  const tIn = 4.12, tOut = 6.18;
  line2(ctx, t, tIn, tOut, 160, 452, [{ s: 'Easing turns math', font: F.sans(92, 700), tr: -3, color: th.fg }], 92);
  line2(ctx, t, tIn + 0.08, tOut + 0.04, 160, 566, [
    { s: 'into ', font: F.sans(92, 700), tr: -3, color: th.fg },
    { s: 'feeling.', font: F.serif(112), color: th.accent },
  ], 100);

  ctx.save();
  ctx.globalAlpha = 1 - out;

  // graph grid
  const pg = E.outCubic(prog(t, 4.08, 4.6));
  ctx.strokeStyle = th.hair;
  ctx.lineWidth = 1.5;
  for (let i = 1; i <= 4; i++) {
    const q = i / 4;
    line(ctx, gx, gy - q * s, gx + s * pg, gy - q * s); ctx.stroke();
    line(ctx, gx + q * s, gy, gx + q * s, gy - s * pg); ctx.stroke();
  }
  // axes + arrowheads
  const pa = E.outExpo(prog(t, 4.0, 4.5));
  ctx.strokeStyle = th.fg;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  line(ctx, gx, gy, gx + (s + 24) * pa, gy); ctx.stroke();
  line(ctx, gx, gy, gx, gy - (s + 24) * pa); ctx.stroke();
  if (pa > 0.95) {
    ctx.fillStyle = th.fg;
    ctx.beginPath(); ctx.moveTo(gx + s + 34, gy); ctx.lineTo(gx + s + 20, gy - 7); ctx.lineTo(gx + s + 20, gy + 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(gx, gy - s - 34); ctx.lineTo(gx - 7, gy - s - 20); ctx.lineTo(gx + 7, gy - s - 20); ctx.fill();
  }
  const la = prog(t, 4.3, 4.6);
  text(ctx, 'time', gx + s + 34, gy + 38, { font: F.mono(18), color: th.muted, align: 'right', alpha: la });
  text(ctx, 'progress', gx + 18, gy - s - 26, { font: F.mono(18), color: th.muted, alpha: la });

  // linear reference, dashed
  const [x1, y1, x2, y2] = handles(t);
  const morph = prog(t, 4.8, 5.0);
  if (morph > 0) {
    ctx.setLineDash([8, 10]);
    ctx.strokeStyle = th.faint;
    ctx.lineWidth = 2;
    line(ctx, gx, gy, gx + s, gy - s); ctx.stroke();
    ctx.setLineDash([]);
  }
  // the curve
  const pc = E.inOutCubic(prog(t, 4.3, 4.78));
  if (pc > 0) {
    const bz = bezier(x1, y1, x2, y2);
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const q = (i / 80) * pc;
      const pt = bz.pt(q), p = P(pt.x, pt.y);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.strokeStyle = th.fg;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  // handles
  const ph = E.outBack(prog(t, 4.6, 4.9));
  if (ph > 0) {
    const h1 = P(x1, y1), h2 = P(x2, y2), a0 = P(0, 0), a1 = P(1, 1);
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 2;
    line(ctx, a0.x, a0.y, h1.x, h1.y); ctx.stroke();
    line(ctx, a1.x, a1.y, h2.x, h2.y); ctx.stroke();
    for (const h of [h1, h2]) {
      circle(ctx, h.x, h.y, 11 * ph);
      ctx.fillStyle = th.bg; ctx.fill();
      ctx.lineWidth = 3.5; ctx.stroke();
    }
    circle(ctx, a1.x, a1.y, 6 * ph); ctx.fillStyle = th.fg; ctx.fill();
  }
  // live read-out bound to the handles
  const ra = prog(t, 4.62, 4.9);
  if (ra > 0) {
    spans(ctx, [
      { s: 'cubic-bezier(', font: F.mono(24), color: th.muted },
      { s: `${fmt(x1)}, ${fmt(y1)}, ${fmt(x2)}, ${fmt(y2)}`, font: F.mono(24), color: th.fg },
      { s: ')', font: F.mono(24), color: th.muted },
    ], gx + s / 2, gy + 92, { align: 'center', alpha: ra });
  }

  // preview track + spacing chart
  const ta = E.outCubic(prog(t, 4.45, 4.85));
  if (ta > 0) {
    const x0 = 160, x1t = 900, ty = 724;
    ctx.globalAlpha = (1 - out) * ta;
    ctx.strokeStyle = th.faint;
    ctx.lineWidth = 2;
    line(ctx, x0, ty, x0 + (x1t - x0) * ta, ty); ctx.stroke();
    line(ctx, x1t, ty - 14, x1t, ty + 14); ctx.stroke();
    text(ctx, 'preview', x0, ty - 34, { font: F.mono(18), color: th.muted });
    text(ctx, '800 ms', x1t, ty - 34, { font: F.mono(18), color: th.muted, align: 'right' });
    const u = prog(t, 5.45, 6.25);
    for (let k = 0; k <= 16; k++) {
      if (k / 16 > u + 1e-6) break;
      circle(ctx, lerp(x0, x1t, EF(k / 16)), ty + 30, 4);
      ctx.fillStyle = th.muted;
      ctx.fill();
    }
    circle(ctx, lerp(x0, x1t, EF(u)), ty, 13);
    ctx.fillStyle = th.fg;
    ctx.fill();
  }
  ctx.restore();
}

function sTracks(ctx, t, th) {
  if (t < 6.3 || t > 8.7) return;
  const out = E.inCubic(prog(t, 8.2, 8.55));
  line2(ctx, t, 6.52, 8.2, 160, 300, [{ s: 'Same distance.', font: F.sans(88, 700), tr: -3, color: th.fg }], 88);
  line2(ctx, t, 6.6, 8.24, 160, 402, [{ s: 'Different feeling.', font: F.serif(104), color: th.accent }], 96);

  const names = ['linear', 'ease-in-out', 'spring'];
  const verdict = ['mechanical', 'polite', 'alive'];
  const tagT = [7.92, 7.98, 8.04];
  ctx.save();
  ctx.globalAlpha = 1 - out;
  TK.ys.forEach((y, i) => {
    const pd = E.outExpo(prog(t, 6.56 + i * 0.07, 7.06 + i * 0.07));
    if (pd <= 0) return;
    ctx.strokeStyle = th.faint;
    ctx.lineWidth = 2;
    line(ctx, TK.x0, y, lerp(TK.x0, TK.x1, pd), y); ctx.stroke();
    line(ctx, TK.x1, y - 16, TK.x1, y + 16); ctx.stroke();
    text(ctx, names[i], TK.x0 - 48, y + 9, { font: F.mono(26), color: i === 2 ? th.accent : th.fg, align: 'right', alpha: pd });
    // spacing chart: one mark every 50 ms
    const el = t - 7.0;
    for (let k = 1; k <= 24; k++) {
      const tau = k * 0.05;
      if (tau > el) break;
      circle(ctx, TK.x0 + (TK.x1 - TK.x0) * RACE[i](tau), y + 32, 3.6);
      ctx.fillStyle = i === 2 ? rgba(th.clay, 0.8) : th.muted;
      ctx.fill();
    }
    if (i < 2) {
      const pop = E.outBack(prog(t, 6.62 + i * 0.07, 6.92 + i * 0.07));
      circle(ctx, TK.x0 + (TK.x1 - TK.x0) * RACE[i](el), y, R0 * pop);
      ctx.fillStyle = th.fg;
      ctx.fill();
    }
    const tp = E.outBack(prog(t, tagT[i], tagT[i] + 0.3));
    if (tp > 0) {
      ctx.save();
      ctx.translate(1540, y);
      ctx.scale(tp, tp);
      pill(ctx, 0, 0, verdict[i], {
        font: F.mono(22), fg: i === 2 ? th.accent : th.muted,
        bg: i === 2 ? rgba(th.clay, 0.16) : th.hair,
      });
      ctx.restore();
    }
  });
  ctx.restore();
}

const BW = ['Anticipation', 'Stretch', 'Arc', 'Squash'];
const BT = [8.85, 9.35, 9.55, 10.0];
function sBounce(ctx, t, th) {
  if (t < 8.35 || t > 10.75) return;
  const out = E.inCubic(prog(t, 10.3, 10.62));
  const font = F.sans(64, 600), tr = -1.5, gap = 58;
  const ws = BW.map((w) => textW(w, font, tr));
  const total = ws.reduce((a, b) => a + b, 0) + gap * 3;
  let x = 960 - total / 2;
  const xs = ws.map((w) => { const v = x; x += w + gap; return v; });
  let act = -1;
  BT.forEach((bt, i) => { if (t >= bt) act = i; });

  BW.forEach((w, i) => {
    const t0 = 8.42 + i * 0.05;
    const lit = prog(t, BT[i], BT[i] + 0.12);
    const color = mixc(th.muted, th.fg, lit);
    line2(ctx, t, t0, 10.3 + i * 0.02, xs[i], 300, [{ s: w, font, tr, color, alpha: 0.45 + 0.55 * lit }], 64);
    if (i < 3) line2(ctx, t, t0, 10.3, xs[i] + ws[i] + gap / 2 - 5, 300, [{ s: '·', font, color: th.faint }], 64);
  });
  if (act >= 0) {
    const from = act > 0 ? act - 1 : 0;
    const u = act > 0 ? spring(t - BT[act], { k: 260, c: 22 }) : E.outCubic(prog(t, BT[0], BT[0] + 0.25));
    const ux = lerp(xs[from], xs[act], u), uw = act > 0 ? lerp(ws[from], ws[act], u) : ws[0] * u;
    ctx.fillStyle = th.clay;
    ctx.globalAlpha = 1 - out;
    rrect(ctx, ux, 326, uw, 6, 3);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  line2(ctx, t, 8.6, 10.3, 960, 392, [
    { s: '4 of the 12 principles — ', font: F.mono(20), color: th.muted },
    { s: 'The Illusion of Life', font: F.serif(30), color: th.muted },
    { s: ', 1981', font: F.mono(20), color: th.muted },
  ], 30, { align: 'center' });

  // ground
  const pg = E.outExpo(prog(t, 8.45, 8.95)) * (1 - prog(t, 10.02, 10.3));
  if (pg > 0) {
    ctx.strokeStyle = th.faint;
    ctx.lineWidth = 2;
    line(ctx, 1620 - 1320 * pg, GROUND, 1620, GROUND); ctx.stroke();
  }
  // onion skin along the arc
  const ga = 1 - prog(t, 10.05, 10.5);
  if (t > 9.35 && ga > 0) {
    ctx.strokeStyle = rgba(th.clay, 0.42 * ga);
    ctx.lineWidth = 2;
    for (let k = 1; k < 13; k++) {
      const u = k / 13;
      if (9.35 + u * 0.65 > t) break;
      const p = hop({ x: TK.x1, y: GROUND - BR }, { x: 960, y: GROUND - BR }, u, 400);
      circle(ctx, p.x, p.y, BR * 0.92);
      ctx.stroke();
    }
  }
}

function sGrid(ctx, t, th) {
  if (t < 9.95 || t > 14.6) return;
  // shockwave from the impact
  const pw = prog(t, 10.0, 10.9);
  if (pw > 0 && pw < 1) {
    circle(ctx, 960, GROUND, 40 + 1300 * E.outCubic(pw));
    ctx.strokeStyle = rgba(th.clay, 0.5 * (1 - pw));
    ctx.lineWidth = 3 * (1 - pw) + 0.5;
    ctx.stroke();
  }
  // 12-column layout grid grows out of the impact point
  const fade = 1 - E.inOutSine(prog(t, 14.0, 14.5));
  for (let c = 0; c < 12; c++) {
    const cx = COL(c) + 59;
    const d = (Math.abs(cx - 960) / 840) * 0.3;
    const p = E.outExpo(prog(t, 10.02 + d, 10.7 + d));
    if (p <= 0) continue;
    ctx.fillStyle = th.grid;
    ctx.globalAlpha = fade;
    ctx.fillRect(COL(c), GROUND - GROUND * p, 118, (GROUND + 200) * p);
    text(ctx, String(c + 1), cx, 128, { font: F.mono(15), color: th.muted, align: 'center', alpha: fade * p * 0.9 });
    ctx.globalAlpha = 1;
  }

  // typographic guides
  const B = L.big;
  const gIn = E.outExpo(prog(t, 10.95, 11.5)), gOut = prog(t, 11.8, 12.1);
  if (gIn > 0 && gOut < 1) {
    const rows = [[B.base - B.cap, 'cap height'], [B.base - B.xh, 'x-height'], [B.base, 'baseline']];
    ctx.save();
    ctx.globalAlpha = 1 - gOut;
    rows.forEach(([y, lab], i) => {
      const p = E.outExpo(prog(t, 10.95 + i * 0.06, 11.5 + i * 0.06));
      ctx.strokeStyle = rgba(th.clay, 0.9);
      ctx.lineWidth = 1.5;
      line(ctx, COL(0), y, COL(0) + (B.w + 16) * p, y); ctx.stroke();
      text(ctx, lab, COL(8) + 4, y + 5, { font: F.mono(15), color: th.accent, alpha: p });
    });
    ctx.restore();
  }

  // modular type scale
  const sizes = [61, 49, 39, 31, 25, 20, 16];
  const names = ['Display', 'Heading 1', 'Heading 2', 'Heading 3', 'Title', 'Body', 'Caption'];
  const lOut = prog(t, 11.8, 12.1);
  if (t > 10.85 && lOut < 1) {
    let y = 296;
    sizes.forEach((sz, i) => {
      y += sz * 1.12 + 12;
      const p = E.outExpo(prog(t, 10.9 + i * 0.07, 11.5 + i * 0.07));
      const o = E.inCubic(clamp(lOut * 1.6 - i * 0.08));
      if (p <= 0 || o >= 1) return;
      ctx.save();
      ctx.globalAlpha = p * (1 - o);
      ctx.translate(40 * (1 - p) + 60 * o, 0);
      text(ctx, String(sz), COL(9), y, { font: F.mono(16), color: th.muted });
      text(ctx, names[i], COL(9) + 50, y, { font: F.sans(sz, 600), color: th.fg, tr: -sz * 0.02 });
      ctx.restore();
    });
    const p = prog(t, 11.4, 11.7) * (1 - lOut);
    text(ctx, '16 px × 1.25^n  ·  major third', COL(9), y + 48, { font: F.mono(16), color: th.accent, alpha: p });
  }

  // contrast check panel
  const cIn = E.outExpo(prog(t, 12.0, 12.5)), cOut = E.inCubic(prog(t, 13.95, 14.2));
  if (cIn > 0 && cOut < 1) {
    const sel = colorSel(t);
    const pairs = [[PAL.ink, 'Ink'], [PAL.clay, 'Clay'], [PAL.clay7, 'Clay 700']];
    const ratios = pairs.map(([c]) => contrast(c, PAL.paper));
    const prev = Math.max(0, sel.i - 1);
    const val = lerp(ratios[prev], ratios[sel.i], E.outExpo(prog(t, sel.t0, sel.t0 + 0.35)));
    const grade = wcag(ratios[sel.i]);
    ctx.save();
    ctx.globalAlpha = cIn * (1 - cOut);
    ctx.translate(0, 30 * (1 - cIn));
    const x0 = COL(9);
    text(ctx, 'CONTRAST ON PAPER', x0, 360, { font: F.mono(16), color: th.muted, tr: 2 });
    spans(ctx, [
      { s: fmt(val, 1), font: F.sans(128, 700), tr: -5, color: th.fg },
      { s: ' : 1', font: F.sans(56, 600), color: th.muted },
    ], x0 - 6, 498);
    const bp = E.outBack(prog(t, sel.t0 + 0.12, sel.t0 + 0.4));
    ctx.save();
    ctx.translate(x0, 560);
    ctx.scale(bp, bp);
    pill(ctx, 0, 0, grade.pass ? `${grade.label}  pass` : grade.label, {
      font: F.mono(22, 600), fg: '#fff', bg: grade.pass ? PAL.olive : PAL.clay7,
      icon: grade.pass ? 'check' : 'cross', h: 48,
    });
    ctx.restore();
    text(ctx, `${pairs[sel.i][1]} text on Paper`, x0, 628, { font: F.mono(20), color: th.fg });
    text(ctx, 'WCAG 2.2 · body text needs 4.5 : 1', x0, 664, { font: F.mono(16), color: th.muted });
    ctx.restore();
  }
}

function colorSel(t) {
  if (t < 12.5) return { i: 0, t0: 12.0 };
  if (t < 13.0) return { i: 1, t0: 12.5 };
  return { i: 2, t0: 13.0 };
}
function wordColor(t, th) {
  const cols = [th.fg, PAL.clay, PAL.clay7];
  if (t < 12.5) return th.fg;
  if (t < 13.0) return mixc(cols[0], cols[1], prog(t, 12.5, 12.66));
  return mixc(cols[1], cols[2], prog(t, 13.0, 13.16));
}

const HANDOFF = 14.9; // after this the word and swatches live inside their bento cards

function sWord(ctx, t, th) {
  if (t < 10.3 || t >= HANDOFF) return;
  drawBigWord(ctx, t, th);
  drawSwatches(ctx, t, th);
}

function drawBigWord(ctx, t, th) {
  const B = L.big, p = wordPose(t), k = p.size / B.size;
  const font = F.sans(p.size, 800);
  const col = wordColor(t, th);
  B.g.forEach((g, i) => {
    const t0 = 10.36 + i * 0.035;
    const pin = E.outExpo(prog(t, t0, t0 + 0.55));
    if (pin <= 0) return;
    const gx = p.x + g.x * k;
    reveal(ctx, { x0: gx - 40, x1: gx + g.w * k + 40, top: p.base - p.size * 1.02, bottom: p.base + p.size * 0.3 }, pin, 0, () =>
      text(ctx, g.ch, gx, p.base, { font, color: col }),
    );
  });
}

function drawSwatches(ctx, t, th) {
  const sw = [PAL.ink, PAL.clay, PAL.clay7, PAL.blue, PAL.olive, PAL.sand];
  const names = ['Ink', 'Clay', 'Clay 700', 'Blue', 'Olive', 'Sand'];
  sw.forEach((c, i) => {
    const pop = E.outBack(prog(t, 11.92 + i * 0.05, 12.25 + i * 0.05));
    if (pop <= 0) return;
    const r = swatchPose(t, i);
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(pop, pop);
    rrect(ctx, -r.w / 2, -r.h / 2, r.w, r.h, r.r);
    ctx.fillStyle = c;
    ctx.fill();
    if (c === PAL.sand) { ctx.strokeStyle = th.hair; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.restore();
    const la = pop * (1 - prog(t, 14.0, 14.25));
    if (la > 0) {
      text(ctx, names[i], r.x, r.y + r.h + 32, { font: F.mono(16), color: th.fg, alpha: la });
      text(ctx, c.toUpperCase(), r.x, r.y + r.h + 56, { font: F.mono(14, 400), color: th.muted, alpha: la });
    }
  });
  // focus ring on the swatch under test
  const ra = prog(t, 12.0, 12.15) * (1 - prog(t, 13.9, 14.05));
  if (ra > 0) {
    const sel = colorSel(t);
    const x = lerp(COL(Math.max(0, sel.i - 1)), COL(sel.i), spring(t - sel.t0, { k: 280, c: 22 }));
    ctx.save();
    ctx.globalAlpha *= ra;
    rrect(ctx, x - 9, 760 - 9, 136, 136, 36);
    ctx.strokeStyle = th.fg;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}

function clipFrame(ctx, t) {
  const f = frameRect(t);
  rrect(ctx, f.x, f.y, f.w, f.h, f.r);
  ctx.clip();
}

function sBento(ctx, t, th) {
  if (t < 14.0 || t > 16.8) return;
  const fu = frameU(t);
  const fOut = E.inCubic(prog(t, 16.3, 16.62));

  // title, uncovered as the viewport narrows
  line2(ctx, t, 15.42, 16.18, 160, 470, [{ s: 'Layouts that', font: F.sans(96, 700), tr: -3, color: th.fg }], 96);
  line2(ctx, t, 15.5, 16.22, 160, 590, [{ s: 'reflow.', font: F.serif(128), color: th.accent }], 110);
  const ra = prog(t, 15.5, 15.8) * (1 - prog(t, 16.18, 16.36));
  if (ra > 0) {
    const vw = Math.round(lerp(1440, 390, fu));
    spans(ctx, [
      { s: 'viewport  ', font: F.mono(22), color: th.muted },
      { s: `${vw} px`, font: F.mono(22, 600), color: th.fg },
    ], 160, 676, { alpha: ra });
    const on = vw < 600;
    const ap = E.outBack(prog(t, 15.62, 15.9));
    ctx.save();
    ctx.globalAlpha = ra;
    ctx.translate(160, 732);
    ctx.scale(ap, ap);
    pill(ctx, 0, 0, '@media (width < 600px)', {
      font: F.mono(20), fg: on ? th.accent : th.muted, bg: on ? rgba(th.clay, 0.14) : null,
      stroke: on ? rgba(th.clay, 0.6) : th.faint, icon: on ? 'check' : null, iconColor: th.accent,
    });
    ctx.restore();
  }

  // the frame (desktop window → phone)
  const fa = E.outCubic(prog(t, 14.12, 14.5)) * (1 - fOut);
  if (fa <= 0) return;
  const fr = frameRect(t);
  ctx.save();
  ctx.globalAlpha = fa;
  const sc = lerp(1.02, 1, E.outCubic(prog(t, 14.12, 14.6)));
  ctx.translate(fr.x + fr.w / 2, fr.y + fr.h / 2);
  ctx.scale(sc, sc);
  ctx.translate(-(fr.x + fr.w / 2), -(fr.y + fr.h / 2));
  ctx.shadowColor = th.shadow;
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  rrect(ctx, fr.x, fr.y, fr.w, fr.h, fr.r);
  ctx.fillStyle = th.page;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = th.faint;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // chrome
  const da = 1 - clamp(fu * 3);
  if (da > 0) {
    for (let i = 0; i < 3; i++) {
      circle(ctx, fr.x + 30 + i * 22, fr.y + 26, 6);
      ctx.fillStyle = rgba(th.fg, 0.16 * da);
      ctx.fill();
    }
    rrect(ctx, fr.x + fr.w / 2 - 200, fr.y + 14, 400, 26, 13);
    ctx.fillStyle = rgba(th.fg, 0.06 * da);
    ctx.fill();
    text(ctx, 'claude.design/resume', fr.x + fr.w / 2, fr.y + 32, { font: F.mono(14, 400), color: th.muted, align: 'center', alpha: da });
  }
  const ma = clamp(fu * 3 - 2);
  if (ma > 0) {
    rrect(ctx, fr.x + fr.w / 2 - 56, fr.y + 18, 112, 30, 15);
    ctx.fillStyle = rgba(th.fg, 0.9 * ma);
    ctx.fill();
  }
  ctx.save();
  rrect(ctx, fr.x, fr.y, fr.w, fr.h, fr.r);
  ctx.clip();
  const labels = ['TYPE', 'COLOR', 'EASING', 'SPRING'];
  for (const i of [1, 2, 3, 0]) {
    const r = cardRect(t, i), s = cardScale(i, r);
    const ca = E.outCubic(prog(t, 14.22 + i * 0.06, 14.62 + i * 0.06));
    if (ca <= 0) continue;
    ctx.save();
    const cs = lerp(0.94, 1, ca);
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(cs, cs);
    ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    ctx.globalAlpha = fa * ca;
    ctx.shadowColor = th.shadow;
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    rrect(ctx, r.x, r.y, r.w, r.h, r.r);
    ctx.fillStyle = th.card;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = th.hair;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    rrect(ctx, r.x, r.y, r.w, r.h, r.r);
    ctx.clip();
    if (t >= HANDOFF && i === 0) drawBigWord(ctx, t, th);
    if (t >= HANDOFF && i === 1) drawSwatches(ctx, t, th);
    // content in design units
    ctx.translate(r.x, r.y);
    ctx.scale(s, s);
    text(ctx, labels[i], 40, 62, { font: F.mono(20), color: th.muted, tr: 3 });
    const cp = E.inOutCubic(prog(t, 14.5 + i * 0.08, 15.1 + i * 0.08));
    if (i === 0) {
      [620, 540, 360].forEach((w, k) => {
        rrect(ctx, 40, 506 + k * 40, w * cp, 14, 7);
        ctx.fillStyle = th.hair;
        ctx.fill();
      });
      text(ctx, 'Inter Tight 800  ·  −4% tracking', 40, 650, { font: F.mono(18), color: th.muted, alpha: cp });
    }
    if (i === 1) {
      check(ctx, 52, 283, 26, cp, th.accent, 3.5);
      text(ctx, 'every text pair passes AA', 78, 290, { font: F.mono(20), color: th.fg, alpha: cp });
    }
    if (i === 2 || i === 3) {
      const bx = 40, by = 290, bw = 266, bh = 170;
      ctx.strokeStyle = th.hair;
      ctx.lineWidth = 2;
      line(ctx, bx, by, bx + bw, by); ctx.stroke();
      line(ctx, bx, by, bx, by - bh); ctx.stroke();
      ctx.beginPath();
      const n = 60;
      for (let q = 0; q <= n * cp; q++) {
        const u = q / n;
        const v = i === 2 ? EF(u) : spring(u * 1.4, { k: 100, c: 7 });
        const px = bx + u * bw, py = by - v * bh * 0.82;
        q ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.strokeStyle = i === 2 ? th.fg : th.accent;
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.stroke();
      if (i === 3) {
        ctx.setLineDash([6, 8]);
        ctx.strokeStyle = th.faint;
        ctx.lineWidth = 2;
        line(ctx, bx, by - bh * 0.82, bx + bw, by - bh * 0.82); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}

function sStates(ctx, t, th) {
  if (t < 15.8 || t > 19.35) return;
  const out = E.inCubic(prog(t, 18.84, 19.1));

  // title + stepper
  line2(ctx, t, 16.72, 18.84, 960, 250, [
    { s: 'Every state, ', font: F.sans(88, 700), tr: -3, color: th.fg },
    { s: 'designed.', font: F.serif(104), color: th.accent },
  ], 96, { align: 'center' });

  const sa = E.outCubic(prog(t, 16.6, 16.95)) * (1 - out);
  if (sa > 0) {
    ctx.save();
    ctx.globalAlpha = sa;
    ctx.translate(0, 24 * out);
    const k = stepperIndex(t);
    const hx = t >= 16.9 ? stepperX(t) : NODES[0];
    ctx.strokeStyle = th.faint;
    ctx.lineWidth = 3;
    line(ctx, NODES[0], STEP_Y, lerp(NODES[0], NODES[4], E.outExpo(prog(t, 16.6, 17.1))), STEP_Y); ctx.stroke();
    if (t >= 16.9) {
      ctx.strokeStyle = th.fg;
      line(ctx, NODES[0], STEP_Y, hx, STEP_Y); ctx.stroke();
    }
    const labs = ['Idle', 'Hover', 'Pressed', 'Loading', 'Success'];
    const tim = ['rest', '150 ms', '80 ms', 'under 1 s', 'spring'];
    NODES.forEach((nx, i) => {
      const p = E.outBack(prog(t, 16.62 + i * 0.05, 16.92 + i * 0.05));
      const on = i <= k;
      circle(ctx, nx, STEP_Y, 7 * p);
      ctx.fillStyle = on ? th.fg : th.bg;
      ctx.fill();
      ctx.strokeStyle = on ? th.fg : th.faint;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      const lit = i === k ? 1 : 0;
      text(ctx, labs[i], nx, STEP_Y + 62, { font: F.sans(30, 600), color: on ? th.fg : th.muted, align: 'center', alpha: p * (on ? 1 : 0.6) });
      text(ctx, tim[i], nx, STEP_Y + 96, { font: F.mono(17), color: lit ? th.accent : th.muted, align: 'center', alpha: p * 0.9 });
    });
    ctx.restore();
  }
  drawButton(ctx, t, th, out);
}

function drawButton(ctx, t, th, out) {
  const a0 = E.outCubic(prog(t, 15.85, 16.1));
  const ia = a0 * (1 - out);
  if (ia <= 0) return;
  const cta = { x: 1270, y: 872, w: 390, h: 72, r: 36 };
  const big = { x: 740, y: 438, w: 440, h: 124, r: 62 };
  const mu = E.inOutCubic(prog(t, 16.35, 16.85));
  const base = lerpRect({ ...cta, y: cta.y + 60 * (1 - a0) }, big, mu);
  const toCircle = E.inOutCubic(prog(t, 17.62, 17.9));
  const back = spring(t - 18.52, { k: 190, c: 17 });
  const w = lerp(lerp(base.w, base.h, toCircle), 440, t >= 18.52 ? back : 0);
  const cx = base.x + base.w / 2, cy = base.y + base.h / 2;
  const hv = E.outCubic(prog(t, 17.12, 17.27)) * (1 - toCircle);
  const pr = E.outCubic(prog(t, 17.5, 17.58)) * (1 - E.outCubic(prog(t, 17.58, 17.7)));
  const sc = 1 - 0.05 * pr;
  const ok = E.outCubic(prog(t, 18.3, 18.5));
  const bg = mixc(mixc(th.fg, th.muted, 0.18 * hv), PAL.olive, ok);

  ctx.save();
  ctx.globalAlpha = ia;
  if (t < 16.35) clipFrame(ctx, t);
  ctx.translate(cx, cy - 6 * hv);
  ctx.scale(sc, sc);
  ctx.shadowColor = th.shadow;
  ctx.shadowBlur = 18 + 34 * hv;
  ctx.shadowOffsetY = 8 + 12 * hv;
  rrect(ctx, -w / 2, -base.h / 2, w, base.h, base.h / 2);
  ctx.fillStyle = rgba(bg);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  const fs = lerp(26, 44, mu);
  const la = 1 - prog(t, 17.62, 17.72);
  if (la > 0) text(ctx, 'Hire Claude', 0, fs * 0.36, { font: F.sans(fs, 600), color: th.onFg, align: 'center', tr: -0.5, alpha: la });
  // spinner
  const sp = prog(t, 17.78, 17.9) * (1 - prog(t, 18.28, 18.34));
  if (sp > 0) {
    const a = (t - 17.78) * Math.PI * 2 * 1.4;
    const len = Math.PI * (0.35 + 0.55 * (0.5 + 0.5 * Math.sin((t - 17.78) * 7)));
    ctx.beginPath();
    ctx.arc(0, 0, 32, a, a + len);
    ctx.strokeStyle = rgba(th.onFg, sp);
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  // success
  const cp = E.outCubic(prog(t, 18.32, 18.55));
  if (cp > 0) {
    const tw = textW('Hired', F.sans(44, 600), -0.5);
    const ex = t >= 18.52 ? back : 0;
    const ix = lerp(0, -tw / 2 - 12, ex);
    check(ctx, ix, 2, 50, cp, th.onFg, 7);
    text(ctx, 'Hired', ix + 34, 16, { font: F.sans(44, 600), color: th.onFg, tr: -0.5, alpha: prog(t, 18.6, 18.8) });
  }
  ctx.restore();
}

function sToggle(ctx, t, th) {
  if (t < 19.0 || t > 21.1) return;
  const ain = E.outCubic(prog(t, 19.12, 19.42));
  const out = E.inCubic(prog(t, 20.72, 21.02));
  const a = ain * (1 - out);
  if (a <= 0) return;
  const on = E.outCubic(prog(t, 19.55, 19.78));
  ctx.save();
  ctx.globalAlpha = a;
  const cx = 960, cy = KNOB.y, w = 216, h = 112;
  const s = lerp(0.85, 1, E.outBack(prog(t, 19.12, 19.46)));
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  rrect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fillStyle = rgba(mixc(th.name === 'light' ? '#E4DED2' : '#2A2926', th.fg, on));
  ctx.fill();
  ctx.strokeStyle = th.hair;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // labels (colour + text + position: never colour alone)
  text(ctx, 'Light', cx - 152, cy + 13, { font: F.sans(38, 600), color: mixc(th.fg, th.muted, on), align: 'right' });
  text(ctx, 'Dark', cx + 152, cy + 13, { font: F.sans(38, 600), color: mixc(th.muted, th.fg, on), align: 'left' });
  ctx.restore();

  // code line with a value swap
  ctx.save();
  ctx.globalAlpha = a;
  const f = F.mono(30);
  const pre = 'color-scheme: ';
  const v0 = 'light', v1 = 'dark';
  const total = textW(pre + v0 + ';', f);
  const x0 = 960 - total / 2, y = 402;
  text(ctx, pre, x0, y, { font: f, color: th.muted });
  const vx = x0 + textW(pre, f);
  const sw = E.inOutCubic(prog(t, 19.6, 19.85));
  reveal(ctx, { x0: vx - 4, x1: vx + 200, top: y - 36, bottom: y + 12 }, 1, sw, () => text(ctx, v0, vx, y, { font: f, color: th.fg }));
  reveal(ctx, { x0: vx - 4, x1: vx + 200, top: y - 36, bottom: y + 12 }, sw, 0, () => text(ctx, v1, vx, y, { font: f, color: th.accent }));
  text(ctx, ';', vx + lerp(textW(v0, f), textW(v1, f), sw), y, { font: f, color: th.muted });
  text(ctx, 'view transition  ·  clip-path: circle()', 960, 720, { font: F.mono(18), color: th.muted, align: 'center', alpha: prog(t, 19.3, 19.6) });
  ctx.restore();
}

function sExplain(ctx, t, th) {
  if (t < 20.8 || t > 24.1) return;
  const out = E.inCubic(prog(t, 23.7, 23.98));

  // thesis
  line2(ctx, t, 21.1, 23.7, 160, 432, [{ s: 'Motion', font: F.sans(112, 700), tr: -4, color: th.fg }], 112);
  line2(ctx, t, 21.18, 23.74, 160, 560, [
    { s: 'that ', font: F.sans(112, 700), tr: -4, color: th.fg },
    { s: 'explains,', font: F.serif(128), color: th.accent },
  ], 112);
  line2(ctx, t, 21.26, 23.78, 160, 688, [{ s: 'not decorates.', font: F.sans(112, 700), tr: -4, color: th.muted }], 112);

  ctx.save();
  ctx.globalAlpha = 1 - out;
  const eu = expandU(t);
  // sibling cards step aside
  [0, 2].forEach((i) => {
    const b = cardBase(i);
    const ca = E.outCubic(prog(t, 20.85 + i * 0.08, 21.3 + i * 0.08));
    const go = E.inOutCubic(prog(t, 22.0, 22.36));
    if (ca <= 0 || go >= 1) return;
    ctx.save();
    ctx.globalAlpha *= ca * (1 - go);
    ctx.translate(0, 40 * (1 - ca) + (i === 0 ? -60 : 60) * go);
    drawListCard(ctx, b, CARDS[i], th, 0);
    ctx.restore();
  });
  // the chosen card becomes the page (shared element)
  const ca = E.outCubic(prog(t, 20.93, 21.38));
  if (ca > 0) {
    const r = explainCard(t, 1);
    const hov = E.outCubic(prog(t, 21.76, 21.92));
    ctx.save();
    ctx.globalAlpha *= ca;
    ctx.translate(0, 40 * (1 - ca));
    ctx.shadowColor = th.shadow;
    ctx.shadowBlur = 20 + 40 * Math.max(hov, eu);
    ctx.shadowOffsetY = 8 + 14 * Math.max(hov, eu);
    rrect(ctx, r.x, r.y, r.w, r.h, r.r);
    ctx.fillStyle = rgba(mixc(th.card, th.fg, 0.04 * hov * (1 - eu)));
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = th.faint;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const tr = thumbRect(t);
    const br = lerp(18, 0, eu);
    ctx.beginPath();
    ctx.roundRect(tr.x, tr.y, tr.w, tr.h, [tr.r, tr.r, br, br]);
    ctx.fillStyle = CARDS[1].c;
    ctx.fill();
    // title + meta travel with the card
    const tx = lerp(r.x + 132, PANEL.x + 44, eu), ty = lerp(r.y + 62, PANEL.y + 290, eu);
    text(ctx, CARDS[1].title, tx, ty, { font: F.sans(lerp(34, 60, eu), 600), color: th.fg, tr: -1 });
    text(ctx, CARDS[1].meta, tx, lerp(r.y + 100, PANEL.y + 336, eu), { font: F.mono(lerp(19, 21, eu)), color: th.muted });
    if (eu < 0.3) text(ctx, '›', r.x + r.w - 44, r.y + r.h / 2 + 14, { font: F.sans(44, 500), color: th.muted, alpha: 1 - eu / 0.3 });
    // checklist
    const items = ['Contrast above 4.5 : 1', 'Honors reduced motion', 'Never color alone', 'Visible focus states'];
    items.forEach((s, k) => {
      const p = E.outCubic(prog(t, 22.5 + k * 0.14, 22.85 + k * 0.14));
      if (p <= 0) return;
      const y = PANEL.y + 440 + k * 72;
      ctx.save();
      ctx.globalAlpha *= p;
      ctx.translate(20 * (1 - p), 0);
      circle(ctx, PANEL.x + 62, y - 10, 18);
      ctx.fillStyle = PAL.olive;
      ctx.fill();
      check(ctx, PANEL.x + 62, y - 10, 22, E.outCubic(prog(t, 22.58 + k * 0.14, 22.8 + k * 0.14)), '#fff', 3.5);
      text(ctx, s, PANEL.x + 100, y, { font: F.sans(32, 500), color: th.fg, tr: -0.5 });
      ctx.restore();
    });
    ctx.restore();
  }
  // ghost of where it came from
  const ga = prog(t, 22.05, 22.15) * (1 - prog(t, 22.55, 23.0));
  if (ga > 0) {
    const b = cardBase(1);
    ctx.setLineDash([10, 8]);
    rrect(ctx, b.x, b.y, b.w, b.h, b.r);
    ctx.strokeStyle = rgba(th.clay, 0.9 * ga);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  text(ctx, 'shared-element transition  ·  450 ms  ·  ease-out', PANEL.x, PANEL.y + PANEL.h + 42, {
    font: F.mono(17), color: th.muted, alpha: prog(t, 22.3, 22.6),
  });
  ctx.restore();
}

function drawListCard(ctx, r, c, th) {
  ctx.shadowColor = th.shadow;
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  rrect(ctx, r.x, r.y, r.w, r.h, r.r);
  ctx.fillStyle = th.card;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = th.faint;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  rrect(ctx, r.x + 24, r.y + 24, 84, 84, 18);
  ctx.fillStyle = c.c;
  ctx.fill();
  text(ctx, c.title, r.x + 132, r.y + 62, { font: F.sans(34, 600), color: th.fg, tr: -1 });
  text(ctx, c.meta, r.x + 132, r.y + 100, { font: F.mono(19), color: th.muted });
  text(ctx, '›', r.x + r.w - 44, r.y + r.h / 2 + 14, { font: F.sans(44, 500), color: th.muted });
}

function sMontage(ctx, t, th) {
  if (th.name !== 'dark' || t < 24.0 || t > 26.55) return;
  const k = clamp(Math.floor((t - 24.0) / 0.5), 0, 3);
  const m = L.mont[k];
  const local = t - (24.0 + 0.5 * k);
  const pin = E.outExpo(prog(local, 0, 0.3));
  const box = { x0: m.x0 - 60, x1: m.x0 + m.w + 60, top: m.base - 330, bottom: m.base + 110 };
  if (k === 1) {
    // echo trails: motion, literally
    for (let e = 4; e >= 1; e--) {
      const off = -e * 70 * (1 - E.outExpo(prog(local, 0, 0.42)));
      text(ctx, m.s, m.x0 + off, m.base, { font: m.font, tr: m.tr, color: th.accent, alpha: 0.16 * (1 - e / 5) * (1 - prog(local, 0.2, 0.45)) });
    }
  }
  let press = 0;
  if (k === 2) press = E.outCubic(prog(t, 25.22, 25.28)) * (1 - E.outCubic(prog(t, 25.3, 25.45)));
  ctx.save();
  ctx.translate(960, m.base - 80);
  ctx.scale(1 - 0.035 * press, 1 - 0.035 * press);
  ctx.translate(-960, -(m.base - 80));
  reveal(ctx, box, pin, 0, () => text(ctx, m.s, m.x0, m.base, { font: m.font, tr: m.tr, color: k === 1 ? th.accent : th.fg }));
  ctx.restore();
  if (k === 3) {
    // redlines: the system underneath
    const p = E.outExpo(prog(local, 0.08, 0.4));
    const asc = 150;
    ctx.save();
    ctx.globalAlpha = p;
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = rgba(th.clay, 0.8);
    ctx.lineWidth = 1.5;
    rrect(ctx, m.x0 - 8, m.base - asc - 8, m.w + 16, asc + 16, 2);
    ctx.stroke();
    ctx.setLineDash([]);
    line(ctx, m.x0 - 8, m.base - asc - 42, m.x0 + m.w + 8, m.base - asc - 42); ctx.stroke();
    text(ctx, `${Math.round(m.w)} px`, 960, m.base - asc - 56, { font: F.mono(18), color: th.accent, align: 'center' });
    text(ctx, '8 pt grid · 4 tokens · 1 source of truth', 960, m.base + 90, { font: F.mono(20), color: th.muted, align: 'center' });
    ctx.restore();
  }
}

function sEnd(ctx, t, th) {
  if (th.name !== 'light' || t < 26.4) return;
  const E_ = L.end;
  const ex = (i) => 29.15 + i * 0.05;
  line2(ctx, t, 26.55, ex(0), 960, 320, [{ s: 'THE RÉSUMÉ OF', font: F.mono(22, 500), tr: 6, color: th.accent }], 26, { align: 'center' });
  E_.g.forEach((g, i) => {
    const t0 = 26.6 + i * 0.045;
    const pin = E.outExpo(prog(t, t0, t0 + 0.6));
    const pout = E.inCubic(prog(t, ex(1), ex(1) + 0.38));
    const gx = E_.x0 + g.x;
    reveal(ctx, { x0: gx - 40, x1: gx + g.w + 60, top: E_.base - 280, bottom: E_.base + 70 }, pin, pout, () =>
      text(ctx, g.ch, gx, E_.base, { font: E_.font, color: th.fg }),
    );
  });
  line2(ctx, t, 27.05, ex(2), 960, 676, [
    { s: 'Graphic  ·  Motion  ·  Interaction Designer', font: F.sans(40, 500), tr: -0.5, color: th.muted },
  ], 40, { align: 'center' });
  line2(ctx, t, 27.22, ex(3), 960, 772, [
    { s: 'No hands. Just math, taste & ', font: F.serif(60), color: th.fg },
    { s: '1,800 frames.', font: F.serif(60), color: th.accent },
  ], 60, { align: 'center' });
  line2(ctx, t, 27.42, ex(4), 960, 900, [
    { s: 'every frame written in code  ·  canvas 2d  ·  1920×1080  ·  60 fps  ·  sound synthesized from sine waves', font: F.mono(17), color: th.muted },
  ], 20, { align: 'center' });
}

// ================================================================= HUD

function hud(ctx, t, th) {
  const a = prog(t, 0.25, 0.75) * (1 - prog(t, 29.35, 29.85));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  // registration marks
  ctx.strokeStyle = th.faint;
  ctx.lineWidth = 1.5;
  const m = 34, l = 18;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * l);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * l, y);
    ctx.stroke();
  }
  const f = F.mono(16, 500);
  spans(ctx, [
    { s: 'CLAUDE', font: F.mono(16, 600), tr: 3, color: th.fg, pad: 10 },
    { s: '/  MOTION RÉSUMÉ', font: f, tr: 3, color: th.muted },
  ], 72, 74);
  const fr = Math.min(1799, Math.floor(t * 60));
  const sec = Math.floor(t);
  const tc = `00:${pad2(sec)}.${pad2(Math.floor((t - sec) * 100))}`;
  spans(ctx, [
    { s: tc, font: f, tr: 1, color: th.fg, pad: 18 },
    { s: `F ${String(fr).padStart(4, '0')}`, font: f, tr: 1, color: th.muted },
  ], W - 72, 74, { align: 'right' });

  // chapter label with a rolling transition
  let ci = 0;
  CHAPTERS.forEach((c, i) => { if (t >= c[0]) ci = i; });
  const [ct, num, name] = CHAPTERS[ci];
  const roll = E.outExpo(prog(t, ct, ct + 0.5));
  const y = H - 60;
  const draw = (c, dy, al) =>
    spans(ctx, [
      { s: c[1], font: F.mono(16, 600), tr: 2, color: th.accent, pad: 12 },
      { s: `—  ${c[2]}`, font: f, tr: 3, color: th.muted },
    ], 72, y + dy, { alpha: al });
  ctx.save();
  ctx.beginPath();
  ctx.rect(60, y - 24, 480, 34);
  ctx.clip();
  if (ci > 0 && roll < 1) draw(CHAPTERS[ci - 1], -26 * roll, 1 - roll);
  draw([ct, num, name], ci > 0 ? 26 * (1 - roll) : 0, ci > 0 ? roll : 1);
  ctx.restore();

  // beat indicator
  const beat = Math.floor(t / 0.5);
  const ph = t - beat * 0.5;
  for (let i = 0; i < 4; i++) {
    const on = beat % 4 === i;
    const r = on ? 5 + 3 * Math.exp(-ph * 14) : 4;
    circle(ctx, W - 72 - (3 - i) * 22, y - 6, r);
    ctx.fillStyle = on ? th.clay : th.faint;
    ctx.fill();
  }
  text(ctx, '120 BPM', W - 72 - 3 * 22 - 22, y, { font: f, tr: 2, color: th.muted, align: 'right' });

  // progress hairline
  ctx.fillStyle = th.hair;
  ctx.fillRect(72, H - 34, W - 144, 2);
  ctx.fillStyle = rgba(th.clay, 0.9);
  ctx.fillRect(72, H - 34, (W - 144) * clamp(t / DURATION), 2);
  ctx.restore();
}

// ================================================================= compositor

const SCENES = [sHello, sEase, sTracks, sBounce, sGrid, sBento, sWord, sStates, sToggle, sExplain, sMontage, sEnd];

function drawWorld(ctx, t, th) {
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, W, H);
  for (const s of SCENES) {
    ctx.save();
    s(ctx, t, th);
    ctx.restore();
  }
  drawHero(ctx, t, th);
  drawCursor(ctx, t);
  hud(ctx, t, th);
}

export function renderFrame(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  const w = world(t);
  if (w.mode !== 'mix') return drawWorld(ctx, t, w.mode === 'dark' ? DARK : LIGHT);
  drawWorld(ctx, t, LIGHT);
  ctx.save();
  circle(ctx, w.x, w.y, w.r);
  ctx.clip();
  drawWorld(ctx, t, DARK);
  ctx.restore();
  if (w.edge > 0) {
    circle(ctx, w.x, w.y, w.r);
    ctx.strokeStyle = rgba(PAL.clay, 0.7 * w.edge);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

// ================================================================= sound cues (read by audio/score.py)

export function cues() {
  const c = [];
  const add = (t, k, extra = {}) => c.push({ t: +t.toFixed(4), k, ...extra });
  add(0.04, 'ping');
  add(0.46, 'swish', { d: 0.28, dir: -1 });
  L.hello.times.forEach((ti, i) => { if (L.hello.g[i].ch !== ' ') add(ti, 'note', { i }); });
  add(1.52, 'tick');
  add(2.2, 'soft');
  add(2.62, 'type');
  add(3.56, 'swish', { d: 0.5, dir: -1 });
  add(4.1, 'thud');
  add(4.8, 'slide', { d: 0.55 });
  add(5.45, 'swish', { d: 0.8, dir: 1 });
  add(6.25, 'swish', { d: 0.7, dir: 1 });
  add(7.0, 'race');
  [7.92, 7.98, 8.04].forEach((t, i) => add(t, 'pop', { i }));
  add(8.45, 'grow');
  add(8.85, 'charge', { d: 0.5 });
  add(9.35, 'boing');
  add(10.0, 'impact');
  add(10.02, 'shimmer', { d: 0.7 });
  add(10.9, 'tick');
  for (let i = 0; i < 7; i++) add(10.9 + i * 0.07, 'blip', { i });
  add(12.0, 'select', { i: 0 });
  add(12.5, 'select', { i: 1 });
  add(12.62, 'error');
  add(13.0, 'select', { i: 2 });
  add(13.12, 'success');
  add(14.0, 'swish', { d: 0.7, dir: 1 });
  for (let i = 0; i < 4; i++) add(14.22 + i * 0.06, 'pop', { i });
  add(15.08, 'slide', { d: 0.85 });
  add(15.85, 'pop', { i: 3 });
  add(16.35, 'swish', { d: 0.5, dir: 1 });
  add(17.12, 'hover');
  add(17.5, 'click');
  add(17.62, 'morph');
  add(18.3, 'success');
  add(18.95, 'swish', { d: 0.4, dir: 1 });
  add(19.5, 'click');
  add(19.52, 'toggle');
  add(19.55, 'riser', { d: 0.45 });
  add(20.0, 'drop');
  add(21.76, 'hover');
  add(22.0, 'click');
  add(22.05, 'swish', { d: 0.5, dir: 1 });
  for (let k = 0; k < 4; k++) add(22.58 + k * 0.14, 'blip', { i: k + 2 });
  add(23.72, 'swish', { d: 0.3, dir: 1 });
  [24.0, 24.5, 25.0, 25.5].forEach((t, i) => add(t, 'stab', { i }));
  add(25.22, 'click');
  add(26.0, 'reverse', { d: 0.5 });
  add(27.0, 'tick');
  add(29.3, 'swish', { d: 0.6, dir: -1 });
  return c.sort((a, b) => a.t - b.t);
}
