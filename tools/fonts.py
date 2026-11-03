#!/usr/bin/env python3
"""Subset self-hosted OFL fonts. Sources (download into fonts-src/):
  https://github.com/google/fonts/raw/main/ofl/sourceserif4/SourceSerif4%5Bopsz,wght%5D.ttf  -> SourceSerif4.ttf
  https://github.com/google/fonts/raw/main/ofl/sourceserif4/SourceSerif4-Italic%5Bopsz,wght%5D.ttf -> SourceSerif4-Italic.ttf
  https://github.com/google/fonts/raw/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf -> NotoSerifSC.ttf
Chinese glyphs are limited to the characters actually used in index.html / src (scanned), so the CJK font stays tiny.
RE-RUN `npm run fonts` AFTER ANY CHINESE COPY CHANGE (new glyphs otherwise fall back to a system serif)."""
import pathlib, re, subprocess, sys
root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'src/assets/fonts'; out.mkdir(parents=True, exist_ok=True)
text = ''
pages = [root / 'index.html', *[root / d / 'index.html' for d in ('shop', 'night', 'jelly')]]  # every journey page (multi-page app)
for p in [*[q for q in pages if q.exists()], *root.glob('src/**/*.ts'), *root.glob('src/**/*.css')]:
    text += p.read_text(encoding='utf-8')
extra = '中'  # language toggle label (also in index.html)
cjk = sorted(set(ch for ch in text + extra if ord(ch) > 0x2E80))
cjk_txt = ''.join(cjk) + '·—，。：；！？“”‘’（）《》、0123456789'
(root / 'tools/.cjk-chars.txt').write_text(cjk_txt, encoding='utf-8')
latin = 'U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-203A,U+2190-2193,U+2212,U+00D7,U+00B7,U+2153-215E,U+2070-209F'
feat = 'kern,liga,clig,calt,tnum,lnum,onum,pnum,case,ss01,frac,sups,smcp,c2sc'
def run(src, dst, args):
    cmd = ['pyftsubset', str(root / 'fonts-src' / src), f'--output-file={out / dst}', '--flavor=woff2', f'--layout-features={feat}', '--no-hinting', '--desubroutinize'] + args
    subprocess.run(cmd, check=True)
    print(dst, (out / dst).stat().st_size, 'bytes')
run('SourceSerif4.ttf', 'SourceSerif4-sub.woff2', [f'--unicodes={latin}'])
run('SourceSerif4-Italic.ttf', 'SourceSerif4-Italic-sub.woff2', [f'--unicodes={latin}'])
run('NotoSerifSC.ttf', 'NotoSerifSC-sub.woff2', [f'--text={cjk_txt}'])
# Playfair Display (OFL) carries the easter-egg card (Latin only, text comes from src/i18n/dict.ts):
# printable ASCII + the few typographic marks the dictionary uses, so any copy edit stays covered
lat = ''.join(chr(c) for c in range(0x20, 0x7f)) + '·’‘“”—–…'
run('PlayfairDisplay.ttf', 'PlayfairDisplay-sub.woff2', [f'--text={lat}'])
run('PlayfairDisplay-Italic.ttf', 'PlayfairDisplay-Italic-sub.woff2', [f'--text={lat}'])
print('CJK glyphs:', len(cjk_txt), 'Playfair glyphs:', len(lat))
