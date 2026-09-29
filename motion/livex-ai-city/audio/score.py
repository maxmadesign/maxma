"""Animatic soundtrack: warm piano + pulse, the two-note Lyra motif at every node, a city chord at the end."""
import json, sys
from pathlib import Path
import numpy as np
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT.parent / 'claude-resume' / 'audio'))
import score as S  # reuse the synth voices from the résumé score

SR, N = S.SR, S.N
rng = np.random.default_rng(3)


def lyra(root=76, gain=0.16):
    """The Lyra motif: two bell notes a perfect fifth apart."""
    return [(0.0, S.bell(root, 1.2, ratio=2.0, index=0.9, decay=0.35), gain), (0.14, S.bell(root + 7, 1.4, ratio=2.0, index=0.8, decay=0.45), gain * 0.9)]


def main():
    cues = json.loads((ROOT / 'audio' / 'cues.json').read_text())
    b = S.Bus()
    t = np.arange(N) / SR
    # ambience beds: lobby (0-14), metro rumble (14-18), plaza crowd (18-22), arena (26-28)
    def bed(t0, t1, lo, hi, g):
        n = S.bp(S.noise(t1 - t0), lo, hi)
        e = np.minimum(1, np.minimum(np.arange(len(n)) / (0.3 * SR), (len(n) - np.arange(len(n))) / (0.3 * SR)))
        b.add(t0, n * e, g)
    bed(0, 14, 200, 1800, 0.035); bed(14, 18, 40, 300, 0.12); bed(18, 22, 300, 3000, 0.05); bed(26, 28.5, 400, 4000, 0.08)
    # music: sparse piano from 4 s, pulse from 10 s (120 BPM so the montage lands on beats)
    chords = {4: [57, 60, 64, 69], 6: [53, 57, 60, 65], 8: [55, 59, 62, 67], 10: [57, 60, 64, 69], 12: [53, 57, 60, 64],
              14: [50, 57, 60, 65], 16: [55, 59, 62, 67], 18: [57, 60, 64, 69], 20: [53, 57, 60, 65], 22: [55, 62, 67, 71],
              24: [57, 64, 69, 72], 26: [53, 60, 65, 69], 28: [57, 64, 69, 76]}
    for t0, ch in chords.items():
        for k, m in enumerate(ch):
            b.add(t0 + k * 0.03, S.pad_note(m, 1.9 if t0 < 28 else 1.6, a=0.02 if t0 < 22 else 0.2, r=1.0), 0.05 if t0 < 10 else 0.07, pan=(k - 1.5) * 0.25)
        b.add(t0, S.bell(ch[-1] + 12, 1.5, ratio=3.0, index=0.6, decay=0.5), 0.05)
    for i in range(int((26 - 10) / 0.5)):
        tt = 10 + i * 0.5
        if 13.8 < tt < 14.2 or 17.8 < tt < 18.2:
            continue
        b.add(tt, S.kick(0.6, 0.35), 0.28 if tt < 22 else 0.4)
        b.add(tt + 0.25, S.hat(), 0.18)
    for c in cues:
        k, at = c['k'], c['t']
        if k == 'lyra':
            for dt, x, g in lyra(): b.add(at + dt, x, g)
        elif k == 'beat':
            for dt, x, g in lyra(76 + (c['i'] % 4) * 2, 0.09): b.add(at + dt, x, g)
        elif k == 'whoosh':
            x = S.svf_sweep(S.noise(0.6), 400, 5000, q=0.9) * np.sin(np.pi * np.linspace(0, 1, int(0.6 * SR))) ** 2
            b.add(at - 0.3, x, 0.18)
        elif k == 'cheer':
            n = S.bp(S.noise(2.2), 500, 5000) * S.env(2.2, 0.08, 0.9)
            b.add(at, n, 0.35); b.add(at, S.kick(1.0, 0.6), 0.5)
        elif k == 'node':
            m = [69, 72, 76, 79, 81, 84, 88][c['i']]
            b.add(at, S.bell(m, 2.0, ratio=2.0, index=0.8, decay=0.8), 0.1, pan=(c['i'] - 3) * 0.25)
    out = b.st()
    out = out + S.reverb(out, 2.8, 0.3)
    out = S.hp(out, 30)
    out *= 10 ** (-18 / 20) / np.sqrt(np.mean(out ** 2))
    out = np.tanh(out * 1.1) / 1.1
    out *= 10 ** (-1 / 20) / np.max(np.abs(out))
    fade = np.linspace(1, 0, int(0.6 * SR)); out[:, -len(fade):] *= fade
    (ROOT / 'out').mkdir(exist_ok=True)
    wavfile.write(ROOT / 'out' / 'score.wav', SR, (out.T * 32767).astype(np.int16))
    print('score.wav ok')


if __name__ == '__main__':
    main()
