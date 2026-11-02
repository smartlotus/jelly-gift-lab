#!/usr/bin/env python3
"""Subset self-hosted OFL fonts. Sources (download into fonts-src/):
  https://github.com/google/fonts/raw/main/ofl/sourceserif4/SourceSerif4%5Bopsz,wght%5D.ttf  -> SourceSerif4.ttf
  https://github.com/google/fonts/raw/main/ofl/sourceserif4/SourceSerif4-Italic%5Bopsz,wght%5D.ttf -> SourceSerif4-Italic.ttf
  https://github.com/google/fonts/raw/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf -> NotoSerifSC.ttf
Chinese glyphs are limited to the characters actually used in index.html / src (scanned), so the CJK font stays tiny."""
import pathlib, re, subprocess, sys
root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'src/assets/fonts'; out.mkdir(parents=True, exist_ok=True)
text = ''
for p in [root / 'index.html', *root.glob('src/**/*.ts'), *root.glob('src/**/*.css')]:
    text += p.read_text(encoding='utf-8')
extra = '200 天纪念日快乐，lushiva。'  # reserved for the stage-3 easter egg line
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
# Playfair Display (OFL) only carries the easter-egg card: subset to exactly the Latin it shows
egg = (root / 'src/egg/egg.ts').read_text(encoding='utf-8')
lat = ''.join(sorted(set(re.sub(r'[^\x20-\x7e·]', '', ' '.join(re.findall(r'>([^<]*)<', egg))) + '0123456789 ·')))
run('PlayfairDisplay.ttf', 'PlayfairDisplay-sub.woff2', [f'--text={lat}'])
run('PlayfairDisplay-Italic.ttf', 'PlayfairDisplay-Italic-sub.woff2', [f'--text={lat}'])
print('CJK glyphs:', len(cjk_txt), 'Playfair glyphs:', len(lat))
