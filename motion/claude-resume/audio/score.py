"""Soundtrack for the motion résumé — synthesized from sine waves and noise.

120 BPM, 15 bars of 4/4 (30 s). Sound effects are placed from audio/cues.json,
which the renderer exports from the same timeline that drives the visuals.

    python audio/score.py  ->  out/score.wav
"""
import json
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
DUR = 30.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(7)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(d):
    return np.arange(int(d * SR)) / SR


def env(d, a=0.005, decay=0.2):
    t = tt(d)
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / decay)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def svf_sweep(x, f0, f1, q=0.7, mode='bp'):
    """State-variable filter with an exponential cutoff sweep."""
    n = len(x)
    fc = f0 * (f1 / f0) ** (np.arange(n) / max(1, n - 1))
    g = 2 * np.sin(np.pi * np.minimum(fc, SR / 6) / SR)
    low = band = 0.0
    out = np.empty(n)
    for i in range(n):
        high = x[i] - low - q * band
        band += g[i] * high
        low += g[i] * band
        out[i] = band if mode == 'bp' else low
    return out


class Bus:
    def __init__(self):
        self.l = np.zeros(N + SR * 3)
        self.r = np.zeros(N + SR * 3)

    def add(self, t0, x, gain=1.0, pan=0.0):
        i = int(round(t0 * SR))
        if i < 0:
            x, i = x[-i:], 0
        x = x[: len(self.l) - i]
        gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.l[i:i + len(x)] += x * gain * gl * 1.414
        self.r[i:i + len(x)] += x * gain * gr * 1.414

    def st(self):
        return np.stack([self.l[:N], self.r[:N]])


# ------------------------------------------------------------------ instruments

def kick(level=1.0, d=0.45):
    t = tt(d)
    f = 46 + 120 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 400) * 0.25
    return np.tanh(1.6 * (body + click)) * level


def clap():
    t = tt(0.25)
    n = bp(rng.standard_normal(len(t)), 900, 3200)
    e = np.zeros_like(t)
    for k, o in enumerate([0, 0.011, 0.022]):
        e += (t >= o) * np.exp(-np.maximum(0, t - o) * (180 if k < 2 else 22))
    return n * e * 0.6


def hat(open_=False):
    t = tt(0.18 if open_ else 0.06)
    return hp(rng.standard_normal(len(t)), 7500, 4) * np.exp(-t * (18 if open_ else 70)) * 0.35


def bass(m, d=0.24):
    t = tt(d)
    f = midi(m)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return np.tanh(1.4 * x) * env(d, 0.004, 0.13)


def bell(m, d=0.9, ratio=3.5, index=2.2, decay=0.28):
    t = tt(d)
    f = midi(m)
    mod = np.sin(2 * np.pi * f * ratio * t) * index * np.exp(-t * 9)
    return np.sin(2 * np.pi * f * t + mod) * env(d, 0.002, decay)


def pad_note(m, d, a=0.35, r=0.7):
    t = tt(d + r)
    f = midi(m)
    x = np.zeros_like(t)
    for det in (-0.07, 0.0, 0.08):
        ff = f * 2 ** (det / 12)
        for h in range(1, 7):
            x += np.sin(2 * np.pi * ff * h * t + h * 0.7 + det * 30) / (h ** 1.3)
    e = np.minimum(1, t / a) * np.where(t < d, 1, np.exp(-(t - d) / (r / 3)))
    return x * e / 3


def noise(d):
    return rng.standard_normal(int(d * SR))


def tone(f0, f1, d, decay=0.1, shape='sine'):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) if shape == 'sine' else np.tanh(3 * np.sin(ph))
    return x * env(d, 0.003, decay)


# ------------------------------------------------------------------ harmony

CHORDS = [
    [53, 57, 60, 64, 67], [53, 57, 60, 64, 67],          # Fmaj9 (intro)
    [53, 57, 60, 64], [57, 60, 64, 67], [58, 62, 65, 69], [55, 60, 62, 67],  # F  Am7  Bbmaj7  Csus2
    [53, 57, 60, 64], [57, 60, 64, 67], [58, 62, 65, 69], [55, 60, 65, 67],  # F  Am7  Bbmaj7  Csus4
    [53, 57, 60, 62, 64], [58, 62, 65, 69, 72],          # Dm9  Bbmaj9  (dark mode)
    [55, 58, 62, 65],                                    # Gm7 (montage)
    [53, 57, 60, 64, 67], [53, 57, 60, 64, 67],          # Fmaj9 resolve
]
ROOTS = [41, 41, 41, 45, 46, 48, 41, 45, 46, 48, 38, 46, 43, 41, 41]
STABS = [[55, 58, 62, 65, 70], [55, 58, 62, 65, 70], [55, 58, 60, 65, 70], [55, 58, 60, 64, 70]]


def section(t):
    if t < 4:
        return 'intro'
    if t < 10:
        return 'motion'
    if t < 16.5:
        return 'graphics'
    if t < 19.5:
        return 'ui'
    if t < 20:
        return 'break'
    if t < 24:
        return 'dark'
    if t < 26:
        return 'montage'
    return 'outro'


def music():
    pad, drums, low = Bus(), Bus(), Bus()
    kicks = []
    for b, ch in enumerate(CHORDS):
        t0 = b * 2.0
        if b == 12:
            continue  # the montage bar is played as stabs
        lvl = 1.0 if b < 2 else 0.5 if b < 13 else 1.05
        d = 2.0 if b < 14 else 1.75
        if b == 9:
            d = 1.5  # leave room for the riser
        for k, m in enumerate(ch):
            pad.add(t0, pad_note(m, d), lvl * 0.06, pan=(k / max(1, len(ch) - 1) - 0.5) * 0.7)

    for i in range(60):
        t = i * BEAT
        s = section(t)
        on_bar = i % 4 == 0
        half = i % 2 == 0
        if s in ('motion', 'ui') and half or s in ('graphics', 'dark', 'montage'):
            if not (s == 'ui' and t >= 19.0):
                drums.add(t, kick(0.95), 0.66)
                kicks.append(t)
        if s in ('graphics', 'dark') and i % 4 in (1, 3):
            drums.add(t, clap(), 0.5, pan=0.05)
        if s in ('motion', 'graphics', 'ui', 'dark', 'montage') and t < 19.25:
            drums.add(t + 0.25, hat(open_=(i % 4 == 3 and s == 'graphics')), 0.5, pan=0.25)
            if s in ('graphics', 'dark'):
                drums.add(t, hat(), 0.22, pan=-0.2)
        elif s in ('dark', 'montage'):
            drums.add(t + 0.25, hat(), 0.5, pan=0.25)
        # bass: eighth-note pulse on the bar's root
        if s in ('motion', 'graphics', 'ui', 'dark') and t < 19.5:
            root = ROOTS[int(t // 2)]
            for e in (0, 0.25):
                m = root + (12 if (e and s == 'graphics' and i % 2) else 0)
                low.add(t + e, bass(m), 0.2)

    # montage chord stabs on every beat
    for k, ch in enumerate(STABS):
        t = 24 + k * 0.5
        for j, m in enumerate(ch):
            x = pad_note(m, 0.18, a=0.004, r=0.35)
            pad.add(t, x, 0.11, pan=(j / 4 - 0.5) * 0.8)
        low.add(t, bass(ROOTS[12] if k < 2 else 36 + 12, 0.45), 0.4)

    # outro: a gentle bell arpeggio over the resolve
    for k, m in enumerate([72, 69, 65, 76, 72]):
        pad.add(27.0 + k * 0.25, bell(m, 1.4, decay=0.5), 0.13, pan=(k - 2) * 0.2)

    # sidechain: everything melodic ducks under the kick
    duck = np.ones(N)
    for t in kicks:
        i = int(t * SR)
        seg = 1 - 0.55 * np.exp(-tt(0.35) / 0.09)
        duck[i:i + len(seg)] = np.minimum(duck[i:i + len(seg)], seg[: N - i])
    melodic = (pad.st() + low.st()) * duck
    return melodic, drums.st()


# ------------------------------------------------------------------ sound design

def sfx(cues):
    b = Bus()
    scale = [65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 91, 93, 96]
    for c in cues:
        t, k = c['t'], c['k']
        i = c.get('i', 0)
        if k == 'ping':
            b.add(t, bell(84, 1.6, ratio=2.0, index=1.2, decay=0.5), 0.24)
            b.add(t + 0.18, bell(91, 1.2, ratio=2.0, index=0.8, decay=0.4), 0.07, pan=0.3)
        elif k == 'note':
            b.add(t, bell(scale[min(i, len(scale) - 1)], 0.6, decay=0.16), 0.17, pan=-0.5 + i / 13)
        elif k in ('tick', 'soft', 'type'):
            x = tone(2600, 2400, 0.03, 0.01); x[:960] += hp(noise(0.02), 3000) * env(0.02, 0.0005, 0.004) * 0.6
            b.add(t, x, 0.22 if k == 'tick' else 0.1)
        elif k == 'swish':
            d = c.get('d', 0.4)
            f0, f1 = (500, 4500) if c.get('dir', 1) > 0 else (4000, 400)
            x = svf_sweep(noise(d), f0, f1, q=0.9)
            e = np.sin(np.pi * np.linspace(0, 1, len(x))) ** 2
            b.add(t, x * e, 0.16, pan=0.2 * c.get('dir', 1))
        elif k == 'slide':
            d = c.get('d', 0.6)
            x = svf_sweep(noise(d), 1500, 600, q=1.4) * np.sin(np.pi * np.linspace(0, 1, int(d * SR)))
            b.add(t, x, 0.11)
        elif k == 'thud':
            b.add(t, kick(0.8, 0.3), 0.45)
            b.add(t, tick_x(), 0.15)
        elif k == 'race':
            for j in range(3):
                d = 0.9
                x = svf_sweep(noise(d), 700 + 400 * j, 3500, q=1.1) * np.sin(np.pi * np.linspace(0, 1, int(d * SR))) ** 2
                b.add(t, x, 0.07, pan=-0.4 + j * 0.4)
        elif k == 'pop':
            b.add(t, tone(900 + 220 * i, 1400 + 260 * i, 0.08, 0.03), 0.12, pan=-0.3 + 0.2 * i)
        elif k == 'grow':
            b.add(t, tone(300, 520, 0.3, 0.12), 0.12)
        elif k == 'charge':
            d = c.get('d', 0.5)
            b.add(t, tone(180, 120, d, d) * np.linspace(0.3, 1, int(d * SR)), 0.1)
        elif k == 'boing':
            tb = tt(0.6)
            f = 260 * (1 + 0.8 * tb / 0.6) * (1 + 0.12 * np.exp(-tb * 5) * np.sin(2 * np.pi * 14 * tb))
            x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(0.6, 0.004, 0.22)
            b.add(t, x, 0.13)
        elif k in ('impact', 'drop'):
            deep = k == 'drop'
            b.add(t, kick(1.0, 0.6), 0.9)
            sub = np.sin(2 * np.pi * np.cumsum(48 - 16 * tt(1.6) / 1.6) / SR) * env(1.6, 0.005, 0.55 if deep else 0.35)
            b.add(t, sub, 0.45)
            n = lp(noise(1.2), 2500 if deep else 4000) * env(1.2, 0.002, 0.18)
            b.add(t, n, 0.35)
            if deep:
                for j, m in enumerate([50, 57, 62, 65]):
                    b.add(t, pad_note(m, 0.3, a=0.004, r=1.4), 0.06, pan=(j - 1.5) * 0.3)
        elif k == 'shimmer':
            for j in range(10):
                b.add(t + j * 0.05, bell(scale[4 + j % 10], 0.5, decay=0.12), 0.045, pan=-0.6 + j * 0.13)
        elif k == 'blip':
            b.add(t, bell(scale[5 + i], 0.35, ratio=2.0, index=0.8, decay=0.08), 0.07, pan=0.3)
        elif k == 'select':
            b.add(t, tick_x(), 0.2)
            b.add(t, tone(1300 + 200 * i, 1300 + 200 * i, 0.07, 0.03), 0.08)
        elif k == 'error':
            for j in range(2):
                b.add(t + j * 0.09, lp(tone(190, 180, 0.08, 0.05, shape='square'), 1800), 0.09)
        elif k == 'success':
            b.add(t, bell(84, 1.0, ratio=2.0, index=1.0, decay=0.3), 0.12, pan=-0.15)
            b.add(t + 0.09, bell(89, 1.2, ratio=2.0, index=1.0, decay=0.4), 0.12, pan=0.15)
        elif k == 'hover':
            b.add(t, tone(1500, 1700, 0.06, 0.03), 0.06)
        elif k == 'click':
            b.add(t, tick_x(), 0.35)
            b.add(t, tone(180, 90, 0.06, 0.02), 0.2)
        elif k == 'morph':
            b.add(t, tone(900, 420, 0.25, 0.12), 0.07)
        elif k == 'toggle':
            b.add(t, tone(520, 780, 0.12, 0.05), 0.14)
        elif k == 'riser':
            d = c.get('d', 0.45)
            x = svf_sweep(noise(d), 300, 7000, q=0.6)
            x += 0.4 * tone(220, 880, d, 10)
            b.add(t, x * np.linspace(0, 1, int(d * SR)) ** 2, 0.22)
        elif k == 'stab':
            b.add(t, kick(1.0), 0.6)
            b.add(t, clap(), 0.25)
        elif k == 'reverse':
            d = 0.5
            x = svf_sweep(noise(d), 6000, 300, q=0.8) * np.linspace(1, 0, int(d * SR)) ** 1.5
            b.add(t, x, 0.2)
            b.add(t + 0.45, bell(77, 1.0, ratio=2.0, index=1.0, decay=0.3), 0.08)
    return b.st()


def tick_x():
    return hp(noise(0.012), 2500) * env(0.012, 0.0003, 0.003)


def reverb(x, seconds=2.2, wet=0.18):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = []
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * 6.9 / seconds)
        ir = lp(ir, 5000)
        ir[: int(0.012 * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(fftconvolve(x[ch], ir)[: x.shape[1]])
    return np.stack(out) * wet


def main():
    cues = json.loads((ROOT / 'audio' / 'cues.json').read_text())
    melodic, drums = music()
    fx = sfx(cues)

    # dark mode: the music goes under water (low-pass), then opens again for the montage
    t = np.arange(N) / SR
    mix_lp = np.clip((t - 19.6) / 0.4, 0, 1) * np.clip((24.0 - t) / 0.08, 0, 1)
    both = melodic + drums
    filt = np.stack([lp(ch, 900, 2) for ch in both])
    music_bus = both * (1 - mix_lp) + filt * mix_lp * 1.25

    dry = music_bus + fx * 1.0
    wet = reverb(music_bus * 0.6 + fx, 2.4, 0.22)
    out = dry + wet
    out = hp(out, 28)

    # master: gentle glue, soft clip, peak at -1 dBFS; micro fades make the loop click-free
    rms = np.sqrt(np.mean(out ** 2))
    out *= 10 ** (-17 / 20) / rms
    out = np.tanh(out * 1.2) / 1.2
    out *= 10 ** (-1 / 20) / np.max(np.abs(out))
    f = int(0.004 * SR)
    out[:, :f] *= np.linspace(0, 1, f)
    out[:, -f:] *= np.linspace(1, 0, f)

    (ROOT / 'out').mkdir(exist_ok=True)
    wavfile.write(ROOT / 'out' / 'score.wav', SR, (out.T * 32767).astype(np.int16))
    print(f"score.wav · {DUR:.0f} s · rms {20 * np.log10(np.sqrt(np.mean(out ** 2))):.1f} dBFS · peak {20 * np.log10(np.max(np.abs(out))):.1f} dBFS")


if __name__ == '__main__':
    main()
