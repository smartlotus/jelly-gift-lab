// /sea/ v03d review: every seam mid-crossing with its bridge object (?at=N&p=-0.16 → shark nose just before seam N-1→N)
// node tools/seam-shots.mjs [WxH] [base] → review/v03d/seams-grid[-land].png
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
const [W, H] = (process.argv[2] || '390x844').split('x').map(Number), base = process.argv[3] || 'http://localhost:8811/';
const land = W > H, dir = 'review/v03d', wait = +(process.argv[4] || 1700);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
const files = [];
for (let n = 1; n <= 15; n++) {
  await p.goto(`${base}sea/?lang=zh&at=${n}&p=-0.16`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, wait));
  const f = `${dir}/seam-${n - 1}-${W}x${H}.png`; await p.screenshot({ path: f }); files.push(f);
}
console.log('errors', errs); await b.close();
execFileSync('python3', ['-c', `
from PIL import Image
import sys
fs=sys.argv[1:]; ims=[Image.open(f) for f in fs]; w,h=ims[0].size; s=0.5
C=5 if h>w else 3; Rn=(len(ims)+C-1)//C
o=Image.new('RGB',(int(w*s)*C+4*(C-1),int(h*s)*Rn+4*(Rn-1)),(20,20,24))
for i,im in enumerate(ims): o.paste(im.resize((int(w*s),int(h*s))),((i%C)*(int(w*s)+4),(i//C)*(int(h*s)+4)))
o.save('${dir}/seams-grid${land ? '-land' : ''}.png')`, ...files]);
