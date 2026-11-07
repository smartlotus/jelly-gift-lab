// v03j review shots + light flow checks. Playwright is installed in /workspace/jelly/pw.
//   GIO_USE_PROXY_RESOLVER=dummy GSETTINGS_BACKEND=memory node tools/v03j-shots.mjs [base] [outdir]
import { webkit, devices } from 'file:///workspace/jelly/pw/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const base = process.argv[2] || 'http://localhost:8811/';
const out = process.argv[3] || path.resolve('review/v03j');
fs.mkdirSync(out, { recursive: true });

const env = { ...process.env, GIO_USE_PROXY_RESOLVER: 'dummy', GSETTINGS_BACKEND: 'memory', GIO_EXTRA_MODULES: '/opt/wk/usr/lib/x86_64-linux-gnu/gio/modules' };
const browser = await webkit.launch({ env });

const jobs = [
  { name: 'flower-phone', path: 'flower/?lang=zh', size: [390, 844], wait: 900, seek: 820 },
  { name: 'flower-land', path: 'flower/?lang=zh', size: [844, 390], wait: 900, seek: 820 },
  { name: 'flower-end', path: 'flower/?lang=zh&at=end', size: [390, 844], wait: 700 },
  { name: 'mushroom-phone', path: 'mushroom/?lang=zh', size: [390, 844], wait: 900, seek: 780 },
  { name: 'mushroom-land', path: 'mushroom/?lang=zh', size: [844, 390], wait: 900, seek: 780 },
  { name: 'mushroom-end', path: 'mushroom/?lang=zh&at=end', size: [390, 844], wait: 700 },
  { name: 'home-approach', path: 'home/?lang=zh', size: [390, 844], wait: 2200, steps: 90 },
  { name: 'home-found', path: 'home/?lang=zh', size: [390, 844], wait: 900, skipHome: 1 },
  { name: 'home-room-land', path: 'home/?lang=zh&at=room&furnish=1', size: [844, 390], wait: 900 },
  { name: 'home-room-phone', path: 'home/?lang=zh&at=room&furnish=1', size: [390, 844], wait: 900 },
  { name: 'home-transform', path: 'home/?lang=zh&at=transform&furnish=1', size: [844, 390], wait: 700, steps: 90 },
  { name: 'home-walk', path: 'home/?lang=zh&at=walk&furnish=1', size: [844, 390], wait: 700, steps: 80 },
  { name: 'home-greet', path: 'home/?lang=zh&at=greet&furnish=1', size: [844, 390], wait: 700, steps: 90 },
  { name: 'home-sofa', path: 'home/?lang=zh&at=sofa&furnish=1', size: [844, 390], wait: 700, steps: 70 },
  { name: 'home-sleep', path: 'home/?lang=zh&at=sleep&furnish=1', size: [844, 390], wait: 700, steps: 70 },
  { name: 'home-snow', path: 'home/?lang=zh&at=snow&furnish=1', size: [844, 390], wait: 700, steps: 80 },
  { name: 'home-dawn', path: 'home/?lang=zh&at=dawn&furnish=1', size: [844, 390], wait: 700, steps: 20 },
  { name: 'home-finale', path: 'home/?lang=zh&at=finale&furnish=1', size: [844, 390], wait: 900, steps: 80 },
];

let bad = 0;
const report = [];
for (const job of jobs) {
  const [vw, vh] = job.size;
  const ctx = await browser.newContext({ ...devices['iPhone 15'], viewport: { width: vw, height: vh }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('error: ' + m.text()); });
  await page.goto(base + job.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
  for (let i = 0; i < 40; i++) {
    const gone = await page.evaluate(() => { const c = document.getElementById('gift-curtain'); return !c || c.classList.contains('gcc-gone') || c.classList.contains('gcc-out'); });
    if (gone) break;
    await page.waitForTimeout(100);
  }
  if (job.seek) {
    await page.evaluate((x) => { window.__wander?.seek?.(x); window.__steps = 8; }, job.seek);
    await page.waitForTimeout(200);
  }
  if (job.skipHome) {
    await page.evaluate((n) => { for (let i = 0; i < n; i++) window.__home?.skip?.(); }, job.skipHome);
    await page.waitForTimeout(250);
  }
  if (job.steps) {
    await page.evaluate((n) => { window.__pause = true; window.__steps = n; }, job.steps);
    await page.waitForTimeout(Math.min(2500, 16 * job.steps + 80));
  }
  await page.waitForTimeout(job.wait || 600);
  // freeze before capture so seek()'d montage scenes don't roll into the next one
  await page.evaluate(() => { window.__pause = true; window.__steps = 0; });
  const shot = path.join(out, job.name + '.png');
  await page.screenshot({ path: shot });
  const extra = await page.evaluate(() => ({
    wander: window.__wander ? { x: window.__wander.x } : null,
    home: window.__home ? window.__home.phase() : null,
    curtain: document.getElementById('gift-curtain')?.className || '',
  }));
  const fail = errs.filter(e => !/NotAllowedError/.test(e));
  if (fail.length) bad++;
  report.push({ name: job.name, errs: fail, extra });
  console.log(job.name.padEnd(22), fail.length ? fail.join(' | ') : 'OK', JSON.stringify(extra));
  await ctx.close();
}

// room persist check
{
  const ctx = await browser.newContext({ ...devices['iPhone 15'], viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(base + 'home/?lang=zh&at=room&fresh=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const placed = await page.evaluate(() => {
    const chip = document.querySelector('.hm-chip[data-kind="sofa"]');
    chip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const canvas = document.querySelector('#home canvas');
    if (!canvas) return { ok: false, why: 'no canvas' };
    const r = canvas.getBoundingClientRect();
    const ev = (type, x, y) => canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
    ev('pointerdown', r.left + r.width * 0.5, r.top + r.height * 0.62);
    ev('pointerup', r.left + r.width * 0.5, r.top + r.height * 0.62);
    window.__homeRoom?.persist?.();
    const raw = localStorage.getItem('gift.home.layout.v1');
    return { ok: !!raw && raw.includes('sofa'), raw, n: window.__homeRoom?.items()?.length ?? 0 };
  });
  await page.goto(base + 'home/?lang=zh&at=room', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  const again = await page.evaluate(() => window.__homeRoom?.items()?.some(i => i.kind === 'sofa'));
  console.log('room-persist'.padEnd(22), placed, 'reloaded', again, errs);
  if (!placed.ok || !again) bad++;
  await page.screenshot({ path: path.join(out, 'home-room-persist.png') });
  await ctx.close();
}

await browser.close();

function grid(name, files, cols) {
  const list = files.map(f => path.join(out, f)).filter(f => fs.existsSync(f));
  if (!list.length) return;
  const dest = path.join(out, name);
  return new Promise(res => {
    const p = spawn('python3', [path.resolve('tools/v03j-grid.py'), String(cols), dest, ...list], { stdio: 'inherit' });
    p.on('close', code => { console.log('grid', name, code === 0 ? 'OK' : 'skip '+code); res(); });
    p.on('error', () => res());
  });
}
await grid('forests-grid.jpg', ['flower-phone.png', 'flower-land.png', 'flower-end.png', 'mushroom-phone.png', 'mushroom-land.png', 'mushroom-end.png'], 3);
await grid('home-grid.jpg', ['home-approach.png', 'home-found.png', 'home-room-land.png', 'home-room-phone.png', 'home-transform.png', 'home-walk.png'], 3);
await grid('montage-grid.jpg', ['home-walk.png', 'home-greet.png', 'home-sofa.png', 'home-sleep.png', 'home-snow.png', 'home-dawn.png', 'home-finale.png'], 4);
console.log(bad ? `${bad} BAD` : 'ALL OK');
process.exit(bad ? 1 : 0);
