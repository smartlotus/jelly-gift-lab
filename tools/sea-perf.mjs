// /sea/ rough frame-cost probe: mean / p95 rAF interval while crossing a few seams (6x CPU throttle ≈ a mid phone)
// node tools/sea-perf.mjs [base] [WxH]
import puppeteer from 'puppeteer-core';
const base = process.argv[2] || 'http://localhost:8811/', [W, H] = (process.argv[3] || '390x844').split('x').map(Number);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: W, height: H, deviceScaleFactor: 3 });
const cdp = await p.createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
const out = [];
for (const n of [3, 7, 10, 13]) {
  await p.goto(`${base}sea/?lang=zh&at=${n}&p=-0.2`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1500));
  const r = await p.evaluate(() => new Promise(res => { const d = []; let l = performance.now(); const f = now => { d.push(now - l); l = now; if (d.length < 150) requestAnimationFrame(f); else { d.sort((a, b) => a - b); res({ mean: d.reduce((a, b) => a + b) / d.length, p95: d[Math.floor(d.length * 0.95)] }); } }; requestAnimationFrame(f); }));
  out.push(`seam ${n - 1}: mean ${r.mean.toFixed(1)} ms, p95 ${r.p95.toFixed(1)} ms`);
}
console.log(out.join('\n')); await b.close();
