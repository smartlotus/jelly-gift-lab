import { webkit, devices } from 'playwright';
import fs from 'fs';
const base = process.argv[2] || 'http://localhost:8811/';
const out = process.argv[3] || '/workspace/jelly/shots/v03g'; fs.mkdirSync(out, { recursive: true });
const vps = [['390', { width: 390, height: 844 }], ['430', { width: 430, height: 932 }]];
const b = await webkit.launch({ env: { ...process.env, GIO_USE_PROXY_RESOLVER: 'dummy', GSETTINGS_BACKEND: 'memory' } });
for (const [n, vp] of vps) {
  const ctx = await b.newContext({ ...devices['iPhone 15'], viewport: vp });
  const p = await ctx.newPage(); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + 'jelly/', { waitUntil: 'commit' });
  await p.waitForFunction(() => window.__jellyReady, null, { timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(3500);
  for (const c of ['pig', 'cat', 'shark']) {
    await p.evaluate(c => document.querySelector(`[data-char="${c}"]`)?.click(), c);
    await p.waitForTimeout(4500);
    await p.screenshot({ path: `${out}/jelly-${n}-${c}.png` });
  }
  const r = await p.evaluate(() => { const q = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); }; return { grav: q('#grav'), shroom: q('#shroom'), lang: q('.lang'), chars: q('.characters'), ctl: q('.controls'), hint: q('#hint') }; });
  console.log(n, JSON.stringify(r), errs);
  await ctx.close();
}
await b.close();
