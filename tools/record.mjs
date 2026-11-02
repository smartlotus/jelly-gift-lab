// Records a lockstep (60 Hz simulated) clip of the real renderer: one screenshot every `every` sim steps.
// Usage: node tools/record.mjs out=/tmp/rec w=960 h=600 q=lo every=2
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=') || '1']; }));
const W = +(args.w || 960), H = +(args.h || 600), every = +(args.every || 2);
const out = args.out || '/tmp/rec'; fs.mkdirSync(out, { recursive: true });
const qs = ['lockstep=1', args.q ? 'q=' + args.q : '', args.backend ? 'backend=' + args.backend : ''].filter(Boolean).join('&');
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 900000,
  args: ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${W},${H}`] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const logs = []; page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
await page.goto(`http://localhost:8800/?${qs}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__jellyReady, { timeout: 180000 });
const steps = () => page.evaluate(() => window.__jelly.path.simSteps);
const waitSteps = async n => { const t = (await steps()) + n; await page.waitForFunction(t => window.__jelly.path.simSteps >= t, { timeout: 600000, polling: 30 }, t); };
let f = 0;
const shot = async () => { await page.evaluate(() => window.__jelly.debugFreeze(true)); await page.screenshot({ path: `${out}/f${String(f++).padStart(4, '0')}.png` }); await page.evaluate(() => window.__jelly.debugFreeze(false)); };
const run = async (frames, perFrame) => { for (let i = 0; i < frames; i++) { if (perFrame) await perFrame(i); await waitSteps(every); await shot(); } };
const proj = (x, y, z) => page.evaluate((x, y, z) => { const e = window.__jelly; const m = e.vp; const r = e.canvas.getBoundingClientRect();
  const cx = m[0]*x+m[4]*y+m[8]*z+m[12], cy = m[1]*x+m[5]*y+m[9]*z+m[13], cw = m[3]*x+m[7]*y+m[11]*z+m[15];
  return [r.left + (cx/cw*0.5+0.5)*r.width, r.top + (1-(cy/cw*0.5+0.5))*r.height]; }, x0, y0, z0);
await waitSteps(30);
await run(40);                                                     // idle: head sweep + tail swish
const [px, py] = await proj(0.06, 0.37, 0);                        // grab the first dorsal and stretch
await page.mouse.move(px, py); await page.mouse.down(); console.log('pointer mode:', await page.evaluate(() => window.__jelly.mode));
await run(24, async i => page.mouse.move(px - (i + 1) * 7, py - (i + 1) * 5));
await run(10); await page.mouse.up(); await run(30);               // release and wobble
const [tx, ty] = await proj(-0.3, 0.09, 0); await page.mouse.move(tx, ty);
await run(16, async () => page.mouse.wheel({ deltaY: 70 })); await run(30);   // twist the tail
await run(18, async i => { if (i % 3 === 0) await page.click('#bait'); });  // bait
await run(24);
await page.click('.cw[data-id="amber"]'); await run(30);
await page.click('.cw[data-id="gummy"]'); await run(30);
fs.writeFileSync(`${out}/console.txt`, logs.join('\n'));
console.log('frames', f, 'console', logs.length); for (const l of logs.slice(0, 20)) console.log(' ', l.slice(0, 300));
await browser.close();
