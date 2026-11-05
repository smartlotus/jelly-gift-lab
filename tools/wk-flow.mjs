import { webkit, devices } from 'playwright';
const base = process.argv[2] || 'http://localhost:8811/';
const out = '/workspace/jelly/shots/v03g/flow'; const tag = process.argv[3] || 'flow';
const b = await webkit.launch({ env: { ...process.env, GIO_USE_PROXY_RESOLVER: 'dummy', GSETTINGS_BACKEND: 'memory' } }); const ctx = await b.newContext({ ...devices['iPhone 15'], locale: 'zh-CN' });
const p = await ctx.newPage(); const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
p.on('framenavigated', f => { if (f === p.mainFrame()) console.log('nav', f.url()); });
// 1) night kawaii -> jelly (pink iris -> pink curtain -> gathers into the pig)
await p.goto(base + 'night/?at=kawaii&lang=zh&stay'); await p.waitForTimeout(3500);
await p.screenshot({ path: `${out}/${tag}-a0-kawaii.png` });
await p.click('.kw-go');
const shots = [150, 450, 900, 1500, 2200, 3000, 3800, 4600, 5600, 7000];
let t0 = Date.now();
for (const [i, t] of shots.entries()) { const w = t - (Date.now() - t0); if (w > 0) await p.waitForTimeout(w); await p.screenshot({ path: `${out}/${tag}-a${i + 1}.png` }).catch(e => console.log('shot fail', e.message)); }
console.log('jelly ready', JSON.stringify(await p.evaluate(() => window.__jellyReady)));
// 2) back (bfcache or reload) must not show a stuck veil
await p.goBack(); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/${tag}-b-back.png` });
console.log('after back curtain:', await p.evaluate(() => document.getElementById('gift-curtain')?.className), 'iris', await p.evaluate(() => document.querySelector('.gift-iris')?.style.opacity));
// 3) ar -> shop (dissolve paper) 
await p.goto(base + 'ar/?lang=zh'); await p.waitForTimeout(2500);
console.log('errors:', errs.length ? errs : 'none');
await b.close();
