// /sea/ review grids (v03b): each film scene frozen mid-beat (?at=N&p=..&beat=..), 3x3 → review/v03b/sea-grid[-land].png
// node tools/sea-shots.mjs [WxH] [base]
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
const [W, H] = (process.argv[2] || '390x844').split('x').map(Number), base = process.argv[3] || 'http://localhost:8811/';
const land = W > H, dir = 'review/v03b';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
// [scene, shark progress, beat seconds]: the moment each NPC beat reads best
const beats = [[1, 0.36, 2], [2, 0.3, 5], [3, 0.3, 3.2], [4, 0.32, 2.5], [5, 0.34, 2.5], [6, 0.66, 2], [7, 0.4, 3.4], [8, 0.42, 2.6], [9, 0.34, 2.4]];
const files = [];
for (const [n, pr, bt] of beats) {
  await p.goto(`${base}sea/?lang=zh&at=${n}&p=${pr}&beat=${bt}`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1800));
  const f = `${dir}/sea-${n}-${W}x${H}.png`; await p.screenshot({ path: f }); files.push(f);
}
await p.goto(`${base}sea/?lang=zh&end`, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 6500)); await p.screenshot({ path: `${dir}/sea-end-${W}x${H}.png` });
console.log('errors', errs); await b.close();
execFileSync('python3', ['-c', `
from PIL import Image
import sys
fs=sys.argv[1:]; ims=[Image.open(f) for f in fs]; w,h=ims[0].size; s=0.5
o=Image.new('RGB',(int(w*s)*3+8,int(h*s)*3+8),(20,20,24))
for i,im in enumerate(ims): o.paste(im.resize((int(w*s),int(h*s))),((i%3)*(int(w*s)+4),(i//3)*(int(h*s)+4)))
o.save('${dir}/sea-grid${land ? '-land' : ''}.png')`, ...files]);
