// /sea/ screenshots: node tools/sea-shots.mjs [WxH] — one frame per scene (?at=N, frozen after a few steps) + the ending
import puppeteer from 'puppeteer-core';
const [W, H] = (process.argv[2] || '390x844').split('x').map(Number);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
const jobs = [...Array(9)].map((_, i) => [`at=${i + 1}&auto`, `s${i + 1}`, 1700]).concat([['', 's0', 3200], ['end', 'end', 7000]]);
for (const [q, n, ms] of jobs) {
  await p.goto(`http://localhost:8811/sea/?lang=zh&${q}`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, ms));
  await p.screenshot({ path: `review/v03/sea-${n}-${W}x${H}.png` });
}
console.log('errors', errs); await b.close();
