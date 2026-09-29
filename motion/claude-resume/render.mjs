// Headless renderer: node render.mjs [--stills 1.2,3.4] [--frames] [--encode] [--cues] [--workers 4]
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
const WORKERS = parseInt(opt('workers', '4'), 10);
const FRAMES_DIR = path.join(ROOT, 'frames');
const OUT = path.join(ROOT, 'out');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

async function openPage(browser, port) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
  await page.goto(`http://127.0.0.1:${port}/index.html?render`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  return page;
}

const BLUR = parseInt(opt('blur', '8'), 10);
async function grab(page, t) {
  const b64 = await page.evaluate(([time, blur]) => {
    if (blur > 1) window.renderBlurred(time, blur, 0.5);
    else window.renderAt(time);
    return document.getElementById('c').toDataURL('image/png').split(',')[1];
  }, [t, BLUR]);
  return Buffer.from(b64, 'base64');
}

const server = await serve();
const port = server.address().port;
const browser = await chromium.launch({ args: ['--disable-gpu', '--force-color-profile=srgb', '--font-render-hinting=none'] });

try {
  if (flag('cues')) {
    const page = await openPage(browser, port);
    const cues = await page.evaluate(() => window.cues());
    fs.writeFileSync(path.join(ROOT, 'audio', 'cues.json'), JSON.stringify(cues, null, 1));
    console.log(`cues: ${cues.length} → audio/cues.json`);
  }

  const stills = opt('stills', null);
  if (stills) {
    const dir = path.join(OUT, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    const page = await openPage(browser, port);
    for (const s of stills.split(',')) {
      const t = parseFloat(s);
      const buf = await grab(page, t);
      fs.writeFileSync(path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`), buf);
    }
    console.log(`stills → ${dir}`);
  }

  if (flag('frames')) {
    fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
    const probe = await openPage(browser, port);
    const total = await probe.evaluate(() => window.frameCount);
    await probe.context().close();
    const from = parseInt(opt('from', '0'), 10);
    const to = parseInt(opt('to', String(total)), 10);
    let next = from, done = 0;
    const t0 = Date.now();
    await Promise.all(
      Array.from({ length: WORKERS }, async () => {
        const page = await openPage(browser, port);
        while (next < to) {
          const f = next++;
          const buf = await grab(page, f / 60);
          fs.writeFileSync(path.join(FRAMES_DIR, `${String(f).padStart(5, '0')}.png`), buf);
          if (++done % 120 === 0) console.log(`  ${done}/${to - from} frames · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
        }
      }),
    );
    console.log(`frames: ${done} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
} finally {
  await browser.close();
  server.close();
}

if (flag('encode')) {
  const wav = path.join(OUT, 'score.wav');
  const noAudio = flag('no-audio');
  const hasAudio = !noAudio && fs.existsSync(wav);
  if (!hasAudio && !noAudio) {
    console.error('out/score.wav is missing — run `python audio/score.py` first (or pass --no-audio for a silent encode).');
    process.exit(1);
  }
  const name = opt('name', 'claude-motion-resume');
  const mp4 = path.join(OUT, `${name}.mp4`);
  const cmd = [
    '-y', '-hide_banner', '-loglevel', 'error', '-stats',
    '-framerate', '60', '-i', path.join(FRAMES_DIR, '%05d.png'),
    ...(hasAudio ? ['-i', wav] : []),
    '-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', opt('crf', '15'), '-tune', 'animation',
    '-profile:v', 'high', '-level', '4.2', '-g', '120', '-bf', '2',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    ...(hasAudio ? ['-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest'] : []),
    '-movflags', '+faststart', mp4,
  ];
  const r = spawnSync(FFMPEG, cmd, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
  if (hasAudio) {
    // committed, browser-universal copy of the soundtrack for the preview on a fresh checkout
    const o = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libopus', '-b:a', '160k', path.join(OUT, 'score.webm')], { stdio: 'inherit' });
    if (o.status !== 0) process.exit(o.status ?? 1);
  }
  console.log(`encoded → ${mp4}`);
}
