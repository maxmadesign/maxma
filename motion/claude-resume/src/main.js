import { FPS, DURATION, setMeasureContext } from './engine.js';
import { init, renderFrame, cues } from './scenes.js';
import { t as tr, locale, setLocale, applyStrings } from './i18n.js';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
if (RENDER) document.body.classList.add('render');

const FONTS = [
  '400 20px "Inter Tight"', '500 20px "Inter Tight"', '600 20px "Inter Tight"', '700 20px "Inter Tight"',
  '800 20px "Inter Tight"', 'italic 400 20px "Instrument Serif"', '400 20px "Instrument Serif"',
  '400 20px "JetBrains Mono"', '500 20px "JetBrains Mono"', '600 20px "JetBrains Mono"',
];

async function boot() {
  await Promise.all(FONTS.map((f) => document.fonts.load(f, 'AaéÉıı·—’×−')));
  await document.fonts.ready;
  setMeasureContext(ctx);
  init();

  window.renderAt = (t) => renderFrame(ctx, t);
  window.renderBlurred = (t, samples = 8, shutter = 0.5) => renderBlurred(t, samples, shutter);
  window.cues = cues;
  window.frameCount = Math.round(DURATION * FPS);
  window.__ready = true;

  const start = params.has('t') ? parseFloat(params.get('t')) : 0;
  renderFrame(ctx, start);
  if (!RENDER) preview(start);
}

// Temporal super-sampling: average N sub-frames spread over the shutter interval,
// the way a film camera (or After Effects' motion blur) integrates movement.
let acc = null;
function renderBlurred(t, samples, shutter) {
  const { width: w, height: h } = canvas;
  if (!acc) acc = new Float32Array(w * h * 4);
  acc.fill(0);
  for (let i = 0; i < samples; i++) {
    const dt = ((i + 0.5) / samples - 0.5) * (shutter / FPS);
    renderFrame(ctx, Math.max(0, t + dt));
    const d = ctx.getImageData(0, 0, w, h).data;
    for (let k = 0; k < d.length; k++) acc[k] += d[k];
  }
  const img = ctx.createImageData(w, h);
  const out = img.data;
  const inv = 1 / samples;
  for (let k = 0; k < out.length; k++) out[k] = acc[k] * inv + 0.5;
  ctx.putImageData(img, 0, 0);
}

function preview(start) {
  const play = document.getElementById('play');
  const scrub = document.getElementById('scrub');
  const tc = document.getElementById('tc');
  const audio = document.getElementById('audio');
  let playing = false, t = start, t0 = 0, raf = 0;
  const label = () => (play.textContent = tr(playing ? 'pause' : 'play'));
  document.getElementById('lang').addEventListener('click', () => {
    setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN');
    applyStrings();
    label();
  });
  applyStrings();
  label();

  const show = (time) => {
    t = ((time % DURATION) + DURATION) % DURATION;
    renderFrame(ctx, t);
    const f = Math.floor(t * FPS);
    scrub.value = f;
    tc.textContent = `${t.toFixed(3).padStart(6, '0')} s · F${String(f).padStart(4, '0')}`;
  };
  const loop = (now) => {
    const time = audio.readyState >= 2 && !audio.paused ? audio.currentTime : (now - t0) / 1000;
    if (time >= DURATION) { t0 = now; if (!audio.paused) audio.currentTime = 0; }
    show(time % DURATION);
    raf = requestAnimationFrame(loop);
  };
  // prefers-reduced-motion: play the key frames as held stills (no continuous motion, no sound)
  // unless the viewer explicitly opts in to full motion.
  const STILLS = [1.9, 5.3, 8.3, 11.6, 13.5, 16.1, 18.9, 20.9, 23.3, 25.8, 28.0];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const motionBtn = document.getElementById('motion');
  let fullMotion = false, timer = 0;
  const reduced = () => reduce.matches && !fullMotion;
  const syncMotionUI = () => {
    motionBtn.hidden = !reduce.matches;
    motionBtn.setAttribute('aria-pressed', String(fullMotion));
  };
  reduce.addEventListener('change', () => { if (playing) toggle(); syncMotionUI(); });
  motionBtn.addEventListener('click', () => {
    if (playing) toggle();
    fullMotion = !fullMotion;
    syncMotionUI();
  });
  syncMotionUI();

  const stepStill = () => {
    const next = STILLS.find((s) => s > t + 0.01) ?? STILLS[0];
    show(next);
  };
  const toggle = () => {
    playing = !playing;
    label();
    if (playing && reduced()) {
      stepStill();
      timer = setInterval(stepStill, 2500);
    } else if (playing) {
      t0 = performance.now() - t * 1000;
      audio.currentTime = t;
      audio.loop = true;
      audio.play().catch(() => {});
      raf = requestAnimationFrame(loop);
    } else {
      clearInterval(timer);
      cancelAnimationFrame(raf);
      audio.pause();
    }
  };
  play.addEventListener('click', toggle);
  scrub.addEventListener('input', () => {
    if (playing) toggle();
    show(scrub.value / FPS);
  });
  addEventListener('keydown', (e) => {
    // let focused controls keep their native Space activation (Play still toggles via its click handler)
    const control = e.target.closest?.('button, a, select, textarea, input:not([type=range])');
    if (e.code === 'Space' && !control) { e.preventDefault(); toggle(); }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      if (playing) toggle();
      const step = (e.shiftKey ? FPS / 2 : 1) * (e.code === 'ArrowRight' ? 1 : -1);
      show(t + step / FPS);
    }
  });
  show(start);
}

boot();
