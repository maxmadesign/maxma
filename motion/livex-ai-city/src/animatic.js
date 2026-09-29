// LiveX · AI City — 30 s animatic (pre-viz). Every frame is a pure function of t.
// Uses the real product and Lyra reference images; environments are graphic stand-ins
// for the live-action plates described in TREATMENT.md.

import { W, H, E, clamp, lerp, prog, rgba, F, text, spans, reveal, circle, rrect, line, rng } from './engine.js';

const FR = { x: 0, y: 138, w: 1920, h: 804 }; // 2.39:1 picture area
const CX = 960, CY = FR.y + FR.h / 2;
export const IMG = {};
export const IMAGES = ['gateway', 'gateway-back', 'paragon', 'portal', 'portal-s', 'lyra', 'lyra-face', 'logo-white'];

const STAGES = [
  [0, 'PERSON'], [4, 'INTERACTION'], [10, 'LIVEX'], [14, 'PLACE'], [18, 'NETWORK'], [26, 'CITY'],
];
const SHOTS = [
  [0, 'SC01A', '手 · 票根'], [1.5, 'SC01B', '酒店大堂 · 奶奶'], [4, 'SC02A', 'Lyra 近景'], [6, 'SC02B', '奶奶反应'],
  [8, 'SC02C', 'Lyra 指路'], [10, 'SC03', 'FIRST REVEAL · Gateway'], [14, 'SC04A', '匹配剪辑 · X'],
  [15.25, 'SC04B', 'Portal · 闸口'], [18, 'SC05', 'Paragon Outdoor · 广场'], [22, 'SC06', 'NETWORK MONTAGE'],
  [26, 'SC07A', '体育场 · 命中'], [27.5, 'SC07B', 'AI CITY REVEAL'], [29, 'SC07C', 'END CARD'],
];

// ------------------------------------------------------------------ helpers

function drawImg(ctx, im, x, y, w, h, { alpha = 1, fit = 'cover', ox = 0.5, oy = 0.5 } = {}) {
  if (!im || alpha <= 0) return;
  const ir = im.width / im.height, rr = w / h;
  let sw = im.width, sh = im.height, sx = 0, sy = 0;
  if (fit === 'cover') {
    if (ir > rr) { sw = im.height * rr; sx = (im.width - sw) * ox; } else { sh = im.width / rr; sy = (im.height - sh) * oy; }
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function clipFrame(ctx) {
  ctx.beginPath();
  ctx.rect(FR.x, FR.y, FR.w, FR.h);
  ctx.clip();
}

function grad(ctx, stops, x0 = 0, y0 = FR.y, x1 = 0, y1 = FR.y + FR.h) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g;
  ctx.fillRect(FR.x, FR.y, FR.w, FR.h);
}

function glow(ctx, x, y, r, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A person as a soft graphic silhouette (pre-viz stand-in). */
function person(ctx, x, y, h, { coat = '#6b5646', hair = '#b9b4ac', alpha = 1, arms = 0, tote = false, dark = false } = {}) {
  const s = h / 300;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);
  const body = dark ? '#1c1c1f' : coat;
  // legs
  ctx.fillStyle = dark ? '#141416' : '#3b3530';
  rrect(ctx, -26, -120, 22, 120, 8); ctx.fill();
  rrect(ctx, 4, -120, 22, 120, 8); ctx.fill();
  // coat
  ctx.fillStyle = body;
  rrect(ctx, -44, -250, 88, 150, 30); ctx.fill();
  // arms
  ctx.save();
  ctx.translate(-40, -235);
  ctx.rotate(-0.15 - arms * 2.4);
  rrect(ctx, -12, 0, 22, 110, 11); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(40, -235);
  ctx.rotate(0.15 + arms * 2.4);
  rrect(ctx, -10, 0, 22, 110, 11); ctx.fill();
  ctx.restore();
  if (tote) { ctx.fillStyle = '#a89a80'; rrect(ctx, 40, -170, 34, 46, 6); ctx.fill(); }
  // head
  ctx.fillStyle = dark ? '#18181a' : '#d9b99b';
  circle(ctx, 0, -278, 26); ctx.fill();
  ctx.fillStyle = dark ? '#18181a' : hair;
  ctx.beginPath(); ctx.arc(0, -284, 28, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  ctx.restore();
}

function subtitle(ctx, t, t0, t1, zh, en) {
  const a = prog(t, t0, t0 + 0.2) * (1 - prog(t, t1 - 0.2, t1));
  if (a <= 0) return;
  const y = FR.y + FR.h - 92;
  ctx.save();
  const bg = ctx.createLinearGradient(0, y - 90, 0, FR.y + FR.h);
  bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, `rgba(0,0,0,${0.55 * a})`);
  ctx.fillStyle = bg; ctx.fillRect(FR.x, y - 90, FR.w, FR.y + FR.h - y + 90);
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 12;
  text(ctx, zh, CX, y, { font: `500 38px "Noto Sans SC", sans-serif`, color: '#ffffff', align: 'center', alpha: a });
  text(ctx, en, CX, y + 44, { font: F.serif(32), color: '#f1ece4', align: 'center', alpha: a * 0.9 });
  ctx.restore();
}

function note(ctx, s, a = 1) {
  // director's note chip, top-left inside picture
  text(ctx, s, 48, FR.y + 44, { font: F.mono(17), color: 'rgba(255,255,255,0.75)', alpha: a, tr: 1 });
}

function lobby(ctx, t, { warm = 1, x = true } = {}) {
  grad(ctx, [[0, '#3a2c22'], [0.55, '#6d5440'], [1, '#2a211b']]);
  const vx = CX, vy = FR.y + 300;
  ctx.strokeStyle = 'rgba(255,225,190,0.10)';
  ctx.lineWidth = 2;
  for (let i = -12; i <= 12; i++) { line(ctx, vx, vy, vx + i * 220, FR.y + FR.h); ctx.stroke(); }
  for (let k = 0; k < 7; k++) { const y = vy + (FR.h - 300) * Math.pow(k / 6, 1.8); line(ctx, 0, y, W, y); ctx.stroke(); }
  // windows
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = 'rgba(255,214,160,0.08)';
    ctx.fillRect(120 + i * 200, FR.y + 40, 150, 230);
  }
  if (x) { // crossing escalators — the X motif
    ctx.strokeStyle = 'rgba(255,240,220,0.22)';
    ctx.lineWidth = 16;
    line(ctx, 1300, FR.y + 90, 1700, FR.y + 330); ctx.stroke();
    line(ctx, 1700, FR.y + 90, 1300, FR.y + 330); ctx.stroke();
  }
  glow(ctx, 380, FR.y + 120, 420, '#ffcf9a', 0.18 * warm);
}

// ------------------------------------------------------------------ scenes

function sc01(ctx, t) {
  if (t < 1.5) {
    // bokeh lobby + the ticket
    grad(ctx, [[0, '#2b1f17'], [1, '#140f0b']]);
    const r = rng(7);
    for (let i = 0; i < 26; i++) glow(ctx, r() * W, FR.y + r() * FR.h, 60 + r() * 120, '#ffc98a', 0.08 + r() * 0.1);
    const s = 1 + 0.05 * t;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.scale(s, s);
    ctx.rotate(-0.05 + 0.004 * Math.sin(t * 13));
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40;
    rrect(ctx, -330, -150, 660, 300, 14); ctx.fillStyle = '#f3ecdf'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#d97a3a'; ctx.fillRect(-330, -150, 16, 300);
    text(ctx, 'CITY ARENA', -280, -80, { font: F.sans(30, 800), color: '#2a241e', tr: 2 });
    text(ctx, 'CHAMPIONSHIP FINAL', -280, -40, { font: F.sans(24, 600), color: '#2a241e', tr: 1 });
    text(ctx, '19:00  ·  SEC 104  ·  ROW 8', -280, 30, { font: F.mono(22), color: '#5b5147' });
    // clipped photo of #7
    ctx.save(); ctx.rotate(0.12);
    rrect(ctx, 150, -130, 150, 190, 6); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = '#c7442e'; ctx.fillRect(162, -118, 126, 166);
    text(ctx, '7', 225, 10, { font: F.sans(96, 800), color: '#fff', align: 'center' });
    ctx.restore();
    ctx.restore();
    // hands
    ctx.fillStyle = '#c9a383';
    rrect(ctx, CX - 460, CY + 40, 190, 110, 50); ctx.fill();
    rrect(ctx, CX + 290, CY - 10, 190, 110, 50); ctx.fill();
    note(ctx, '1A · 100mm 微距 · 手在轻微颤抖');
  } else if (t < 4) {
    lobby(ctx, t);
    const u = prog(t, 1.5, 4);
    for (let i = 0; i < 5; i++) {
      const d = i % 2 ? 1 : -1;
      const px = ((i * 430 + (t - 1.5) * 260 * d) % 2300 + 2300) % 2300 - 190;
      person(ctx, px, FR.y + FR.h - 40 + (i % 3) * 20, 470 + (i % 3) * 40, { dark: true, alpha: 0.85 });
    }
    person(ctx, CX + 30 * Math.sin(u * 3), FR.y + FR.h - 60, 430 * (1 + 0.06 * u), { tote: true });
    text(ctx, '请问……', CX + 90, FR.y + 360, { font: `400 30px "Noto Sans SC", sans-serif`, color: '#f5e8d8', alpha: prog(t, 2.6, 2.9) * (1 - prog(t, 3.7, 3.95)) });
    note(ctx, '1B · 50mm 手持 · 人流经过，没人停下');
  }
}

function sc02(ctx, t) {
  if (t < 6 || (t >= 8 && t < 10)) {
    const a = t < 6 ? 0 : 1;
    grad(ctx, [[0, '#f4f2ef'], [1, '#e2ded8']]);
    const z = 1 + 0.04 * prog(t, a ? 8 : 4, a ? 10 : 6);
    const im = a ? IMG.lyra : IMG['lyra-face'];
    ctx.save();
    ctx.translate(CX, CY); ctx.scale(z, z); ctx.translate(-CX, -CY);
    if (a) drawImg(ctx, im, CX - 540, FR.y - 40, 1080, 1920 * 0.56 * 1.5, { fit: 'cover', oy: 0.02 });
    else drawImg(ctx, im, CX - 620, FR.y - 60, 1240, 1284);
    ctx.restore();
    note(ctx, a ? '2C · Lyra 看了一眼票，手指向出口' : '2A · 85mm · 看不到屏幕边框，观众以为是真人', 1);
    if (!a) subtitle(ctx, t, 4.2, 6, '奶奶您好，是来看比赛的吗？', 'Are you here for the game?');
    else subtitle(ctx, t, 8.1, 10, '七点开始，来得及。我带您走。', "Seven o'clock. You'll make it. I'll show you the way.");
  } else {
    lobby(ctx, t, { x: false });
    glow(ctx, CX - 400, CY, 700, '#eef4ff', 0.28); // screen light on her face
    person(ctx, CX + 120, FR.y + FR.h + 380, 1150, { tote: false });
    // ticket held up
    ctx.save(); ctx.translate(CX - 150, CY + 40 - 30 * E.outBack(prog(t, 6.3, 6.8))); ctx.rotate(-0.2);
    rrect(ctx, -110, -55, 220, 110, 8); ctx.fillStyle = '#f3ecdf'; ctx.fill();
    ctx.fillStyle = '#d97a3a'; ctx.fillRect(-110, -55, 8, 110);
    ctx.restore();
    note(ctx, '2B · 85mm 过肩 · 意外，然后放松地笑了');
    subtitle(ctx, t, 6.1, 8, '我孙女今天打决赛。', 'My granddaughter plays the final today.');
  }
}

// Gateway crop geometry (assets/gateway.png, 500x950): screen rect and Lyra's face inside it
const GW = { w: 500, h: 950, screen: { x: 78, y: 65, w: 350, h: 790 }, face: { x: 258, y: 178 } };

function sc03(ctx, t) {
  const u = E.inOutCubic(prog(t, 10.0, 13.4));
  lobby(ctx, t);
  const finalH = 700, s1 = finalH / GW.h, s0 = 11.5;
  const s = Math.exp(lerp(Math.log(s0), Math.log(s1), u));
  const gx = lerp(CX, 760, u), gy = lerp(CY + 30, FR.y + FR.h - 40 - finalH / 2 + GW.h * s1 / 2 - finalH / 2 + finalH / 2, u);
  // anchor: at u=0 the face sits at frame centre; at u=1 the Gateway stands on the floor
  const fx = lerp(CX - GW.face.x * s, gx - GW.w * s / 2, u);
  const fy = lerp(CY - GW.face.y * s, FR.y + FR.h - 30 - GW.h * s, u);
  // floor shadow + light spill on the grandmother
  glow(ctx, fx + GW.w * s * 0.5, fy + GW.h * s * 0.5, 900 * s / s1 * 0.5, '#e8f0ff', 0.12 * u);
  drawImg(ctx, IMG.gateway, fx, fy, GW.w * s, GW.h * s, { fit: 'fill' });
  // high-res Lyra over the screen while we are close
  const sr = GW.screen;
  const la = 1 - prog(u, 0.25, 0.6);
  if (la > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(fx + sr.x * s, fy + sr.y * s, sr.w * s, sr.h * s); ctx.clip();
    drawImg(ctx, IMG.lyra, fx + sr.x * s, fy + sr.y * s, sr.w * s, sr.h * s, { alpha: la, oy: 0.0 });
    ctx.restore();
  }
  // light strips pulse (Lyra is listening)
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  glow(ctx, fx + 38 * s, fy + 500 * s, 60 * s, '#ffffff', 0.25 * pulse * u);
  // grandmother stands beside, eye level with Lyra
  person(ctx, fx + GW.w * s + 150, FR.y + FR.h - 30, 480, { tote: true, alpha: prog(u, 0.55, 0.85) });
  note(ctx, '3 · HERO SHOT #1 · 一镜拉远：Lyra → 屏幕边框 → Gateway V2 → 奶奶 → 整个大堂');
  const la2 = prog(t, 12.6, 13.0) * (1 - prog(t, 13.8, 14));
  text(ctx, 'GATEWAY V2', 1340, FR.y + 420, { font: F.sans(46, 700), color: '#fff', alpha: la2, tr: 3 });
  text(ctx, 'DESTINATION NODE · 86″', 1340, FR.y + 460, { font: F.mono(18), color: 'rgba(255,255,255,0.7)', alpha: la2, tr: 2 });
}

function corridor(ctx) {
  grad(ctx, [[0, '#0f1519'], [0.6, '#1d272d'], [1, '#0b0f12']]);
  const vx = CX + 200, vy = CY - 60;
  ctx.strokeStyle = 'rgba(200,230,255,0.08)'; ctx.lineWidth = 2;
  for (let i = -10; i <= 10; i++) { line(ctx, vx, vy, vx + i * 260, FR.y + FR.h); ctx.stroke(); line(ctx, vx, vy, vx + i * 260, FR.y); ctx.stroke(); }
  // crossing ceiling light strips — the X
  ctx.strokeStyle = 'rgba(235,245,255,0.55)'; ctx.lineWidth = 6;
  line(ctx, vx - 700, FR.y, vx + 200, vy - 40); ctx.stroke();
  line(ctx, vx + 700, FR.y, vx - 200, vy - 40); ctx.stroke();
  // ticket gates
  for (let i = 0; i < 5; i++) {
    const x = 220 + i * 170;
    ctx.fillStyle = '#2d3a42'; rrect(ctx, x, FR.y + FR.h - 230, 44, 190, 8); ctx.fill();
    ctx.fillStyle = 'rgba(120,220,160,0.7)'; ctx.fillRect(x + 12, FR.y + FR.h - 210, 20, 6);
  }
}

function sc04(ctx, t) {
  if (t < 15.25) {
    // match cut: escalator X → ceiling-light X
    const u = prog(t, 14, 15.25);
    if (u < 0.5) lobby(ctx, t); else corridor(ctx);
    const s = lerp(1, 3.2, E.inOutCubic(u));
    ctx.save();
    ctx.translate(CX, CY); ctx.rotate(u * 0.5); ctx.scale(s, s);
    ctx.strokeStyle = `rgba(255,248,235,${0.5 + 0.4 * Math.sin(u * Math.PI)})`; ctx.lineWidth = 10 / s * 2;
    line(ctx, -160, -100, 160, 100); ctx.stroke();
    line(ctx, 160, -100, -160, 100); ctx.stroke();
    ctx.restore();
    note(ctx, '4A · 匹配剪辑：大堂扶梯的 X → 地铁通道天花灯带的 X');
    return;
  }
  corridor(ctx);
  const px = 1260, py = FR.y + 110, pw = 340, ph = 720;
  glow(ctx, px + pw / 2, py + ph / 2, 520, '#4d86ff', 0.35);
  drawImg(ctx, IMG.portal, px, py, pw, ph, { fit: 'fill' });
  // wayfinding UI on Portal's screen
  const ua = E.outCubic(prog(t, 15.6, 16.0));
  if (ua > 0) {
    const sx = px + 40, sy = py + ph - 220, sw = pw - 80;
    ctx.save(); ctx.globalAlpha = ua;
    rrect(ctx, sx, sy, sw, 150, 18); ctx.fillStyle = 'rgba(20,32,60,0.88)'; ctx.fill();
    text(ctx, 'B', sx + 36, sy + 108, { font: F.sans(96, 800), color: '#fff' });
    ctx.fillStyle = '#fff';
    ctx.beginPath(); const ax = sx + 150, ay = sy + 75;
    ctx.moveTo(ax, ay - 14); ctx.lineTo(ax + 70, ay - 14); ctx.lineTo(ax + 70, ay - 36); ctx.lineTo(ax + 110, ay); ctx.lineTo(ax + 70, ay + 36); ctx.lineTo(ax + 70, ay + 14); ctx.lineTo(ax, ay + 14); ctx.fill();
    text(ctx, '2 min', sx + 150, sy + 132, { font: F.mono(20), color: '#cfe0ff' });
    ctx.restore();
  }
  const wu = prog(t, 15.25, 18);
  person(ctx, lerp(560, 1080, wu), FR.y + FR.h - 20, 520, { tote: true });
  note(ctx, '4B · 35mm 侧跟 · 同一个 Lyra 认出了她 · 2 秒交互');
  subtitle(ctx, t, 15.7, 17.9, '奶奶，B 出口，两分钟。', 'Exit B, Grandma. Two minutes.');
  const la = prog(t, 16.2, 16.5) * (1 - prog(t, 17.7, 18));
  text(ctx, 'PORTAL', 1640, FR.y + 470, { font: F.sans(40, 700), color: '#fff', alpha: la, tr: 3 });
  text(ctx, 'TRANSITION NODE', 1640, FR.y + 506, { font: F.mono(17), color: 'rgba(255,255,255,0.7)', alpha: la, tr: 2 });
}

function plaza(ctx, t) {
  grad(ctx, [[0, '#f0a45c'], [0.45, '#f6c98a'], [0.62, '#c58a5a'], [1, '#6e4c36']]);
  glow(ctx, 360, FR.y + 230, 520, '#fff2c8', 0.75);
  circle(ctx, 360, FR.y + 230, 70); ctx.fillStyle = '#fff6df'; ctx.fill();
  // stadium silhouette
  ctx.fillStyle = 'rgba(80,52,40,0.85)';
  ctx.beginPath(); ctx.ellipse(1260, FR.y + 470, 620, 150, 0, Math.PI, 0); ctx.fill();
  ctx.fillRect(640, FR.y + 470, 1240, 40);
  for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.fillRect(760 + i * 140, FR.y + 440, 30, 8); }
  // paving lines crossing — the X
  ctx.strokeStyle = 'rgba(255,235,210,0.25)'; ctx.lineWidth = 3;
  line(ctx, 0, FR.y + FR.h, 1400, FR.y + 510); ctx.stroke();
  line(ctx, W, FR.y + FR.h, 520, FR.y + 510); ctx.stroke();
}

function sc05(ctx, t) {
  plaza(ctx, t);
  const z = 1 + 0.45 * E.inOutCubic(prog(t, 19.3, 21.5));
  ctx.save();
  ctx.translate(1300, FR.y + 420); ctx.scale(z, z); ctx.translate(-1300, -(FR.y + 420));
  const px = 1140, py = FR.y + 90, pw = 320, ph = 690;
  ctx.fillStyle = 'rgba(40,24,16,0.35)';
  ctx.beginPath(); ctx.ellipse(px + pw / 2 - 120, py + ph + 10, 280, 26, -0.1, 0, Math.PI * 2); ctx.fill();
  drawImg(ctx, IMG.paragon, px, py, pw, ph, { fit: 'fill' });
  const ua = E.outCubic(prog(t, 19.8, 20.2));
  if (ua > 0) {
    const sx = px + 58, sy = py + 400, sw = 204;
    ctx.save(); ctx.globalAlpha = ua;
    rrect(ctx, sx, sy, sw, 118, 10); ctx.fillStyle = 'rgba(16,26,48,0.9)'; ctx.fill();
    text(ctx, 'SECTION 104', sx + 14, sy + 34, { font: F.sans(22, 700), color: '#fff' });
    text(ctx, 'GATE C · 180 m', sx + 14, sy + 60, { font: F.mono(14), color: '#bcd0ff' });
    ctx.fillStyle = '#c7442e'; ctx.fillRect(sx + 14, sy + 72, 70, 36);
    text(ctx, '#7 LIVE', sx + 92, sy + 97, { font: F.mono(14), color: '#ffd6cc' });
    ctx.restore();
  }
  ctx.restore();
  // other citizens + the grandmother
  person(ctx, lerp(1560, 1900, prog(t, 18, 20)), FR.y + FR.h - 40, 440, { coat: '#2f4a6b', hair: '#2a2420', alpha: 0.95 });
  person(ctx, lerp(200, 900, E.outCubic(prog(t, 18.5, 22))), FR.y + FR.h - 10, 540, { tote: true });
  glow(ctx, 360, FR.y + 230, 900, '#fff0cc', 0.12);
  note(ctx, '5 · 24mm 逆光 · 真实阳光下屏幕依然清晰 · AI 第一次走进城市');
  subtitle(ctx, t, 19.9, 21.9, '104 区。她正在热身。', "Section 104. She's warming up.");
  const la = prog(t, 18.6, 18.9) * (1 - prog(t, 19.6, 19.9));
  text(ctx, 'PARAGON OUTDOOR', W - 60, FR.y + 110, { font: F.sans(40, 700), color: '#fff', alpha: la, tr: 3, align: 'right' });
  text(ctx, 'PUBLIC CITY NODE · 3200 nits', W - 60, FR.y + 146, { font: F.mono(17), color: 'rgba(255,255,255,0.85)', alpha: la, tr: 2, align: 'right' });
}

const MONT = [
  ['RETAIL', '商场', 'gateway', '#3b2f4a', '年轻妈妈 · 商品位置'],
  ['HOSPITAL', '医院大厅', 'portal-s', '#1d3a3f', '拄拐的老先生 · 科室导向'],
  ['CAMPUS', '大学入口', 'paragon', '#3f4a2a', '新生 · 迎新地图'],
  ['CORPORATE', '企业大堂', 'gateway', '#262a33', '访客 · 签到'],
  ['HOTEL', '电梯间', 'portal-s', '#43342a', '商务旅客 · 早餐时间'],
  ['STREET', '步行街', 'paragon', '#4a2f2a', '游客情侣 · 餐厅推荐'],
  ['CONVENTION', '会展中心', 'gateway', '#1f2c45', '展会人群 · 展位导览'],
  ['ARENA', '看台', null, '#15161c', '奶奶找到座位 · 不再需要帮助'],
];

function sc06(ctx, t) {
  const k = clamp(Math.floor((t - 22) / 0.5), 0, 7);
  const [en, zh, dev, col, who] = MONT[k];
  const lt = t - (22 + k * 0.5);
  grad(ctx, [[0, col], [1, '#0b0b0d']]);
  const dx = (k % 2 ? 1 : -1) * 40 * (1 - E.outCubic(clamp(lt / 0.3)));
  if (dev) {
    const im = IMG[dev];
    const h = 690, w = h * im.width / im.height;
    glow(ctx, 1150 + dx, CY, 520, '#dfe8ff', 0.18);
    drawImg(ctx, im, 1150 - w / 2 + dx, FR.y + 60, w, h, { fit: 'fill' });
    // a hand rising toward the screen — the recurring gesture
    const hu = E.outCubic(clamp(lt / 0.35));
    ctx.fillStyle = '#c9a383';
    rrect(ctx, 1150 - w / 2 - 260 + 120 * hu, FR.y + FR.h - 60 - 200 * hu, 180, 70, 35); ctx.fill();
    person(ctx, 520, FR.y + FR.h + 40, 620, { coat: ['#4b6b8a', '#6a6f78', '#7a5a3a', '#2f3b4f'][k % 4], hair: '#2a2420' });
  } else {
    // the grandmother, seated in the stands
    for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) person(ctx, 120 + i * 160 + (r % 2) * 80, FR.y + 420 + r * 130, 300, { dark: true, alpha: 0.8 });
    person(ctx, CX, FR.y + FR.h + 60, 640, { tote: true });
  }
  text(ctx, en, 64, FR.y + 110, { font: F.sans(64, 800), color: '#fff', tr: 2 });
  text(ctx, `${zh} · ${who}`, 66, FR.y + 150, { font: `400 24px "Noto Sans SC", sans-serif`, color: 'rgba(255,255,255,0.8)' });
  note(ctx, `6 · 蒙太奇 ${k + 1}/8 · 每 0.5 秒一拍 · 同一个 Lyra`);
}

function city(ctx, t, z) {
  grad(ctx, [[0, '#070b16'], [1, '#101a2e']]);
  ctx.save();
  ctx.translate(CX, CY); ctx.scale(z, z); ctx.translate(-CX, -CY);
  const r = rng(42);
  const bw = 150, gap = 36;
  for (let gx = -8; gx < 16; gx++) for (let gy = -6; gy < 10; gy++) {
    const x = CX + gx * (bw + gap) - 8 * (bw + gap) / 2 + (gy % 2) * 30, y = CY + gy * (110 + gap) - 400;
    if (Math.abs(x - CX) < 110 && Math.abs(y - CY) < 90) continue; // the crossing
    ctx.fillStyle = `rgba(${30 + r() * 20},${38 + r() * 20},${60 + r() * 30},1)`;
    ctx.fillRect(x, y, bw, 110);
    for (let w = 0; w < 10; w++) {
      if (r() < 0.45) { ctx.fillStyle = `rgba(255,${200 + r() * 40},${140 + r() * 60},${0.4 + r() * 0.5})`; ctx.fillRect(x + 8 + r() * (bw - 20), y + 8 + r() * 90, 6, 4); }
    }
  }
  // the scramble crossing — X at the heart of the city
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 5; ctx.setLineDash([10, 10]);
  line(ctx, CX - 100, CY - 80, CX + 100, CY + 80); ctx.stroke();
  line(ctx, CX + 100, CY - 80, CX - 100, CY + 80); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

const NODES = [[-520, -210, 27.9], [430, -250, 28.05], [-300, 190, 28.2], [640, 150, 28.35], [-760, 40, 28.5], [180, 300, 28.65], [120, -330, 28.8]];

function sc07(ctx, t) {
  if (t < 27.5) {
    grad(ctx, [[0, '#0d0e14'], [1, '#1d1a24']]);
    for (let i = 0; i < 6; i++) glow(ctx, 200 + i * 300, FR.y + 40, 260, '#ffffff', 0.12);
    // hoop + ball arc
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 6;
    ctx.strokeRect(1480, FR.y + 170, 180, 120);
    ctx.strokeStyle = '#ff6a3a'; ctx.beginPath(); ctx.ellipse(1570, FR.y + 300, 60, 14, 0, 0, Math.PI * 2); ctx.stroke();
    const u = prog(t, 26, 26.8);
    const bx = lerp(900, 1570, u), by = FR.y + 520 - 500 * u + 330 * u * u;
    circle(ctx, bx, by, 30); ctx.fillStyle = '#e0762f'; ctx.fill();
    const flash = prog(t, 26.8, 26.85) * (1 - prog(t, 26.85, 27.2));
    glow(ctx, 1570, FR.y + 300, 700, '#fff3d6', 0.6 * flash);
    for (let i = 0; i < 12; i++) person(ctx, 80 + i * 150, FR.y + FR.h + 30, 380, { dark: true, arms: prog(t, 26.85, 27.1) * (i % 2 ? 1 : 0.8) });
    person(ctx, 520, FR.y + FR.h + 20, 560, { tote: true, arms: E.outBack(prog(t, 26.85, 27.2)) });
    note(ctx, '7A · 长焦 · 7 号命中，奶奶站起来欢呼');
    return;
  }
  const z = lerp(1.9, 1.0, E.inOutCubic(prog(t, 27.5, 29.2)));
  city(ctx, t, z);
  // the nodes — each lights once, in time with the Lyra motif
  NODES.forEach(([nx, ny, nt]) => {
    const a = prog(t, nt, nt + 0.12);
    if (a <= 0) return;
    const x = CX + nx * z, y = CY + ny * z;
    const p = Math.exp(-(t - nt) * 3);
    glow(ctx, x, y, 90 + 60 * p, '#ffffff', 0.35 * a + 0.4 * p);
    circle(ctx, x, y, 5); ctx.fillStyle = '#fff'; ctx.fill();
  });
  const ea = prog(t, 29.0, 29.5);
  if (ea > 0) {
    ctx.fillStyle = `rgba(4,6,12,${0.78 * ea})`;
    ctx.fillRect(FR.x, FR.y, FR.w, FR.h);
    const lw = 560, lh = lw * 96 / 335;
    drawImg(ctx, IMG['logo-white'], CX - lw / 2, CY - 150, lw, lh, { fit: 'fill', alpha: ea });
    text(ctx, 'AI meets you.', CX, CY + 70, { font: F.serif(64), color: '#fff', align: 'center', alpha: prog(t, 29.2, 29.6) });
    text(ctx, 'Where life happens.', CX, CY + 140, { font: F.serif(64), color: '#fff', align: 'center', alpha: prog(t, 29.35, 29.75) });
  } else note(ctx, '7B · 从体育场顶升空 · 同一个 Lyra 音在城市里汇成和弦 · 中心是 X 形路口');
}

// ------------------------------------------------------------------ HUD + compositor

function hud(ctx, t) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, FR.y);
  ctx.fillRect(0, FR.y + FR.h, W, H - FR.y - FR.h);
  const f = F.mono(16);
  spans(ctx, [
    { s: 'LIVEX · AI CITY', font: F.mono(16, 600), color: '#fff', tr: 3, pad: 14 },
    { s: '— ANIMATIC v1 · PRE-VIZ, NOT FINAL PICTURE', font: f, color: '#8a8a8a', tr: 2 },
  ], 48, 80);
  let si = 0;
  SHOTS.forEach((s, i) => { if (t >= s[0]) si = i; });
  const sec = Math.floor(t), fr = Math.floor((t - sec) * 24);
  spans(ctx, [
    { s: `${SHOTS[si][1]}  ${SHOTS[si][2]}`, font: `400 16px "JetBrains Mono", "Noto Sans SC", monospace`, color: '#cfcfcf', pad: 24 },
    { s: `00:${String(sec).padStart(2, '0')}:${String(fr).padStart(2, '0')}`, font: F.mono(16, 600), color: '#fff', tr: 1 },
  ], W - 48, 80, { align: 'right' });
  // scale progression
  const y = FR.y + FR.h + 70;
  let st = 0;
  STAGES.forEach((s, i) => { if (t >= s[0]) st = i; });
  const gap = 280, x0 = CX - gap * 2.5;
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
  line(ctx, x0, y - 26, x0 + gap * 5, y - 26); ctx.stroke();
  ctx.strokeStyle = '#d6d6d6';
  const pr = clamp(t / 30);
  line(ctx, x0, y - 26, x0 + gap * 5 * Math.min(1, (st + clamp((t - STAGES[st][0]) / ((STAGES[st + 1]?.[0] ?? 30) - STAGES[st][0]))) / 5), y - 26); ctx.stroke();
  STAGES.forEach(([, name], i) => {
    const on = i <= st;
    circle(ctx, x0 + i * gap, y - 26, i === st ? 7 : 5);
    ctx.fillStyle = on ? '#fff' : '#444'; ctx.fill();
    text(ctx, name, x0 + i * gap, y + 6, { font: F.mono(i === st ? 17 : 15, i === st ? 600 : 500), color: i === st ? '#fff' : on ? '#9a9a9a' : '#4a4a4a', align: 'center', tr: 2 });
  });
  void pr;
}

export function renderFrame(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  clipFrame(ctx);
  if (t < 4) sc01(ctx, t);
  else if (t < 10) sc02(ctx, t);
  else if (t < 14) sc03(ctx, t);
  else if (t < 18) sc04(ctx, t);
  else if (t < 22) sc05(ctx, t);
  else if (t < 26) sc06(ctx, t);
  else sc07(ctx, t);
  // cut-to-black blink on every hard cut keeps boards readable as shots
  ctx.restore();
  hud(ctx, t);
}

export function cues() {
  return [
    { t: 4.2, k: 'lyra' }, { t: 10.0, k: 'music' }, { t: 14.0, k: 'whoosh' }, { t: 15.6, k: 'lyra' },
    { t: 18.0, k: 'whoosh' }, { t: 19.8, k: 'lyra' },
    ...Array.from({ length: 8 }, (_, i) => ({ t: 22 + i * 0.5, k: 'beat', i })),
    { t: 26.8, k: 'cheer' }, ...NODES.map(([, , nt], i) => ({ t: nt, k: 'node', i })), { t: 29.0, k: 'end' },
  ];
}
