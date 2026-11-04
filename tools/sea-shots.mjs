// /sea/ review grids (v03b): each film scene frozen mid-beat (?at=N&p=..&beat=..), 3x3 → review/v03d/sea-grid[-land].png
// node tools/sea-shots.mjs [WxH] [base]
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
const [W, H] = (process.argv[2] || '390x844').split('x').map(Number), base = process.argv[3] || 'http://localhost:8811/';
const land = W > H, dir = 'review/v03d';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
// [scene, shark progress, beat seconds]: the moment each NPC beat reads best
// order: cat, jinzhou, thief, yixian, endgame, shenyang, busan, raccoon, jilin, bill, changbai, mad, drama, still, changchun
const beats = [[1, 0.36, 2], [2, 0.42, 3.5], [3, 0.3, 5], [4, 0.44, 3.5], [5, 0.3, 3.2], [6, 0.44, 3], [7, 0.32, 2.5], [8, 0.34, 2.5], [9, 0.42, 3.5], [10, 0.66, 2], [11, 0.42, 3.5], [12, 0.4, 3.4], [13, 0.42, 2.6], [14, 0.34, 2.4], [15, 0.46, 3.6]];
const files = [];
for (const [n, pr, bt] of beats) {
  await p.goto(`${base}sea/?lang=zh&at=${n}&p=${pr}&beat=${bt}`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1800));
  const f = `${dir}/sea-${n}-${W}x${H}.png`; await p.screenshot({ path: f }); files.push(f);
}
const strip = [];
if (!land) { await p.goto(`${base}sea/?lang=zh&end`, { waitUntil: 'load' }); let last = 0; for (const ms of [300, 1800, 3300, 4800, 6300, 7800, 9600]) { await new Promise(r => setTimeout(r, ms - last)); last = ms; const f = `${dir}/surface-${ms}.png`; await p.screenshot({ path: f }); strip.push(f); } }
console.log('errors', errs); await b.close();
execFileSync('python3', ['-c', `
from PIL import Image
import sys
fs=sys.argv[1:]; ims=[Image.open(f) for f in fs]; w,h=ims[0].size; s=0.5
C=5 if h>w else 3; Rn=(len(ims)+C-1)//C
o=Image.new('RGB',(int(w*s)*C+4*(C-1),int(h*s)*Rn+4*(Rn-1)),(20,20,24))
for i,im in enumerate(ims): o.paste(im.resize((int(w*s),int(h*s))),((i%C)*(int(w*s)+4),(i//C)*(int(h*s)+4)))
o.save('${dir}/sea-grid${land ? '-land' : ''}.png')`, ...files]);
if (strip.length) execFileSync('python3', ['-c', `
from PIL import Image
import sys
ims=[Image.open(f) for f in sys.argv[1:]]; w,h=ims[0].size; s=0.4
o=Image.new('RGB',(int(w*s)*len(ims)+4*(len(ims)-1),int(h*s)),(20,20,24))
for i,im in enumerate(ims): o.paste(im.resize((int(w*s),int(h*s))),(i*(int(w*s)+4),0))
o.save('${dir}/surface-strip.png')`, ...strip]);
