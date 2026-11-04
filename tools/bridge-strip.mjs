// /sea/ v03d review: one seam crossing as a time strip (deterministic: window.__pause + __steps, 60 Hz sim steps)
// node tools/bridge-strip.mjs <sceneN 1..15> [WxH] [base] [frames] [stepsPerFrame] → review/v03d/strip-<N>[-land].png
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
const n = +(process.argv[2] || 3), [W, H] = (process.argv[3] || '390x844').split('x').map(Number), base = process.argv[4] || 'http://localhost:8811/';
const F = +(process.argv[5] || 8), SPF = +(process.argv[6] || 60), dir = 'review/v03d', land = W > H;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.evaluateOnNewDocument(() => { window.__pause = true; });
await p.goto(`${base}sea/?lang=zh&at=${n}&p=-0.42`, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 2400)); // veil
const files = [];
for (let k = 0; k < F; k++) {
  await p.evaluate(s => { window.__steps = s; }, k ? SPF : 1);
  await p.waitForFunction(() => !window.__steps, { timeout: 120000 });
  await new Promise(r => setTimeout(r, 60));
  const f = `/tmp/strip-${n}-${k}.png`; await p.screenshot({ path: f }); files.push(f);
}
console.log('errors', errs); await b.close();
execFileSync('python3', ['-c', `
from PIL import Image
import sys
fs=sys.argv[1:]; ims=[Image.open(f) for f in fs]; w,h=ims[0].size; s=0.4
C=len(ims) if h>w else 4; Rn=(len(ims)+C-1)//C
o=Image.new('RGB',(int(w*s)*C+4*(C-1),int(h*s)*Rn+4*(Rn-1)),(20,20,24))
for i,im in enumerate(ims): o.paste(im.resize((int(w*s),int(h*s))),((i%C)*(int(w*s)+4),(i//C)*(int(h*s)+4)))
o.save('${dir}/strip-${n}${land ? '-land' : ''}.png')`, ...files]);
