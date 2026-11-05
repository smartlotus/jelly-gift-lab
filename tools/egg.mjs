import { webkit, devices } from 'playwright';
import fs from 'fs';
const base = process.argv[2] || 'http://localhost:8811/'; const out = '/workspace/jelly/shots/v03g/egg'; fs.mkdirSync(out, { recursive: true });
const b = await webkit.launch({ env: { ...process.env, GIO_USE_PROXY_RESOLVER: 'dummy', GSETTINGS_BACKEND: 'memory' } });
const ctx = await b.newContext({ ...devices['iPhone 15'] });
const p = await ctx.newPage(); const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
await p.goto(base + 'jelly/', { waitUntil: 'commit' });
await p.waitForFunction(() => window.__jellyReady, null, { timeout: 90000 }).catch(() => {});
await p.evaluate(() => document.querySelector('[data-char="shark"]')?.click()); await p.waitForTimeout(3500);
await p.evaluate(() => { window.__fr = []; let l = performance.now(); const f = t => { window.__fr.push(t - l); l = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
await p.evaluate(() => document.getElementById('shroom').click());
const t0 = Date.now(); let i = 0;
while (Date.now() - t0 < 9000) { await p.screenshot({ path: `${out}/e${String(i++).padStart(2, '0')}-${Date.now() - t0}.jpg`, type: 'jpeg', quality: 70 }); await p.waitForTimeout(150); }
const fr = await p.evaluate(() => window.__fr); const s = [...fr].sort((a, b) => a - b);
console.log('frames', fr.length, 'median', s[s.length >> 1], 'p95', s[Math.floor(s.length * .95)], 'errs', errs);
await b.close();
