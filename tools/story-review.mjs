// Story-edition review: WebKit screenshots + WebKit/Chromium behavioural tests.
//   GIO_USE_PROXY_RESOLVER=dummy GSETTINGS_BACKEND=memory node tools/story-review.mjs [base] [outdir]
import { webkit, chromium, devices } from 'file:///workspace/jelly/pw/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const base = process.argv[2] || 'http://localhost:8822/';
const out = process.argv[3] || path.resolve('review/story');
fs.mkdirSync(out, { recursive: true });

const wkEnv = {
  ...process.env,
  GIO_USE_PROXY_RESOLVER: 'dummy',
  GSETTINGS_BACKEND: 'memory',
  GIO_EXTRA_MODULES: '/opt/wk/usr/lib/x86_64-linux-gnu/gio/modules',
};

const STAGES = [
  { id: 'meadow', path: '?lang=zh' },
  { id: 'flower', path: 'flower/?lang=zh' },
  { id: 'mushroom', path: 'mushroom/?lang=zh' },
  { id: 'shop', path: 'shop/?lang=zh' },
  { id: 'ar', path: 'ar/?lang=zh' },
  { id: 'night', path: 'night/?lang=zh' },
  { id: 'jelly', path: 'jelly/?lang=zh' },
  { id: 'sea', path: 'sea/?lang=zh' },
  { id: 'sky', path: 'sky/?lang=zh' },
  { id: 'coop', path: 'coop/?lang=zh' },
  { id: 'home', path: 'home/?lang=zh' },
];

const shots = [
  { name: 'flower-phone', path: 'flower/?lang=zh', size: [390, 844], wait: 900, seek: 820 },
  { name: 'flower-430', path: 'flower/?lang=zh', size: [430, 932], wait: 900, seek: 820 },
  { name: 'flower-land', path: 'flower/?lang=zh', size: [844, 390], wait: 900, seek: 820 },
  { name: 'flower-end', path: 'flower/?lang=zh&at=end', size: [390, 844], wait: 800 },
  { name: 'flower-whisper', path: 'flower/?lang=zh', size: [390, 844], wait: 1800 },
  { name: 'mushroom-phone', path: 'mushroom/?lang=zh', size: [390, 844], wait: 900, seek: 780 },
  { name: 'mushroom-430', path: 'mushroom/?lang=zh', size: [430, 932], wait: 900, seek: 780 },
  { name: 'mushroom-land', path: 'mushroom/?lang=zh', size: [844, 390], wait: 900, seek: 780 },
  { name: 'mushroom-end', path: 'mushroom/?lang=zh&at=end', size: [390, 844], wait: 800 },
  { name: 'home-approach', path: 'home/?lang=zh', size: [390, 844], wait: 2200, steps: 90 },
  { name: 'home-approach-430', path: 'home/?lang=zh', size: [430, 932], wait: 2200, steps: 90 },
  { name: 'home-approach-land', path: 'home/?lang=zh', size: [844, 390], wait: 1800, steps: 80 },
  { name: 'home-found', path: 'home/?lang=zh', size: [390, 844], wait: 900, skipHome: 1 },
  { name: 'home-room-land', path: 'home/?lang=zh&at=room&furnish=1', size: [844, 390], wait: 900 },
  { name: 'home-room-phone', path: 'home/?lang=zh&at=room&furnish=1', size: [390, 844], wait: 900 },
  { name: 'home-room-430', path: 'home/?lang=zh&at=room&furnish=1', size: [430, 932], wait: 900 },
  { name: 'home-transform', path: 'home/?lang=zh&at=transform&furnish=1', size: [844, 390], wait: 700, steps: 90 },
  { name: 'home-walk', path: 'home/?lang=zh&at=walk&furnish=1', size: [844, 390], wait: 700, steps: 90 },
  { name: 'home-walk-phone', path: 'home/?lang=zh&at=walk&furnish=1', size: [390, 844], wait: 700, steps: 90 },
  { name: 'home-greet', path: 'home/?lang=zh&at=greet&furnish=1', size: [844, 390], wait: 700, steps: 100 },
  { name: 'home-greet-phone', path: 'home/?lang=zh&at=greet&furnish=1', size: [390, 844], wait: 700, steps: 100 },
  { name: 'home-sofa', path: 'home/?lang=zh&at=sofa&furnish=1', size: [844, 390], wait: 700, steps: 80 },
  { name: 'home-sofa-phone', path: 'home/?lang=zh&at=sofa&furnish=1', size: [390, 844], wait: 700, steps: 80 },
  { name: 'home-sleep', path: 'home/?lang=zh&at=sleep&furnish=1', size: [844, 390], wait: 700, steps: 80 },
  { name: 'home-sleep-phone', path: 'home/?lang=zh&at=sleep&furnish=1', size: [390, 844], wait: 700, steps: 80 },
  { name: 'home-snow', path: 'home/?lang=zh&at=snow&furnish=1', size: [844, 390], wait: 700, steps: 90 },
  { name: 'home-dawn', path: 'home/?lang=zh&at=dawn&furnish=1', size: [844, 390], wait: 700, steps: 30 },
  { name: 'home-dawn-phone', path: 'home/?lang=zh&at=dawn&furnish=1', size: [390, 844], wait: 700, steps: 30 },
  { name: 'home-finale', path: 'home/?lang=zh&at=finale&furnish=1', size: [844, 390], wait: 1000, steps: 90 },
];

function collectPage(page) {
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error') errs.push('error: ' + m.text());
  });
  return errs;
}

function realErrs(errs) {
  return errs.filter(e =>
    !/favicon|Failed to load resource.*404/i.test(e) &&
    !/ResizeObserver loop/i.test(e)
  );
}

async function waitCurtain(page) {
  for (let i = 0; i < 50; i++) {
    const gone = await page.evaluate(() => {
      const c = document.getElementById('gift-curtain');
      return !c || c.classList.contains('gcc-gone') || c.classList.contains('gcc-out');
    });
    if (gone) return;
    await page.waitForTimeout(100);
  }
}

async function phoneCtx(browser, vw, vh, extra = {}) {
  return browser.newContext({
    ...devices['iPhone 15'],
    viewport: { width: vw, height: vh },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    ignoreHTTPSErrors: true,
    locale: 'zh-CN',
    ...extra,
  });
}

const results = [];
let bad = 0;
function note(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) bad++;
  console.log((ok ? 'OK  ' : 'BAD ') + name.padEnd(28), detail ?? '');
}

const wk = await webkit.launch({ env: wkEnv });

for (const job of shots) {
  const [vw, vh] = job.size;
  const ctx = await phoneCtx(wk, vw, vh);
  const page = await ctx.newPage();
  const errs = collectPage(page);
  await page.goto(base + job.path, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await waitCurtain(page);
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
    await page.waitForTimeout(Math.min(2800, 16 * job.steps + 80));
  }
  await page.waitForTimeout(job.wait || 600);
  await page.evaluate(() => { window.__pause = true; window.__steps = 0; });
  const shot = path.join(out, job.name + '.png');
  await page.screenshot({ path: shot, fullPage: false });
  const extra = await page.evaluate(() => ({
    wander: window.__wander ? { x: window.__wander.x } : null,
    home: window.__home ? window.__home.phase() : null,
    whisper: document.querySelector('.gift-whisper')?.textContent || '',
    whisperOn: document.querySelector('.gift-whisper')?.classList.contains('on') || false,
    line: document.querySelector('.hm-line.on')?.textContent || '',
    finale: document.querySelector('.hm-finale.on')?.textContent || '',
  }));
  const fail = realErrs(errs);
  note('shot:' + job.name, fail.length === 0, fail.length ? fail.join(' | ') : JSON.stringify(extra));
  await ctx.close();
}

// room persist + save (without triggering transform via persist-only)
{
  const ctx = await phoneCtx(wk, 844, 390);
  const page = await ctx.newPage();
  const errs = collectPage(page);
  await page.goto(base + 'home/?lang=zh&at=room&fresh=1', { waitUntil: 'domcontentloaded' });
  await waitCurtain(page);
  await page.waitForTimeout(700);
  const placed = await page.evaluate(() => {
    const chip = document.querySelector('.hm-chip[data-kind="sofa"]');
    chip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const canvas = document.querySelector('#home canvas');
    if (!canvas) return { ok: false, why: 'no canvas' };
    const r = canvas.getBoundingClientRect();
    const ev = (type, x, y) => canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
    ev('pointerdown', r.left + r.width * 0.48, r.top + r.height * 0.70);
    ev('pointerup', r.left + r.width * 0.48, r.top + r.height * 0.70);
    window.__homeRoom?.persist?.();
    const raw = localStorage.getItem('gift.home.layout.v1');
    return { ok: !!raw && raw.includes('sofa'), n: window.__homeRoom?.items()?.length ?? 0 };
  });
  await page.goto(base + 'home/?lang=zh&at=room', { waitUntil: 'domcontentloaded' });
  await waitCurtain(page);
  await page.waitForTimeout(600);
  const again = await page.evaluate(() => window.__homeRoom?.items()?.some(i => i.kind === 'sofa'));
  await page.screenshot({ path: path.join(out, 'home-room-persist.png') });
  note('room-persist', !!(placed.ok && again && realErrs(errs).length === 0), JSON.stringify({ placed, again, errs: realErrs(errs) }));
  await ctx.close();
}

// keyboard + touch traversal
{
  const ctx = await phoneCtx(wk, 390, 844);
  const page = await ctx.newPage();
  const errs = collectPage(page);
  await page.goto(base + 'flower/?lang=zh', { waitUntil: 'domcontentloaded' });
  await waitCurtain(page);
  await page.waitForTimeout(400);
  const x0 = await page.evaluate(() => window.__wander?.x ?? -1);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowRight');
  const x1 = await page.evaluate(() => window.__wander?.x ?? -1);
  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  if (box) {
    await page.touchscreen.tap(box.x + box.width * 0.88, box.y + box.height * 0.62);
    await page.waitForTimeout(900);
  }
  const x2 = await page.evaluate(() => window.__wander?.x ?? -1);
  note('flower-keyboard-touch', x1 > x0 + 8 && x2 >= x1 - 2 && realErrs(errs).length === 0, JSON.stringify({ x0, x1, x2, errs: realErrs(errs) }));
  await ctx.close();
}

// montage skip / replay / reduced motion
{
  const ctx = await phoneCtx(wk, 844, 390, { reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errs = collectPage(page);
  await page.goto(base + 'home/?lang=zh&at=walk&furnish=1', { waitUntil: 'domcontentloaded' });
  await waitCurtain(page);
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => window.__home?.phase());
  await page.click('.hm-skip');
  await page.waitForTimeout(200);
  await page.click('.hm-skip');
  await page.waitForTimeout(200);
  await page.click('.hm-skip');
  await page.waitForTimeout(200);
  await page.click('.hm-skip');
  await page.waitForTimeout(200);
  await page.click('.hm-skip');
  await page.waitForTimeout(200);
  await page.click('.hm-skip');
  await page.waitForTimeout(800);
  const mid = await page.evaluate(() => ({ phase: window.__home?.phase(), finale: document.querySelector('.hm-finale')?.classList.contains('on') }));
  await page.click('.hm-replay');
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.__home?.phase());
  note('montage-skip-replay-reduced', before === 'walk' && mid.phase === 'finale' && after === 'walk' && realErrs(errs).length === 0,
    JSON.stringify({ before, mid, after, errs: realErrs(errs) }));
  await ctx.close();
}

// chapter chain + audio-without-gesture (sound on) — WebKit
async function chainAndAudio(browser, label, launchCtx) {
  const ctx = await launchCtx();
  const page = await ctx.newPage();
  const errs = collectPage(page);
  const seen = [];
  for (const st of STAGES) {
    const url = base + st.path + (st.path.includes('?') ? '&sound=1' : '?sound=1');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await waitCurtain(page);
    await page.waitForTimeout(350);
    const info = await page.evaluate(() => ({
      title: document.title,
      stage: document.querySelector('meta[name="gift-stage"]')?.content || '',
      canvas: !!document.querySelector('canvas'),
    }));
    seen.push({ id: st.id, ...info, href: page.url() });
  }
  const audioErrs = realErrs(errs).filter(e => /NotAllowedError|AudioContext/i.test(e));
  const other = realErrs(errs).filter(e => !/NotAllowedError|AudioContext/i.test(e));
  note(label + '-chain', seen.length === STAGES.length && seen.every(s => s.stage === s.id || s.id === 'meadow'), JSON.stringify(seen.map(s => s.stage || s.id)));
  note(label + '-audio-nongesture', audioErrs.length === 0, audioErrs.join(' | ') || 'no NotAllowedError');
  // first gesture then toggle
  await page.goto(base + 'coop/?lang=zh&sound=1', { waitUntil: 'domcontentloaded' });
  await waitCurtain(page);
  await page.mouse.click(40, 40);
  await page.waitForTimeout(200);
  const soundBtn = await page.$('.gc-sound');
  if (soundBtn) {
    await soundBtn.click();
    await page.waitForTimeout(150);
    await soundBtn.click();
  }
  await page.waitForTimeout(250);
  const afterGesture = realErrs(errs).filter(e => /NotAllowedError|AudioContext/i.test(e));
  note(label + '-audio-gesture', afterGesture.length === 0, afterGesture.join(' | ') || ('other=' + other.length));
  await ctx.close();
  return other;
}

await chainAndAudio(wk, 'webkit', () => phoneCtx(wk, 390, 844));

// Chromium (system Chrome) — chain, audio, persist, one key frame
const ch = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});
await chainAndAudio(ch, 'chromium', () => ch.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  ignoreHTTPSErrors: true,
  locale: 'zh-CN',
}));
{
  const ctx = await ch.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = collectPage(page);
  await page.goto(base + 'home/?lang=zh&at=greet&furnish=1', { waitUntil: 'domcontentloaded' });
  await waitCurtain(page);
  await page.evaluate(() => { window.__pause = true; window.__steps = 100; });
  await page.waitForTimeout(1800);
  await page.evaluate(() => { window.__pause = true; window.__steps = 0; });
  await page.screenshot({ path: path.join(out, 'chromium-home-greet.png') });
  note('chromium-greet-shot', realErrs(errs).length === 0, realErrs(errs).join(' | '));
  await ctx.close();
}

await wk.close();
await ch.close();

function grid(name, files, cols) {
  const list = files.map(f => path.join(out, f)).filter(f => fs.existsSync(f));
  if (!list.length) return Promise.resolve();
  const dest = path.join(out, name);
  return new Promise(res => {
    const p = spawn('python3', [path.resolve('tools/v03j-grid.py'), String(cols), dest, ...list], { stdio: 'inherit' });
    p.on('close', () => res());
    p.on('error', () => res());
  });
}

await grid('forests-grid.jpg', ['flower-phone.png', 'flower-430.png', 'flower-land.png', 'mushroom-phone.png', 'mushroom-430.png', 'mushroom-land.png'], 3);
await grid('forests-end-grid.jpg', ['flower-end.png', 'mushroom-end.png', 'flower-whisper.png'], 3);
await grid('home-grid.jpg', ['home-approach.png', 'home-approach-430.png', 'home-found.png', 'home-room-land.png', 'home-room-phone.png', 'home-transform.png'], 3);
await grid('montage-grid.jpg', ['home-walk.png', 'home-greet.png', 'home-sofa.png', 'home-sleep.png', 'home-snow.png', 'home-dawn.png', 'home-finale.png'], 4);
await grid('montage-phone-grid.jpg', ['home-walk-phone.png', 'home-greet-phone.png', 'home-sofa-phone.png', 'home-sleep-phone.png', 'home-dawn-phone.png'], 3);

// close readable crops of montage frames
await new Promise(res => {
  const p = spawn('python3', ['-'], { stdio: ['pipe', 'inherit', 'inherit'] });
  p.stdin.write(`
from PIL import Image
from pathlib import Path
out = Path(${JSON.stringify(out)})
jobs = [
  ('home-walk.png', 'close-walk.png', 0.18, 0.22, 0.82, 0.98),
  ('home-greet.png', 'close-greet.png', 0.12, 0.28, 0.88, 0.98),
  ('home-sofa.png', 'close-sofa.png', 0.16, 0.22, 0.88, 0.96),
  ('home-sleep.png', 'close-sleep.png', 0.12, 0.28, 0.90, 0.96),
  ('home-snow.png', 'close-snow.png', 0.10, 0.22, 0.80, 0.98),
  ('home-dawn.png', 'close-dawn.png', 0.22, 0.28, 0.78, 0.96),
  ('home-walk-phone.png', 'close-walk-phone.png', 0.05, 0.42, 0.95, 0.92),
  ('home-greet-phone.png', 'close-greet-phone.png', 0.05, 0.42, 0.95, 0.92),
]
for src, dest, l, t, r, b in jobs:
    p = out / src
    if not p.exists():
        continue
    im = Image.open(p)
    w, h = im.size
    im.crop((int(w*l), int(h*t), int(w*r), int(h*b))).save(out / dest)
    print('crop', dest)
`);
  p.stdin.end();
  p.on('close', () => res());
});

await grid('montage-close-grid.jpg', ['close-walk.png', 'close-greet.png', 'close-sofa.png', 'close-sleep.png', 'close-snow.png', 'close-dawn.png', 'close-walk-phone.png', 'close-greet-phone.png'], 4);

fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ bad, results }, null, 2));
console.log(bad ? `${bad} BAD` : 'ALL OK');
process.exit(bad ? 1 : 0);
