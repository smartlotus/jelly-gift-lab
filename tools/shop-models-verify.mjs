// The shop's 3D figurines / fridge magnets must always arrive (2026-11-14 "loads forever" fix).
//   npm run build && node tools/serve.mjs dist 8833 &
//   BASE=http://127.0.0.1:8833 PLAYWRIGHT=<playwright(-core)/index.mjs> node tools/shop-models-verify.mjs
// Android emulation (393×873, DPR 2.75, Android Chrome UA, 4× CPU unless noted):
//  1. fresh load: the first exhibit within 5 s of navigation, every exhibit within 12 s, no error chip
//  2. slow line (800 kbit/s, 300 ms RTT): one-at-a-time first piece, a "…%" progress chip, progress never > 100 %
//  3. a stalled GLB (no bytes) is aborted and retried
//  4. a GLB that fails 3× shows the retry chip; tapping it loads the piece
//  5. stale HTML after a redeploy (the lazy viewer chunk 404s once): the page reloads itself once and the models appear
//  6. WebGL context lost → "paused" chip, nothing throws; restored → models render again
//  7. GLB_BYTES in src/stages/shop/models.ts matches public/models/*.glb
import { readFileSync, statSync, readdirSync, mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright-core');
const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const OUT = process.env.OUT || '/tmp/shop-models'; mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (Linux; Android 13; 22101316C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36';
const IDS = ['figure-pig', 'figure-cat', 'magnet-pig', 'magnet-cat', 'pair', 'pig-fig', 'cat-fig', 'pig-relief', 'cat-relief'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const log = (name, ok, x) => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : '  FAIL'} ${name}${x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400)}`); };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function page({ cpu = 4, kbps = 0, route } = {}) {
  const ctx = await b.newContext({ viewport: { width: 393, height: 873 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, userAgent: UA });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const s = await ctx.newCDPSession(p);
  if (cpu > 1) await s.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  if (kbps) { await s.send('Network.enable'); await s.send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: kbps * 128, uploadThroughput: 64000 }); }
  if (route) await p.route(route.match, route.fn);
  return { ctx, p, errs, s };
}
const state = (p) => p.evaluate((ids) => { const v = window.__shopViewer; const c = document.querySelector('.shop-load');
  return { v: !!v, chip: c && !c.hidden ? c.textContent : '', kind: c?.dataset.kind || '', lost: !!v?.lost, ready: v ? ids.filter((i) => v.ready(i)) : [], failed: v ? ids.filter((i) => v.failed(i)) : [], prog: v ? Math.max(...ids.map((i) => v.progress(i))) : 0 }; }, IDS);
async function until(p, f, ms, every = 250) { const t = Date.now(); let s; while (Date.now() - t < ms) { s = await state(p).catch(() => null); if (s && f(s)) return { s, t: Date.now() - t }; await sleep(every); } return { s, t: -1 }; }

// 7. byte table
{
  const src = readFileSync(new URL('../src/stages/shop/models.ts', import.meta.url), 'utf8');
  const dir = new URL('../public/models/', import.meta.url); const bad = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.glb'))) { const m = src.match(new RegExp(`'${f.slice(0, -4)}': (\\d+)`)); if (!m || +m[1] !== statSync(new URL(f, dir)).size) bad.push(f); }
  log('GLB_BYTES matches public/models/*.glb', bad.length === 0, bad.length ? { bad } : undefined);
}
// 1. fresh load
{
  const { ctx, p, errs } = await page();
  const t0 = Date.now(); await p.goto(`${BASE}/shop/?lang=zh`);
  const first = await until(p, (s) => s.ready.includes('figure-pig'), 15000);
  const all = await until(p, (s) => s.ready.length === IDS.length, 20000);
  log('fresh Android load: first figurine < 5 s after navigation', first.t >= 0 && first.t < 5000, { firstMs: first.t, restMs: all.t, totalMs: Date.now() - t0 });
  log('fresh Android load: all 9 exhibits < 12 s, no error chip, no page errors', all.t >= 0 && all.t < 12000 && !all.s.failed.length && all.s.kind !== 'err' && !errs.length, { allMs: all.t, s: all.s, errs });
  await p.goto(`${BASE}/shop/?lang=zh&at=fridge`); await until(p, (s) => s.ready.includes('magnet-cat'), 8000); await sleep(1200);
  await p.screenshot({ path: `${OUT}/fridge-magnets-android.png` });
  await ctx.close();
}
// 2. slow line
{
  const { ctx, p } = await page({ kbps: 800 });
  await p.goto(`${BASE}/shop/?lang=zh`, { timeout: 60000 });
  let maxP = 0, sawChip = '', t = Date.now(), first = -1;
  while (Date.now() - t < 40000) { const s = await state(p); maxP = Math.max(maxP, s.prog); if (s.kind === 'slow') sawChip = s.chip; if (s.ready.includes('figure-pig')) { first = Date.now() - t; break; } await sleep(300); }
  log('slow line: first figurine arrives (one download at a time first)', first >= 0, { first });
  log('slow line: progress chip with a percentage, progress ≤ 100 %', /\d+%/.test(sawChip) && maxP <= 1, { sawChip, maxP });
  await ctx.close();
}
// 3. stalled GLB
{
  const { ctx, p } = await page();
  await p.goto(`${BASE}/shop/?lang=zh&glbstall=figure-pig&glbstallms=3000`);
  const r = await until(p, (s) => s.ready.includes('figure-pig'), 15000);
  log('stalled GLB is aborted and retried, then loads', r.t >= 0, { ms: r.t, s: r.s });
  await ctx.close();
}
// 4. failing GLB → retry chip → tap → loads
{
  let n = 0;
  const { ctx, p } = await page({ route: { match: /magnet-cat\.glb/, fn: (rt) => (n++ < 3 ? rt.fulfill({ status: 503, body: 'busy' }) : rt.continue()) } });
  await p.goto(`${BASE}/shop/?lang=zh&at=fridge`);
  const e = await until(p, (s) => s.kind === 'err', 20000);
  await p.screenshot({ path: `${OUT}/retry-chip.png` });
  log('a GLB failing 3× shows the retry chip (not an endless spinner)', e.t >= 0 && e.s.failed.includes('magnet-cat'), { s: e.s, n });
  await p.tap('.shop-load').catch(() => p.click('.shop-load'));
  const ok = await until(p, (s) => s.ready.includes('magnet-cat') && !s.chip, 12000);
  log('tapping 重试 loads it and hides the chip', ok.t >= 0, { s: ok.s });
  await ctx.close();
}
// 5. stale HTML: the viewer chunk 404s once
{
  let n = 0;
  const { ctx, p, errs } = await page({ route: { match: /\/assets\/viewer-[^/]+\.js$/, fn: (rt) => (n++ === 0 ? rt.fulfill({ status: 404, body: 'gone' }) : rt.continue()) } });
  await p.goto(`${BASE}/shop/?lang=zh`);
  const r = await until(p, (s) => s.ready.includes('figure-pig'), 20000);
  log('stale lazy chunk (404 once): the page reloads itself once and the models appear', r.t >= 0 && /[?&]r=/.test(p.url()), { url: p.url(), n, ms: r.t, errs });
  await ctx.close();
}
// 6. context loss
{
  const { ctx, p, errs } = await page();
  await p.goto(`${BASE}/shop/?lang=zh&at=pig`); await until(p, (s) => s.ready.includes('figure-pig'), 15000); await sleep(1500);
  const tri0 = await p.evaluate(() => window.__shopViewer.renderer.info.render.triangles);
  await p.evaluate(() => { window.__lc = window.__shopViewer.renderer.getContext().getExtension('WEBGL_lose_context'); window.__lc.loseContext(); });
  const lost = await until(p, (s) => s.lost && /暂停/.test(s.chip), 4000);
  log('WebGL context lost: "paused" chip, nothing throws', lost.t >= 0 && !errs.length, { s: lost.s, errs });
  await p.evaluate(() => window.__lc.restoreContext());
  const back = await until(p, (s) => !s.lost && !s.chip, 6000); await sleep(1500);
  const px = await p.evaluate(() => window.__shopViewer.renderer.info.render.triangles); // last frame's triangles (the canvas itself is not preserved)
  await p.screenshot({ path: `${OUT}/after-context-restore.png` });
  log('WebGL context restored: models render again', back.t >= 0 && px > 1000 && px >= tri0 * 0.5 && !errs.length, { s: back.s, triangles: px, before: tri0, errs });
  await ctx.close();
}
await b.close();
console.log(`shop-models-verify: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
