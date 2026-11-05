// extra v03f frames: each puzzle up close, a found note, the resume card, Chinese UI, console errors fail
import { webkit, devices } from 'playwright';
const base = process.argv[2] || 'http://localhost:8811/', out = process.argv[3] || '/workspace/jelly/shots/v03f/extra';
import fs from 'fs'; fs.mkdirSync(out, { recursive: true });
const b = await webkit.launch({ env: { ...process.env, GIO_EXTRA_MODULES: '/opt/wk/usr/lib/x86_64-linux-gnu/gio/modules', GIO_USE_PROXY_RESOLVER: 'dummy', GSETTINGS_BACKEND: 'memory' } });
const ctx = await b.newContext({ ...devices['iPhone 15'] }); const errs = [];
const W = ms => new Promise(r => setTimeout(r, ms));
async function page(url, pre) {
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(url + ' ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(url + ' ' + m.text()));
  if (pre) await p.addInitScript(pre); await p.goto(base + url, { waitUntil: 'commit' }); await W(5000); return p;
}
const seed = (s, lang) => `localStorage.setItem('gift.night.v3', ${JSON.stringify(JSON.stringify(s))});${lang ? `localStorage.setItem('jelly.lang','${lang}');` : ''}`;
const S0 = { v: 3, node: 'S', notes: [false, false, false], candle: false, stickers: [], solved: ['mush', 'trail'], scares: ['cup'], edges: [], nodes: ['S', 'F'], endings: [] };
// music box (H2), candles (E2), code lock at the gate with two notes
let p = await page('night/?at=H2&skip=1', seed(S0)); await W(1500); await p.screenshot({ path: `${out}/pz-music.png` }); await p.close();
p = await page('night/?at=E2&skip=1', seed(S0)); await W(1000); await p.click('.pz-c[data-i="0"]'); await W(400); await p.screenshot({ path: `${out}/pz-candles.png` }); await p.close();
p = await page('night/?at=G&skip=1', seed({ ...S0, notes: [true, false, true], candle: true })); 
await p.evaluate(() => [...document.querySelectorAll('.nv-c')].find(x => x.dataset.k.startsWith('gg:1')).click()); await p.mouse.move(195, 420); await p.mouse.down(); await W(3500); await p.mouse.up(); await W(800);
await p.screenshot({ path: `${out}/pz-code.png` }); await p.close();
// grate (World Butt Day) inside the tunnel
p = await page('night/?at=E3&skip=1', seed({ ...S0, candle: true })); await p.evaluate(() => [...document.querySelectorAll('.nv-c')].find(x => x.dataset.k.startsWith('tun:1')).click());
await p.mouse.move(195, 420); await p.mouse.down(); for (let i = 0; i < 30; i++) { await W(500); if (await p.$('.pz-gate')) break; } await p.mouse.up(); await W(800); await p.screenshot({ path: `${out}/pz-grate.png` }); await p.close();
// resume card + Chinese
p = await page('night/', seed({ ...S0, node: 'W2', nodes: ['S', 'F', 'W1', 'W2'], edges: ['fw', 'w12'], notes: [true, false, false], stickers: ['st1'] }, 'zh')); await W(1800); await p.screenshot({ path: `${out}/resume-zh.png` });
await W(4000); await p.screenshot({ path: `${out}/w2-zh.png` }); await p.close();
console.log(errs.length ? errs.join('\n') : 'NO ERRORS'); await b.close();
