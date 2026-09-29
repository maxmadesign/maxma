"""Rebuild the Noto Sans SC subsets from the Chinese copy in src/animatic.js.

Needs `pip install fonttools brotli`. Run from motion/livex-ai-city after `npm pack @fontsource/noto-sans-sc@5`
and extracting it (tar xzf fontsource-noto-sans-sc-*.tgz), which leaves the font files in ./package/files.
Noto Sans SC is licensed under the SIL Open Font License 1.1.
"""
import glob
from pathlib import Path
from fontTools import subset
from fontTools.merge import Merger
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
chars = sorted({c for c in (ROOT / 'src' / 'animatic.js').read_text(encoding='utf-8') if ord(c) > 0x2000})
for weight in (400, 500):
    parts = []
    for f in sorted(glob.glob(f'package/files/noto-sans-sc-*-{weight}-normal.woff2')):
        font = TTFont(f)
        hit = [c for c in chars if ord(c) in font.getBestCmap()]
        if not hit:
            continue
        opts = subset.Options()
        opts.layout_features = ['*']
        s = subset.Subsetter(opts)
        s.populate(text=''.join(hit))
        s.subset(font)
        font.flavor = None
        part = f'part-{weight}-{len(parts)}.ttf'
        font.save(part)
        parts.append(part)
    merged = Merger().merge(parts)
    merged.flavor = 'woff2'
    out = ROOT / 'fonts' / f'noto-sans-sc-animatic-{weight}-normal.woff2'
    merged.save(out)
    missing = [c for c in chars if ord(c) not in TTFont(out).getBestCmap()]
    print(f'{out.name}: {len(chars)} chars, missing: {"".join(missing) or "none"}')
