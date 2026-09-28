import { FPS, DURATION, setMeasureContext } from './engine.js';
import { init, renderFrame, cues } from './scenes.js';

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
  const toggle = () => {
    playing = !playing;
    play.textContent = playing ? 'Pause' : 'Play';
    if (playing) {
      t0 = performance.now() - t * 1000;
      audio.currentTime = t;
      audio.loop = true;
      audio.play().catch(() => {});
      raf = requestAnimationFrame(loop);
    } else {
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
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      if (playing) toggle();
      const step = (e.shiftKey ? FPS / 2 : 1) * (e.code === 'ArrowRight' ? 1 : -1);
      show(t + step / FPS);
    }
  });
  show(start);
}

boot();
