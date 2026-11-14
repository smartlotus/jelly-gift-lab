// 2026-11-14 · jelly gravity sensor: the jelly must follow the phone's tilt in all four screen directions (left, right,
// up = top of the phone pointing down, down), in portrait and in landscape (screen.orientation.angle 90 / 270).
// Simulates DeviceOrientation events (Android Chrome conventions; iOS reports beta/gamma the same way) and tracks the
// jelly's centre on screen through window.__jelly (engine.path.nodes() + engine.project()).
//   BASE=http://127.0.0.1:8833 PLAYWRIGHT=/path/to/playwright-core/index.mjs node tools/jelly-tilt-verify.mjs
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright-core');
const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const OUT = process.env.OUT || '';
let pass = 0, fail = 0;
const log = (n, ok, x) => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : '  FAIL'} ${n}${x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 300)}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

/** beta / gamma (degrees) for a wanted "down" direction in SCREEN coordinates (x right, y up, z out), phone held tilted back */
function bg([sx, sy], angle) {
  const s = [sx, sy, -0.55]; const l = Math.hypot(...s); s[0] /= l; s[1] /= l; s[2] /= l;
  const a = -angle * Math.PI / 180, c = Math.cos(a), si = Math.sin(a); // screen → device (inverse of Tilt.toScreen)
  const d = [s[0] * c - s[1] * si, s[0] * si + s[1] * c, s[2]];
  const beta = Math.asin(Math.max(-1, Math.min(1, -d[1]))), gamma = Math.atan2(d[0], -d[2]);
  return { beta: beta * 180 / Math.PI, gamma: gamma * 180 / Math.PI };
}

for (const mode of [{ name: 'portrait', w: 393, h: 873, angle: 0, type: 'portraitPrimary' }, { name: 'landscape 90', w: 873, h: 393, angle: 90, type: 'landscapePrimary' }, { name: 'landscape 270', w: 873, h: 393, angle: 270, type: 'landscapeSecondary' }]) {
  const ctx = await b.newContext({ viewport: { width: mode.w, height: mode.h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36' });
  await ctx.addInitScript((ang) => { try { Object.defineProperty(screen.orientation, 'angle', { get: () => ang }); } catch { /* */ } }, mode.angle);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${BASE}/jelly/?lang=zh&grav`);
  await p.waitForFunction(() => window.__jellyReady && window.__jelly?.path?.nodes?.(), null, { timeout: 60000 }).catch(() => {});
  await p.waitForFunction(() => /gcc-gone/.test(document.getElementById('gift-curtain')?.className || 'gcc-gone'), null, { timeout: 30000 }).catch(() => {});
  await sleep(1500);
  // the sensor loop: feed a steady stream of orientation events for the wanted direction
  await p.evaluate(() => {
    window.__tiltTo = { beta: 60, gamma: 0 };
    setInterval(() => dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: window.__tiltTo.beta, gamma: window.__tiltTo.gamma })), 33);
  });
  await p.evaluate(() => document.getElementById('grav')?.click());
  await sleep(1200);
  const on = await p.evaluate(() => window.__jelly.sensor.on);
  const centre = () => p.evaluate(() => { const e = window.__jelly, nd = e.path.nodes(); if (!nd) return null; const n = nd.data.length / nd.stride; let x = 0, y = 0, z = 0;
    for (let i = 0; i < n; i++) { x += nd.data[i * nd.stride]; y += nd.data[i * nd.stride + 1]; z += nd.data[i * nd.stride + 2]; }
    const c = [x / n, y / n, z / n]; const s = e.project(c); return { sx: s.x, sy: s.y, wy: c[1] }; });
  const go = async (dir, ms = 3500) => { await p.evaluate((t) => { window.__tiltTo = t; }, bg(dir, mode.angle)); await sleep(ms); return centre(); };
  log(`${mode.name}: gravity switch turns the sensor on`, on);
  const rest = await go([0, -1]);
  const left = await go([-1, -0.25]); const mid = await go([0, -1], 2500);
  const right = await go([1, -0.25]); await go([0, -1], 2500);
  const up = await go([0, 1], 4500);
  if (OUT) await p.screenshot({ path: `${OUT}/jelly-tilt-${mode.name.replace(/\s/g, '')}-up.png` });
  const down = await go([0, -1], 4000);
  const W = mode.w, H = mode.h, sx = (v) => v.sx * (v.sx <= 2 ? W / 2 : 1), sy = (v) => v.sy; // project() is in px
  const dxL = left.sx - rest.sx, dxR = right.sx - mid.sx, dyU = up.sy - rest.sy, dyD = down.sy - up.sy;
  const res = { rest, dxL: Math.round(dxL), dxR: Math.round(dxR), dyU: Math.round(dyU), dyD: Math.round(dyD), upWy: +up.wy.toFixed(3), restWy: +rest.wy.toFixed(3) };
  log(`${mode.name}: tilt left → slides left`, dxL < -0.06 * W, res);
  log(`${mode.name}: tilt right → slides right`, dxR > 0.06 * W, res);
  log(`${mode.name}: top pointing down → slides UP the screen (rests against the top)`, dyU < -0.12 * H && up.wy > rest.wy + 0.05, res);
  log(`${mode.name}: back upright → falls down again`, dyD > 0.12 * H, res);
  log(`${mode.name}: left / right respond alike (neither side under a third of the other)`, Math.min(Math.abs(dxL), Math.abs(dxR)) > Math.max(Math.abs(dxL), Math.abs(dxR)) / 3, res);
  log(`${mode.name}: the jelly stays on screen and nothing throws`, [left, right, up, down].every((v) => v.sx > -20 && v.sx < W + 20 && v.sy > -20 && v.sy < H + 20) && !errs.length, { errs: errs.slice(0, 2) });
  await ctx.close();
}
await b.close();
console.log(`\njelly-tilt-verify: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
