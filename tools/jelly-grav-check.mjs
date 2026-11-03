// Headless sanity for the /jelly/ gravity sensor (WebGL2/CPU path): synthetic tilt + shake events; checks the jelly
// slides toward the tilt, stays inside the walls, never goes NaN, then settles. node tools/jelly-grav-check.mjs [base] [shot.png]
import puppeteer from 'puppeteer-core';
const [base = 'http://localhost:8811/', shot] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await p.goto(`${base}jelly/?backend=webgl2&grav&lang=zh`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__jellyReady, { timeout: 60000 });
const wait = ms => new Promise(r => setTimeout(r, ms));
const centre = () => p.evaluate(() => { const n = window.__jelly.path.nodes(); if (!n) return null; let x = 0, y = 0, z = 0, k = 0, bad = 0; for (let i = 0; i < n.data.length; i += n.stride) { const a = n.data[i], b = n.data[i + 1], c = n.data[i + 2]; if (!isFinite(a + b + c)) bad++; x += a; y += b; z += c; k++; } return { x: +(x / k).toFixed(3), y: +(y / k).toFixed(3), z: +(z / k).toFixed(3), bad, box: Array.from(window.__jelly.box).map(v => +v.toFixed(3)) }; });
await wait(2500); const c0 = await centre();
await p.$eval('#grav', e => e.click()); await wait(300);
const pressed = await p.$eval('#grav', e => e.getAttribute('aria-pressed'));
const tilt = (beta, gamma) => p.evaluate((b, g) => dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: b, gamma: g, alpha: 0 })), beta, gamma);
const motion = (x, y, z) => p.evaluate((x, y, z) => dispatchEvent(new DeviceMotionEvent('devicemotion', { acceleration: { x, y, z }, accelerationIncludingGravity: { x, y, z: z - 9.8 }, interval: 16 })), x, y, z);
for (let i = 0; i < 40; i++) { await tilt(50, 45); await wait(60); } const cR = await centre();          // tilt right edge down
for (let i = 0; i < 40; i++) { await tilt(50, -45); await wait(60); } const cL = await centre();         // tilt left
for (let i = 0; i < 30; i++) { await tilt(50, 0); await motion(i % 2 ? 25 : -25, i % 3 ? 12 : -12, 0); await wait(40); } const cS = await centre(); // hard shake
for (let i = 0; i < 40; i++) { await tilt(50, 0); await motion(0, 0, 0); await wait(60); } const cE = await centre();
console.log(JSON.stringify({ pressed, c0, cR, cL, cS, cE }), errs.length ? errs : 'no console errors');
if (shot) await p.screenshot({ path: shot });
await b.close();
