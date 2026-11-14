// 2026-11-14 · jelly page load on an emulated Android phone: slow 4G (1.6 Mbps down, 150 ms RTT) + 4× CPU throttle.
// Cold cache, and "warm" = arriving from the sea-side stage before it (the previous stage had idle time to prefetch).
//   BASE=… RUNS=3 node tools/jelly-load.mjs
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright-core');
const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const RUNS = +(process.env.RUNS || 3), PREV = process.env.PREV || 'night';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(warm) {
  const ctx = await b.newContext({ viewport: { width: 393, height: 873 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36' });
  const p = await ctx.newPage(); const s = await ctx.newCDPSession(p);
  await s.send('Network.enable'); await s.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await s.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  if (warm) { await p.goto(`${BASE}/${PREV}/?lang=zh`); await sleep(+(process.env.DWELL || 12000)); }
  const bytes = {}; let total = 0;
  s.on('Network.loadingFinished', (e) => { total += e.encodedDataLength; });
  s.on('Network.responseReceived', (e) => { const u = e.response.url; const k = /\.js/.test(u) ? 'js' : /\.css/.test(u) ? 'css' : /\.(png|jpe?g|webp|avif|ktx2)/.test(u) ? 'img' : /\.(woff2?|ttf)/.test(u) ? 'font' : /\.(bin|glb|json|dat)/.test(u) ? 'data' : 'other'; bytes[k] = (bytes[k] || 0) + 1; });
  const t0 = Date.now();
  await p.goto(`${BASE}/jelly/?lang=zh${warm ? '&from=night' : ''}`, { waitUntil: 'commit' });
  const marks = {};
  const poll = async () => { for (let i = 0; i < 400; i++) { const m = await p.evaluate(() => ({ fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime, ready: !!window.__jellyReady, curtain: /gcc-out|gcc-gone/.test(document.getElementById('gift-curtain')?.className || ''), frame: !!window.__jelly?.frames || !!document.querySelector('#gl canvas, canvas') })).catch(() => null); const t = Date.now() - t0;
      if (m) { if (m.fcp && !marks.fcp) marks.fcp = Math.round(m.fcp); if (m.ready && !marks.ready) marks.ready = t; if (m.curtain && !marks.curtain) marks.curtain = t; if (marks.ready && marks.curtain) break; } await sleep(100); } };
  await poll();
  await sleep(500);
  const r = { warm, fcpMs: marks.fcp, readyMs: marks.ready, curtainGoneMs: marks.curtain, transferKB: Math.round(total / 1024), requests: bytes };
  await ctx.close(); return r;
}
const out = [];
for (const warm of (process.env.MODES || 'cold,warm').split(',').map((m) => m === 'warm')) for (let i = 0; i < RUNS; i++) { const r = await run(warm); out.push(r); console.log(JSON.stringify(r)); }
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
for (const warm of [false, true]) { const rs = out.filter((r) => r.warm === warm); console.log(`${warm ? 'warm (from ' + PREV + ')' : 'cold'}: median FCP ${med(rs.map((r) => r.fcpMs))} ms · jelly ready ${med(rs.map((r) => r.readyMs))} ms · curtain gone ${med(rs.map((r) => r.curtainGoneMs))} ms · ${med(rs.map((r) => r.transferKB))} KB`); }
if (process.env.JSON) (await import('fs')).writeFileSync(process.env.JSON, JSON.stringify(out, null, 1));
await b.close();
