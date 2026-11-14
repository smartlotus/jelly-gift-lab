// Android-like performance profile of every lab page (Chromium + CDP).
//   npm run build && node tools/serve.mjs dist 8833 &
//   BASE=http://127.0.0.1:8833 PLAYWRIGHT=<playwright(-core)/index.mjs> node tools/android-perf.mjs
// Env: OUT=/dir (JSON + screenshots), TAG=before|after, CPU=4 (throttle), DPR=2.75, STAGES=meadow,shop…, MS=6000 (window)
// Per page, after it settles: rAF frame intervals (p50/p95, >33ms share), main-thread busy share (CDP TaskDuration),
// script / layout / style time, long tasks, canvases (CSS size × buffer), running animations, heavy CSS (backdrop-filter,
// filter, mix-blend-mode, big shadows), JS heap; then the tab is hidden and the main-thread work while hidden is measured.
import { writeFileSync, mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright-core');
const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const OUT = process.env.OUT || '';
const TAG = process.env.TAG || 'run';
const CPU = +(process.env.CPU || 4), DPR = +(process.env.DPR || 2.75), MS = +(process.env.MS || 6000);
const ALL = ['meadow', 'shop', 'night', 'jelly', 'sea', 'sky', 'coop', 'flower', 'mushroom', 'home', 'ar', 'secret'];
const STAGES = process.env.STAGES ? process.env.STAGES.split(',') : ALL;
const PATH = (id) => (id === 'meadow' ? '' : `${id}/`);
const UA = 'Mozilla/5.0 (Linux; Android 13; 22101316C Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (OUT) mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const metric = (m, k) => m.metrics.find((x) => x.name === k)?.value ?? 0;
const results = {};
for (const st of STAGES) {
  const ctx = await b.newContext({ viewport: { width: 393, height: 873 }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, userAgent: UA });
  await ctx.addInitScript(() => {
    window.__lt = []; try { new PerformanceObserver((l) => window.__lt.push(...l.getEntries().map((e) => e.duration))).observe({ type: 'longtask', buffered: true }); } catch {}
  });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const t0 = Date.now();
  await p.goto(`${BASE}/${PATH(st)}?lang=zh`, { waitUntil: 'load', timeout: 120000 }).catch((e) => errors.push('goto ' + e.message));
  const loadMs = Date.now() - t0;
  await sleep(5000);
  const m0 = await cdp.send('Performance.getMetrics');
  await p.evaluate(() => { window.__lt.length = 0; window.__fr = []; let last = performance.now(); const f = (t) => { window.__fr.push(t - last); last = t; if (!window.__stopFr) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await sleep(MS);
  const m1 = await cdp.send('Performance.getMetrics');
  const page = await p.evaluate(() => {
    window.__stopFr = true;
    const fr = window.__fr.slice(2).sort((a, b) => a - b); const q = (x) => +(fr[Math.min(fr.length - 1, Math.floor(fr.length * x))] || 0).toFixed(1);
    const canv = [...document.querySelectorAll('canvas')].map((c) => { const r = c.getBoundingClientRect(); const vis = r.width > 0 && r.height > 0 && getComputedStyle(c).display !== 'none'; return { css: `${Math.round(r.width)}x${Math.round(r.height)}`, buf: `${c.width}x${c.height}`, mpx: +(c.width * c.height / 1e6).toFixed(2), vis }; }).filter((c) => c.vis && c.mpx > 0.01);
    let backdrop = 0, filter = 0, blend = 0, shadow = 0;
    for (const e of document.querySelectorAll('body *')) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue; if ((cs.backdropFilter || cs.webkitBackdropFilter || 'none') !== 'none') backdrop++; if (cs.filter !== 'none') filter++; if (cs.mixBlendMode !== 'normal') blend++; if (/\d{2,}px/.test(cs.boxShadow)) shadow++; }
    return { frames: fr.length, p50: q(0.5), p95: q(0.95), slow: +(fr.filter((x) => x > 33.4).length / Math.max(1, fr.length)).toFixed(2), longTasks: window.__lt.length, longMs: Math.round(window.__lt.reduce((a, b) => a + b, 0)), canvases: canv, canvasMpx: +canv.reduce((a, c) => a + c.mpx, 0).toFixed(2), anims: document.getAnimations().filter((a) => a.playState === 'running').length, backdrop, filter, blend, shadow, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, tier: document.documentElement.dataset.perf || null };
  });
  const sec = MS / 1000;
  const busy = (k) => +((metric(m1, k) - metric(m0, k)) / sec).toFixed(3);
  const r = { loadMs, ...page, busy: busy('TaskDuration'), script: busy('ScriptDuration'), layout: busy('LayoutDuration'), style: busy('RecalcStyleDuration'), layouts: Math.round((metric(m1, 'LayoutCount') - metric(m0, 'LayoutCount')) / sec), styles: Math.round((metric(m1, 'RecalcStyleCount') - metric(m0, 'RecalcStyleCount')) / sec), errors };
  if (OUT) await p.screenshot({ path: `${OUT}/${TAG}-${st}.png` }).catch(() => {});
  // Hidden tab: open another page on top; measure the hidden page's main-thread work.
  const other = await ctx.newPage(); await other.goto('about:blank'); await other.bringToFront(); await sleep(800);
  const h0 = await cdp.send('Performance.getMetrics'); const vis = await p.evaluate(() => document.visibilityState); await sleep(3000); const h1 = await cdp.send('Performance.getMetrics');
  r.hidden = { state: vis, busy: +((metric(h1, 'TaskDuration') - metric(h0, 'TaskDuration')) / 3).toFixed(3) };
  results[st] = r;
  console.log(`${st.padEnd(9)} load ${String(loadMs).padStart(5)}ms  frame p50 ${r.p50} p95 ${r.p95} slow ${r.slow}  busy ${r.busy} (js ${r.script} layout ${r.layout} style ${r.style})  long ${r.longTasks}/${r.longMs}ms  canvas ${r.canvasMpx}Mpx ${r.canvases.map((c) => c.buf).join(',')}  anims ${r.anims}  css bd${r.backdrop} f${r.filter} bl${r.blend} sh${r.shadow}  heap ${r.heapMB}MB  hidden ${r.hidden.state} ${r.hidden.busy}  tier ${r.tier}${errors.length ? '  ERR ' + errors.join(' | ').slice(0, 200) : ''}`);
  await ctx.close();
}
if (OUT) writeFileSync(`${OUT}/${TAG}.json`, JSON.stringify({ when: new Date().toISOString(), CPU, DPR, MS, results }, null, 1));
await b.close();
