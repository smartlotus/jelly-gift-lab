// Self-check harness: headless Chrome (SwiftShader WebGPU + WebGL2), console capture, interactions, screenshots.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=') || '1']; }));
const W = +(args.w || 1440), H = +(args.h || 900), dpr = +(args.dpr || 1);
const url = `http://localhost:${args.port || 8800}/${args.q ? '?' + args.q : ''}`;
const out = args.out || '/tmp/shot';
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${W},${H}`],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: dpr, isMobile: !!args.mobile, hasTouch: !!args.mobile });
if (args.mobile) await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1');
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', r => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__jellyReady || !document.getElementById('fail').hidden, { timeout: 180000 });
const ready = await page.evaluate(() => window.__jellyReady);
console.log('ready', JSON.stringify(ready), 'after', Date.now() - t0, 'ms');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stat = async () => page.evaluate(() => { const e = window.__jelly; return e ? { fps: +e.fps.toFixed(1), simHz: +e.simHz.toFixed(1), raf: +e.rafFps.toFixed(1), backend: e.path.kind, frameMs: +e.frameMs.toFixed(2), simMs: +e.path.simMs().toFixed(2), substeps: e.path.substeps, simTime: +e.simTime.toFixed(2), ro: e.readouts } : null; });
await sleep(+(args.wait || 4000));
let n = 0;
const snap = async (tag) => { const f = `${out}-${String(n++).padStart(2, '0')}-${tag}.png`; await page.evaluate(() => window.__jelly?.debugCapture()); await page.screenshot({ path: f }); await page.evaluate(() => window.__jelly?.debugCapture(false)); console.log('shot', f, JSON.stringify(await stat())); };
await snap('initial');
const steps = (args.steps || '').split(',').filter(Boolean);
const proj = async (x, y, z) => page.evaluate((x, y, z) => { const e = window.__jelly; const m = e.vp; const r = e.canvas.getBoundingClientRect();
  const cx = m[0]*x+m[4]*y+m[8]*z+m[12], cy = m[1]*x+m[5]*y+m[9]*z+m[13], cw = m[3]*x+m[7]*y+m[11]*z+m[15];
  return [r.left + (cx/cw*0.5+0.5)*r.width, r.top + (1-(cy/cw*0.5+0.5))*r.height]; }, x, y, z);
for (const s of steps) {
  if (s === 'drag') {
    const [px, py] = await proj(0.06, 0.37, 0); // dorsal fin
    await page.mouse.move(px, py); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(px - i * 9, py - i * 5); await sleep(120); }
    await sleep(900); await snap('drag-hold');
    await page.mouse.up(); await sleep(400); await snap('drag-release');
  } else if (s === 'draghead') {
    const [px, py] = await proj(0.48, 0.05, 0.19);
    await page.mouse.move(px, py); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(px + i * 10, py + i * 2); await sleep(120); }
    await sleep(900); await snap('draghead-hold');
    await page.mouse.up(); await sleep(400);
  } else if (s === 'twist') {
    const [px, py] = await proj(-0.3, 0.09, 0.0);
    await page.mouse.move(px, py);
    for (let i = 0; i < 14; i++) { await page.mouse.wheel({ deltaY: 60 }); await sleep(60); }
    await sleep(500); await snap('twist');
    await sleep(1500); await snap('twist-relax');
  } else if (s === 'bait') {
    for (let i = 0; i < 6; i++) { await page.click('#bait'); await sleep(250); }
    await sleep(2500); await snap('bait');
  } else if (s.startsWith('colour')) {
    const id = s.split(':')[1];
    await page.click(`.cw[data-id="${id}"]`); await sleep(1600); await snap('colour-' + id);
  } else if (s.startsWith('wait')) { await sleep(+s.split(':')[1]); await snap('wait'); }
  else if (s === 'touchtwist') {
    const [px, py] = await proj(-0.2, 0.1, 0.0);
    const cdp = await page.target().createCDPSession();
    const tp = (pts) => pts.map((p, i) => ({ x: p[0], y: p[1], id: i }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp([[px, py]]) }); await sleep(150);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp([[px, py], [px + 80, py]]) }); await sleep(150);
    for (let i = 1; i <= 10; i++) { const a = i * 0.1; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp([[px, py], [px + 80 * Math.cos(a), py + 80 * Math.sin(a)]]) }); await sleep(100); }
    await sleep(600); await snap('touchtwist');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300);
  } else if (s === 'fps') {
    await sleep(3000); console.log('fps', JSON.stringify(await stat()));
  }
}
fs.writeFileSync(`${out}-console.txt`, logs.join('\n'));
console.log('console lines', logs.length); for (const l of logs.slice(0, 40)) console.log('  ', l.slice(0, 400));
await browser.close();
