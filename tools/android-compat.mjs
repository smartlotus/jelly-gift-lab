// Android / WeChat (X5 · XWeb) compatibility checks for every lab page (Chromium emulation).
//   npm run build && node tools/serve.mjs dist 8833 &
//   BASE=http://127.0.0.1:8833 PLAYWRIGHT=<playwright(-core)/index.mjs> node tools/android-compat.mjs
// 1. "Old X5": WeChat UA, no WebGL2 (getContext('webgl2') → null), no WebGPU, no Fullscreen API — every page still loads
//    without uncaught errors and its dock 跳过 still leads on (the canvas stage may show its own fallback).
// 2. Mid-range Android Chrome (DPR 2.75, 4× CPU): <html data-perf="mid">, big canvases ≤ 1.5× CSS size, the 60 fps gate.
// 3. Keyboard: on night's number lock a viewport shrink while the input is focused does not start the rotation veil.
// 4. Hidden tab: the shared AudioContext is suspended after the page is hidden, resumed when shown.
// 5. Safe area + gesture bar (bottom inset 24px): dock and chrome inside it.
// 6. Chinese font stack ends in an Android CJK serif before the generic family.
// 7. Audio unlock: a touch tap (pointerdown → touchend) leaves the AudioContext 'running'.
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright-core');
const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const ALL = ['meadow', 'shop', 'night', 'jelly', 'sea', 'sky', 'coop', 'flower', 'mushroom', 'home'];
const NEXT = { meadow: 'shop', shop: 'night', night: 'jelly', jelly: 'sea', sea: 'sky', sky: 'coop', coop: 'flower', flower: 'mushroom', mushroom: 'home' };
const PATH = (id) => (id === 'meadow' ? '' : `${id}/`);
const X5 = 'Mozilla/5.0 (Linux; Android 10; V2036A Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/89.0.4389.72 MQQBrowser/6.2 TBS/046011 Mobile Safari/537.36 MicroMessenger/8.0.30.2260(0x28001E3B) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64';
const CHROME = 'Mozilla/5.0 (Linux; Android 13; 22101316C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const log = (name, ok, x) => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : '  FAIL'} ${name}${ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400)}`); };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctxOf = (ua, extra = {}) => b.newContext({ viewport: { width: 393, height: 873 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, userAgent: ua, ...extra });
const stageOf = (url) => { const m = new URL(url).pathname.replace(/\/index\.html$/, '/').match(/\/([a-z]+)\/$/); return m ? m[1] : 'meadow'; };
console.log('android-compat', BASE);

// 1. old X5: no WebGL2 / WebGPU / Fullscreen
{
  const ctx = await ctxOf(X5);
  await ctx.addInitScript(() => {
    const g = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (k, o) { return k === 'webgl2' || k === 'webgpu' ? null : g.call(this, k, o); };
    try { delete Navigator.prototype.gpu; } catch {} Object.defineProperty(navigator, 'gpu', { get: () => undefined });
    for (const k of ['requestFullscreen', 'webkitRequestFullscreen']) try { delete Element.prototype[k]; } catch {}
    try { Object.defineProperty(document, 'fullscreenEnabled', { get: () => false }); } catch {}
  });
  for (const st of ALL) {
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`${BASE}/${PATH(st)}?lang=zh`, { waitUntil: 'load' }).catch((e) => errs.push(String(e)));
    const dock = await p.waitForSelector(`.gs-dock[data-stage="${st}"]`, { timeout: 20000 }).then(() => true, () => false);
    await sleep(2500);
    let moved = true;
    if (NEXT[st]) {
      const skip = p.locator('.gs-dock [data-gs="skip"], .gs-dock .gs-skip').first();
      const has = await skip.count();
      // a stage that cannot run at all (jelly needs WebGL2 or WebGPU) shows the curtain's own 跳过 link instead of the dock
      const failed = await p.evaluate(() => document.getElementById('gift-curtain')?.classList.contains('gcc-fail'));
      if (failed) { await p.click('#gift-curtain .gcc-skip', { timeout: 5000 }).catch(() => {}); moved = await p.waitForURL((u) => stageOf(u.toString()) === NEXT[st], { timeout: 20000 }).then(() => true, () => false); }
      else if (has) { await skip.click({ timeout: 5000, force: true }).catch(() => {}); moved = await p.waitForURL((u) => stageOf(u.toString()) === NEXT[st], { timeout: 20000 }).then(() => true, () => false); }
      else moved = false;
    }
    log(`no WebGL2 (old X5) ${st}: loads, dock, 跳过 → ${NEXT[st] || '-'}`, dock && moved && errs.length === 0, { dock, moved, errs });
    await p.close();
  }
  await ctx.close();
}
// 2. tier + canvas caps on mid-range Android Chrome
{
  const ctx = await ctxOf(CHROME);
  for (const st of ['shop', 'jelly', 'sky', 'night', 'home']) {
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`${BASE}/${PATH(st)}?lang=zh&perf=mid`, { waitUntil: 'load' });
    await sleep(5000);
    const r = await p.evaluate(() => ({ tier: document.documentElement.dataset.perf, canv: [...document.querySelectorAll('canvas')].map((c) => { const b = c.getBoundingClientRect(); return { k: b.width > 0 ? c.width / b.width : 0, w: c.width, cw: Math.round(b.width) }; }).filter((c) => c.cw > 200) }));
    log(`mid tier ${st}: data-perf=mid, full-screen canvases ≤ 1.5× CSS px`, r.tier === 'mid' && r.canv.length > 0 && r.canv.every((c) => c.k <= 1.51), r);
    await p.close();
  }
  // default tier on Android without ?perf: mid (or low after a slow-frame downgrade), never high
  const p = await ctx.newPage(); await p.goto(`${BASE}/coop/?lang=zh&perf=auto`); await sleep(1500);
  const t = await p.evaluate(() => [document.documentElement.dataset.perf, window.__perf.reason()]);
  log('Android UA defaults to a reduced tier', t[0] === 'mid' || t[0] === 'low', t);
  await p.close();
  // desktop / iPhone UA stays high
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  const p2 = await ctx2.newPage(); await p2.goto(`${BASE}/coop/?lang=zh`); await sleep(1000);
  log('iPhone UA keeps the high tier (unchanged visuals)', (await p2.evaluate(() => document.documentElement.dataset.perf)) === 'high');
  await ctx2.close();
  // 60 fps gate: a 120 Hz rAF (8.33 ms) draws ~60 times a second on mid, every frame on high
  const p3 = await ctx.newPage(); await p3.goto(`${BASE}/coop/?lang=zh&perf=mid`); await sleep(800);
  const g = await p3.evaluate(() => { const run = () => { const f = window.__perf.gate(); let n = 0; for (let i = 0; i < 120; i++) if (f(i * 8.333)) n++; return n; }; const mid = run(); window.__perf.set('high'); const high = run(); return { mid, high }; });
  log('60 fps gate: 120 Hz rAF → ~60 draws/s on mid, 120 on high', g.mid >= 55 && g.mid <= 62 && g.high === 120, g);
  await p3.close();
  await ctx.close();
}
// 3. keyboard does not start the rotation veil
{
  const ctx = await ctxOf(CHROME);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/night/?lang=zh`); await sleep(3000);
  const r = await p.evaluate(async () => {
    const i = document.createElement('input'); i.inputMode = 'numeric'; document.body.appendChild(i); i.focus();
    const before = window.__orient.runs(); return before;
  });
  // a soft keyboard shrinks the layout viewport but not the screen (setViewportSize would also rotate the emulated screen)
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 393, height: 380, deviceScaleFactor: 2.75, mobile: true, screenWidth: 393, screenHeight: 873, screenOrientation: { type: 'portraitPrimary', angle: 0 } });
  await p.evaluate(() => dispatchEvent(new Event('resize'))); await sleep(1500);
  const after = await p.evaluate(() => window.__orient.runs());
  log('keyboard (viewport shrinks while typing) does not trigger the rotation veil', after === r, { before: r, after });
  await p.close(); await ctx.close();
}
// 4. hidden tab suspends audio; 7. touch unlock leaves it running
{
  const ctx = await ctxOf(CHROME);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/coop/?lang=zh&sound=1`); await sleep(2500);
  await p.touchscreen.tap(200, 450); await sleep(600);
  const st0 = await p.evaluate(() => window.__audioState?.() ?? null);
  log('touch tap unlocks audio (AudioContext running)', st0 === 'running', st0);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(1200);
  const st1 = await p.evaluate(() => window.__audioState?.() ?? null);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(800);
  const st2 = await p.evaluate(() => window.__audioState?.() ?? null);
  log('hidden tab suspends the AudioContext and resumes it on return', st1 === 'suspended' && st2 === 'running', [st1, st2]);
  await p.close(); await ctx.close();
}
// 5. gesture-bar / notch safe areas
{
  const ctx = await ctxOf(CHROME);
  for (const st of ['meadow', 'jelly', 'sea', 'home']) {
    const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 32, bottom: 24, left: 0, right: 0 } }).catch(() => {});
    await p.goto(`${BASE}/${PATH(st)}?lang=zh`); await p.waitForSelector('.gs-dock', { timeout: 20000 }).catch(() => {}); await sleep(3000);
    const r = await p.evaluate(() => [...document.querySelectorAll('.gs-dock button, .gift-chrome button')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => { const b = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 6), top: Math.round(b.top), bot: Math.round(innerHeight - b.bottom) }; }));
    log(`safe area (notch 32 / gesture bar 24) ${st}: dock + chrome inside`, r.length > 0 && r.every((x) => x.top >= 32 && x.bot >= 24), r);
    await p.close();
  }
  await ctx.close();
}
// 6. CJK font stack
{
  const ctx = await ctxOf(CHROME); const p = await ctx.newPage(); await p.goto(`${BASE}/coop/?lang=zh`); await sleep(1000);
  const ff = await p.evaluate(() => getComputedStyle(document.body).fontFamily);
  log('Chinese font stack carries Android CJK serifs', /Noto Serif CJK SC/.test(ff) && /Source Han Serif SC/.test(ff), ff);
  await ctx.close();
}
await b.close();
console.log(`android-compat: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
