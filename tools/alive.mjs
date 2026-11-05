import { webkit, devices } from 'playwright';
import fs from 'fs';
const base = process.argv[2] || 'http://localhost:8811/', which = process.argv[3] || 'pig', secs = +(process.argv[4] || 30);
const out = '/workspace/jelly/shots/v03g/alive-' + which; fs.mkdirSync(out, { recursive: true });
const b = await webkit.launch({ env: { ...process.env, GIO_USE_PROXY_RESOLVER: 'dummy', GSETTINGS_BACKEND: 'memory' } });
const ctx = await b.newContext({ ...devices['iPhone 15'] });
const p = await ctx.newPage(); const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
await p.goto(base + 'jelly/', { waitUntil: 'commit' });
await p.waitForFunction(() => window.__jellyReady, null, { timeout: 90000 }).catch(() => {});
if (which !== 'pig') { await p.evaluate(c => document.querySelector(`[data-char="${c}"]`)?.click(), which); await p.waitForTimeout(3000); }
await p.evaluate(() => {
  const e = window.__jelly; window.__S = [];
  if (location.search.includes('x') || true) { let i = 0; for (const k in e.alive.next) e.alive.next[k] = e.alive.t + 2 + (i++) * 1.3; }
  setInterval(() => { const nd = e.path.nodes(); if (!nd) return; const { data, stride } = nd; const n = data.length / stride | 0;
    let mn = 1e9, mx = -1e9, sx = 0, sz = 0; for (let i = 0; i < n; i++) { const y = data[i * stride + 1]; mn = Math.min(mn, y); mx = Math.max(mx, y); }
    const th = mn + (mx - mn) * 0.8, bh = mn + (mx - mn) * 0.2; let tx = 0, tc = 0, bx = 0, bc = 0, tz = 0, bz = 0;
    for (let i = 0; i < n; i++) { const y = data[i * stride + 1]; if (y > th) { tx += data[i * stride]; tz += data[i * stride + 2]; tc++; } if (y < bh) { bx += data[i * stride]; bz += data[i * stride + 2]; bc++; } }
    window.__S.push([e.simTime, mx - mn, mx, (tx / tc - bx / bc), (tz / tc - bz / bc), e.alive?.gain ?? -1].map(v => +v.toFixed(4))); }, 100);
});
const t0 = Date.now(); let k = 0;
while ((Date.now() - t0) / 1000 < secs) { await p.screenshot({ path: `${out}/f${String(k++).padStart(3, '0')}.jpg`, quality: 60, type: 'jpeg' }); await p.waitForTimeout(700); }
const S = await p.evaluate(() => window.__S);
fs.writeFileSync(out + '/series.json', JSON.stringify(S));
console.log('samples', S.length, 'simT', S.at(-1)?.[0], 'errs', errs);
const h = S.map(s => s[1]), tx = S.map(s => s[3]);
const st = a => { const m = a.reduce((x, y) => x + y) / a.length; return { mean: +m.toFixed(4), min: Math.min(...a), max: Math.max(...a) }; };
console.log('height', st(h), 'headX', st(tx));
await b.close();
