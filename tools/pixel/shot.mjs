// Quick deterministic screenshots of stage 1 (headless Chrome, frozen loop + stepped frames).
//   node tools/serve.mjs dist 8811 &   then   node tools/pixel/shot.mjs [outDir]
// Each shot: url query, viewport, keys to hold, number of 60 Hz steps to advance.
import puppeteer from 'puppeteer-core';
const out = process.argv[2] || 'review/stage1-meadow';
const base = 'http://localhost:8811/';
const shots = [
  { name: 'start-desktop', q: '?skip&lang=zh', vp: { width: 1280, height: 720 }, steps: [[90, []], [70, ['ArrowRight']]] },
  { name: 'fountain-desktop', q: '?skip&lang=zh&at=fountain', vp: { width: 1280, height: 720 }, steps: [[70, []], [50, ['ArrowRight']], [170, []]] },
  { name: 'lake-portrait', q: '?skip&lang=en&at=lake', vp: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, steps: [[90, []], [24, ['ArrowRight']]] },
];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const s of shots) {
  const page = await browser.newPage(); await page.setViewport(s.vp);
  await page.evaluateOnNewDocument(() => { window.__pause = true; });
  await page.goto(base + s.q, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  for (const [n, keys] of s.steps) {
    for (const k of keys) await page.keyboard.down(k);
    await page.evaluate(n => { window.__steps = n; }, n);
    await page.waitForFunction(() => !window.__steps, { timeout: 60000, polling: 50 });
    for (const k of keys) await page.keyboard.up(k);
  }
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: `${out}/${s.name}.png` }); console.log(`${out}/${s.name}.png`);
  await page.close();
}
await browser.close();
