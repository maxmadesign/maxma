// Final cut: downloads the Higgsfield shots, cuts them to edit.json, adds captions + the LiveX end card, mixes out/score.wav.
// node cut.mjs [--clips clips] [--no-download] [--no-audio] [--name livex-ai-city-v1]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const EDIT = JSON.parse(fs.readFileSync(path.join(ROOT, 'edit.json'), 'utf8'));
const [W, H] = EDIT.size;
const FPS = EDIT.fps;
const CLIPS = path.resolve(ROOT, opt('clips', 'clips'));
const WORK = path.join(ROOT, 'cut');
const OUT = path.join(ROOT, 'out');
const DURATION = EDIT.shots.reduce((s, x) => s + x.frames, 0) / FPS;

function ff(argv) {
  const r = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...argv], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// 1 · download every shot once (the 2A/2C pair shares a file)
fs.mkdirSync(CLIPS, { recursive: true });
for (const file of [...new Set(EDIT.shots.map((s) => s.file))]) {
  const dest = path.join(CLIPS, file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;
  if (flag('no-download')) { console.error(`missing ${dest} (and --no-download given)`); process.exit(1); }
  const res = await fetch(EDIT.base + file);
  if (!res.ok) { console.error(`download failed (${res.status}): ${EDIT.base + file}`); process.exit(1); }
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`↓ ${file}`);
}

const wav = path.join(OUT, 'score.wav');
const noAudio = flag('no-audio');
if (!noAudio && !fs.existsSync(wav)) {
  console.error('out/score.wav is missing — run `python audio/score.py` first (or pass --no-audio).');
  process.exit(1);
}

// 2 · caption and end-card overlays as transparent PNGs, drawn with the project's own fonts
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });
const server = await serve();
const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?render`);
  await page.waitForFunction(() => window.__ready === true);
  const png = (spec) => page.evaluate(async ({ W, H, spec }) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    if (spec.caption) {
      g.font = '500 44px "Inter Tight", "Noto Sans SC"';
      g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 18; g.shadowOffsetY = 2;
      g.fillStyle = '#ffffff';
      g.fillText(spec.caption, W / 2, H - 118);
    }
    if (spec.logo) {
      const img = new Image();
      img.src = 'assets/logo-white.png';
      await img.decode();
      const w = 520, h = (w * img.height) / img.width;
      g.drawImage(img, (W - w) / 2, H / 2 - h - 10, w, h);
    }
    if (spec.tagline) {
      g.font = 'italic 400 64px "Instrument Serif"';
      g.fillStyle = '#ffffff';
      g.fillText(spec.tagline, W / 2, H / 2 + 96);
    }
    return c.toDataURL('image/png').split(',')[1];
  }, { W, H, spec });
  for (const [i, c] of EDIT.captions.entries()) fs.writeFileSync(path.join(WORK, `cap${i}.png`), Buffer.from(await png({ caption: c.text }), 'base64'));
  fs.writeFileSync(path.join(WORK, 'logo.png'), Buffer.from(await png({ logo: true }), 'base64'));
  fs.writeFileSync(path.join(WORK, 'tagline.png'), Buffer.from(await png({ tagline: EDIT.endCard.text }), 'base64'));
} finally {
  await browser.close();
  server.close();
}

// 3 · cut each shot frame-exactly to 1920×1080 @ 24 fps (sources are 1912×1080: scale to width, crop height)
const list = [];
for (const [i, s] of EDIT.shots.entries()) {
  const seg = path.join(WORK, `s${String(i).padStart(2, '0')}.mp4`);
  ff(['-ss', String(s.in), '-i', path.join(CLIPS, s.file), '-frames:v', String(s.frames), '-an',
    '-vf', `scale=${W}:-2:flags=lanczos,crop=${W}:${H},setsar=1,fps=${FPS},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '10', seg]);
  list.push(`file '${seg}'`);
}
fs.writeFileSync(path.join(WORK, 'list.txt'), list.join('\n'));
ff(['-f', 'concat', '-safe', '0', '-i', path.join(WORK, 'list.txt'), '-c', 'copy', path.join(WORK, 'cat.mp4')]);

// 4 · grade-free assembly: fade up from black, captions, dim + logo + tagline over the aerial, score
const fadeWin = (a, b, f = 0.2) => `fade=t=in:st=${a}:d=${f}:alpha=1,fade=t=out:st=${(b - f).toFixed(3)}:d=${f}:alpha=1`;
const inputs = ['-i', path.join(WORK, 'cat.mp4')];
const still = (f) => inputs.push('-loop', '1', '-framerate', String(FPS), '-t', String(DURATION), '-i', path.join(WORK, f));
EDIT.captions.forEach((_, i) => still(`cap${i}.png`));
still('logo.png');
still('tagline.png');
const n = EDIT.captions.length;
const e = EDIT.endCard;
const g = [
  `[0:v]fade=t=in:st=0:d=0.4[v0]`,
  `color=black:s=${W}x${H}:r=${FPS}:d=${DURATION},format=rgba,colorchannelmixer=aa=0.55,fade=t=in:st=${e.dim}:d=0.6:alpha=1[dim]`,
  `[v0][dim]overlay=format=auto[v1]`,
];
let last = 'v1';
EDIT.captions.forEach((c, i) => {
  g.push(`[${i + 1}:v]format=rgba,${fadeWin(c.from, c.to)}[c${i}]`, `[${last}][c${i}]overlay=format=auto[w${i}]`);
  last = `w${i}`;
});
g.push(`[${n + 1}:v]format=rgba,fade=t=in:st=${e.logo}:d=0.5:alpha=1[lg]`, `[${last}][lg]overlay=format=auto[wl]`);
g.push(`[${n + 2}:v]format=rgba,fade=t=in:st=${e.tagline}:d=0.5:alpha=1[tg]`, `[wl][tg]overlay=format=auto,format=yuv420p[v]`);

const name = opt('name', 'livex-ai-city-v1');
const mp4 = path.join(OUT, `${name}.mp4`);
fs.mkdirSync(OUT, { recursive: true });
ff([
  ...inputs, ...(noAudio ? [] : ['-i', wav]),
  '-filter_complex', g.join(';'), '-map', '[v]', ...(noAudio ? [] : ['-map', `${n + 3}:a`]),
  '-t', String(DURATION), '-r', String(FPS),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', opt('crf', '16'), '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  ...(noAudio ? [] : ['-c:a', 'aac', '-b:a', '256k', '-ar', '48000']),
  '-movflags', '+faststart', mp4,
]);
console.log(`cut → ${mp4} (${DURATION.toFixed(2)} s, ${EDIT.shots.length} shots)`);
