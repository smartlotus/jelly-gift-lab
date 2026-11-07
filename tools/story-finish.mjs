// Finish-pass review: furniture without QA hooks, caption/door/pets/sofa stills,
// animal encounters, chapter chain, and short motion recordings.
//   GIO_USE_PROXY_RESOLVER=dummy GSETTINGS_BACKEND=memory node tools/story-finish.mjs [base] [outdir]
import { webkit, chromium, devices } from 'file:///workspace/jelly/pw/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const base = process.argv[2] || 'http://localhost:8822/';
const out = process.argv[3] || path.resolve('review/story-finish');
const videoDir = path.join(out, 'video');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });
fs.mkdirSync('/workspace/jelly/recordings', { recursive: true });

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

const results = [];
let bad = 0;
function note(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) bad++;
  console.log((ok ? 'OK  ' : 'BAD ') + name.padEnd(36), typeof detail === 'string' ? detail : JSON.stringify(detail ?? ''));
}

function collectPage(page) {
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('error: ' + m.text()); });
  return errs;
}
function realErrs(errs) {
  return errs.filter(e => !/favicon|Failed to load resource.*404/i.test(e) && !/ResizeObserver loop/i.test(e));
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

async function seedSavedLayout(page) {
  const file = path.join(out, 'saved-layout.json');
  if (!fs.existsSync(file)) return false;
  const raw = fs.readFileSync(file, 'utf8');
  await page.addInitScript((value) => {
    localStorage.setItem('gift.home.layout.v1', value);
  }, raw);
  return true;
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

async function shot(page, name) {
  const dest = path.join(out, name + '.png');
  await page.screenshot({ path: dest, fullPage: false });
  return dest;
}

async function step(page, n) {
  await page.evaluate((k) => { window.__pause = true; window.__steps = k; }, n);
  await page.waitForTimeout(Math.min(3200, 16 * n + 80));
}

async function freeze(page) {
  await page.evaluate(() => { window.__pause = true; window.__steps = 0; });
}

function canvasPoint(box, nx, ny) {
  return { x: box.x + box.width * nx, y: box.y + box.height * ny };
}

async function canvasBox(page) {
  const box = await page.locator('#home canvas, canvas').first().boundingBox();
  if (!box) throw new Error('no canvas box');
  return box;
}

async function touchPointer(page, type, x, y, target = 'window') {
  await page.evaluate(({ type, x, y, target }) => {
    const ev = new PointerEvent(type, {
      bubbles: true, cancelable: true, clientX: x, clientY: y,
      pointerId: 11, pointerType: 'touch', isPrimary: true,
    });
    if (target === 'canvas') {
      document.querySelector('#home canvas')?.dispatchEvent(ev);
    } else {
      window.dispatchEvent(ev);
    }
  }, { type, x, y, target });
}

async function placeKind(page, kind, nx, ny) {
  const chip = page.locator(`.hm-chip[data-kind="${kind}"]`);
  await chip.scrollIntoViewIfNeeded();
  await chip.click();
  const box = await canvasBox(page);
  const p = canvasPoint(box, nx, ny);
  await touchPointer(page, 'pointerdown', p.x, p.y, 'canvas');
  await touchPointer(page, 'pointerup', p.x, p.y, 'window');
  await page.waitForTimeout(80);
}

async function touchDrag(page, nx0, ny0, nx1, ny1) {
  const box = await canvasBox(page);
  const a = canvasPoint(box, nx0, ny0);
  const b = canvasPoint(box, nx1, ny1);
  await touchPointer(page, 'pointerdown', a.x, a.y, 'canvas');
  await touchPointer(page, 'pointermove', (a.x + b.x) / 2, (a.y + b.y) / 2, 'window');
  await touchPointer(page, 'pointermove', b.x, b.y, 'window');
  await touchPointer(page, 'pointerup', b.x, b.y, 'window');
  await page.waitForTimeout(80);
}

async function readLayout(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('gift.home.layout.v1');
    try { return raw ? JSON.parse(raw) : null; } catch { return { raw }; }
  });
}

function copyRecording(src, name) {
  const dest = path.join(videoDir, name);
  const also = path.join('/workspace/jelly/recordings', name);
  fs.copyFileSync(src, dest);
  fs.copyFileSync(src, also);
  return dest;
}

const wk = await webkit.launch({ env: wkEnv });

// ---------------------------------------------------------------------------
// Furniture UI: documented ?at=room entry, no furnish=1, no __homeRoom
// ---------------------------------------------------------------------------
{
  const ctx = await phoneCtx(wk, 844, 390);
  const page = await ctx.newPage();
  const errs = collectPage(page);
  await page.goto(base + 'home/?lang=zh&at=room&fresh=1', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await waitCurtain(page);
  await page.waitForSelector('.hm-chip[data-kind="sofa"]', { timeout: 15000 });
  await page.waitForTimeout(500);

  const start = await page.evaluate(() => ({
    furnish: new URLSearchParams(location.search).has('furnish'),
    at: new URLSearchParams(location.search).get('at'),
    href: location.pathname + location.search,
    storage: localStorage.getItem('gift.home.layout.v1'),
    homeRoom: typeof window.__homeRoom,
    chips: document.querySelectorAll('.hm-chip').length,
    selOn: document.querySelector('.hm-sel')?.classList.contains('on') || false,
  }));
  await shot(page, 'home-room-empty');
  note('room-empty-start', start.at === 'room' && !start.furnish && start.storage === null && !start.selOn && start.chips > 4,
    { ...start, note: '__homeRoom may exist as a debug object; this pass never called persist/furnishDemo/save on it' });

  await placeKind(page, 'sofa', 0.40, 0.50);
  await page.waitForTimeout(200);
  const labels = await page.evaluate(() => ({
    flip: document.querySelector('[data-k=flip]')?.textContent?.trim() || '',
    remove: document.querySelector('[data-k=del]')?.textContent?.trim() || '',
    undo: document.querySelector('[data-k=undo]')?.textContent?.trim() || '',
    reset: document.querySelector('[data-k=reset]')?.textContent?.trim() || '',
    save: document.querySelector('[data-k=save]')?.textContent?.trim() || '',
    selOn: document.querySelector('.hm-sel')?.classList.contains('on') || false,
  }));
  await shot(page, 'home-room-placed');
  note('room-labels-zh', labels.flip === '翻转' && labels.remove === '拿掉' && labels.undo === '撤销' && labels.reset === '重置' && labels.save === '保存布局' && labels.selOn,
    labels);

  const beforeSave = await readLayout(page);
  note('room-place-does-not-persist', beforeSave === null, beforeSave);

  await touchDrag(page, 0.40, 0.50, 0.58, 0.50);
  await page.waitForTimeout(200);
  await shot(page, 'home-room-drag');
  note('room-touch-drag', true, 'pointerType=touch sofa 0.40→0.58 at sprite height 0.50');

  const afterDragSel = await page.evaluate(() => document.querySelector('.hm-sel')?.classList.contains('on') || false);
  if (!afterDragSel) {
    const box = await canvasBox(page);
    const pnt = canvasPoint(box, 0.58, 0.50);
    await touchPointer(page, 'pointerdown', pnt.x, pnt.y, 'canvas');
    await touchPointer(page, 'pointerup', pnt.x, pnt.y, 'window');
    await page.waitForTimeout(120);
  }
  await page.locator('[data-k=flip]').click({ timeout: 8000 });
  await page.waitForTimeout(150);
  await shot(page, 'home-room-flip');
  note('room-flip-control', true, 'clicked 翻转 (not 旋转)');

  await page.click('[data-k=del]');
  await page.waitForTimeout(150);
  const afterRemove = await page.evaluate(() => document.querySelector('.hm-sel')?.classList.contains('on') || false);
  note('room-remove', afterRemove === false, { afterRemove });

  await page.click('[data-k=undo]');
  await page.waitForTimeout(150);
  const afterUndo = await page.evaluate(() => document.querySelector('.hm-sel')?.classList.contains('on') || false);
  await shot(page, 'home-room-undo');
  note('room-undo', afterUndo === true, { afterUndo });

  await page.click('[data-k=reset]');
  await page.waitForTimeout(150);
  const afterReset = await page.evaluate(() => ({
    selOn: document.querySelector('.hm-sel')?.classList.contains('on') || false,
    storage: localStorage.getItem('gift.home.layout.v1'),
  }));
  await shot(page, 'home-room-reset');
  note('room-reset-clears', afterReset.selOn === false && afterReset.storage && afterReset.storage.includes('"items":[]'),
    afterReset);

  // reload without save drops a newly placed item
  await placeKind(page, 'armchair', 0.30, 0.50);
  await page.waitForTimeout(120);
  const unsaved = await readLayout(page);
  note('room-unsaved-not-written', !unsaved || (Array.isArray(unsaved.items) && unsaved.items.length === 0), unsaved);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitCurtain(page);
  await page.waitForSelector('.hm-chip[data-kind="sofa"]');
  await page.waitForTimeout(400);
  const afterReloadUnsaved = await page.evaluate(() => ({
    selOn: document.querySelector('.hm-sel')?.classList.contains('on') || false,
    storage: localStorage.getItem('gift.home.layout.v1'),
  }));
  await shot(page, 'home-room-reload-unsaved');
  note('room-reload-without-save', afterReloadUnsaved.selOn === false, afterReloadUnsaved);

  // chosen layout, then the real 保存布局 button
  await placeKind(page, 'sofa', 0.50, 0.52);
  await placeKind(page, 'tv', 0.20, 0.52);
  await placeKind(page, 'lamp', 0.74, 0.50);
  await placeKind(page, 'roses', 0.36, 0.50);
  await placeKind(page, 'lisi', 0.64, 0.50);
  await page.waitForTimeout(200);
  await shot(page, 'home-room-chosen');
  await page.click('[data-k=save]');
  await page.waitForTimeout(500);
  const saved = await page.evaluate(() => ({
    phase: window.__home?.phase?.(),
    raw: localStorage.getItem('gift.home.layout.v1'),
    line: document.querySelector('.hm-line.on')?.textContent || '',
    lineOn: document.querySelector('.hm-line')?.classList.contains('on') || false,
    chipsGone: !document.querySelector('.hm-chip'),
  }));
  let savedObj = null;
  try { savedObj = JSON.parse(saved.raw || 'null'); } catch { savedObj = null; }
  const kinds = (savedObj?.items || []).map(i => i.kind).sort();
  await shot(page, 'home-transform');
  note('room-save-real-button', saved.phase === 'transform' && saved.chipsGone && kinds.includes('sofa') && kinds.includes('tv') && kinds.includes('lamp') && kinds.includes('roses') && kinds.includes('lisi') && /2000|自己的家/.test(saved.line),
    { phase: saved.phase, kinds, line: saved.line });
  if (saved.raw) fs.writeFileSync(path.join(out, 'saved-layout.json'), saved.raw);

  // reload room should show the saved layout (same origin storage)
  await page.goto(base + 'home/?lang=zh&at=room', { waitUntil: 'domcontentloaded' });
  await waitCurtain(page);
  await page.waitForSelector('.hm-chip[data-kind="sofa"]');
  await page.waitForTimeout(500);
  const reloaded = await readLayout(page);
  await shot(page, 'home-room-reloaded');
  note('room-reload-after-save', Array.isArray(reloaded?.items) && reloaded.items.some(i => i.kind === 'sofa') && reloaded.items.length >= 5,
    reloaded);

  const fail = realErrs(errs);
  note('room-no-page-errors', fail.length === 0, fail.join(' | '));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Montage from the actually saved layout (same storage, no furnish=1)
// Start via transform skip so walk/greet begin at t=0 (not ?at= mid-scene).
// ---------------------------------------------------------------------------
{
  const ctx = await phoneCtx(wk, 844, 390);
  const page = await ctx.newPage();
  const errs = collectPage(page);
  const seeded = await seedSavedLayout(page);
  note('montage-seed-saved-layout', seeded, seeded ? 'from furniture Save' : 'missing saved-layout.json');
  await page.goto(base + 'home/?lang=zh&at=room', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await waitCurtain(page);
  await page.waitForSelector('.hm-chip[data-kind="save"], [data-k=save]', { timeout: 15000 });
  const pre = await readLayout(page);
  note('montage-uses-saved-layout', Array.isArray(pre?.items) && pre.items.some(i => i.kind === 'sofa'), pre);
  await page.click('[data-k=save]');
  await page.waitForTimeout(400);
  await page.click('.hm-skip'); // transform -> montage walk at t=0
  await page.waitForTimeout(200);

  await step(page, 12);
  await freeze(page);
  const walk0 = await page.evaluate(() => window.__home?.phase?.());
  await shot(page, 'home-walk-closed');

  await step(page, 150);
  await freeze(page);
  await shot(page, 'home-walk-mid');

  await step(page, 120);
  await freeze(page);
  await shot(page, 'home-walk-open');
  note('montage-walk-from-zero', walk0 === 'walk', walk0);

  await page.click('.hm-skip'); // greet from t=0
  await page.waitForTimeout(150);
  await step(page, 24);
  await freeze(page);
  const greetPhase = await page.evaluate(() => window.__home?.phase?.());
  await shot(page, 'home-greet-rush');

  await step(page, 200);
  await freeze(page);
  await shot(page, 'home-greet-settle');
  note('montage-greet-from-zero', greetPhase === 'greet', greetPhase);

  await page.click('.hm-skip');
  await page.waitForTimeout(120);
  await step(page, 70);
  await freeze(page);
  await shot(page, 'home-sofa');

  await page.click('.hm-skip');
  await page.waitForTimeout(120);
  await step(page, 70);
  await freeze(page);
  await shot(page, 'home-sleep');

  await page.click('.hm-skip');
  await page.waitForTimeout(120);
  await step(page, 90);
  await freeze(page);
  await shot(page, 'home-snow');

  await page.click('.hm-skip');
  await page.waitForTimeout(120);
  await step(page, 40);
  await freeze(page);
  await shot(page, 'home-dawn');

  await page.evaluate(() => { window.__pause = false; });
  await page.click('.hm-skip');
  await step(page, 80);
  await page.evaluate(() => { window.__pause = false; });
  await page.waitForTimeout(300);
  const finale = await page.evaluate(() => ({
    phase: window.__home?.phase?.(),
    text: document.querySelector('.hm-finale.on')?.textContent || document.querySelector('.hm-finale')?.textContent || '',
    on: document.querySelector('.hm-finale')?.classList.contains('on') || false,
  }));
  await shot(page, 'home-finale');
  note('montage-finale-caption', finale.phase === 'finale' && /两千|臭猫/.test(finale.text), finale);

  const fail = realErrs(errs);
  note('montage-sequence-errors', fail.length === 0, fail.join(' | '));
  await ctx.close();
}

// phone crops of sofa/sleep + found caption + approach door
{
  const ctx = await phoneCtx(wk, 390, 844);
  const page = await ctx.newPage();
  await seedSavedLayout(page);
  await page.goto(base + 'home/?lang=zh', { waitUntil: 'domcontentloaded' });
  await waitCurtain(page);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__home?.skip?.());
  await page.waitForTimeout(350);
  const found = await page.evaluate(() => ({
    on: document.querySelector('.hm-line')?.classList.contains('on') || false,
    text: document.querySelector('.hm-line')?.textContent || '',
  }));
  await shot(page, 'home-found');
  note('home-found-caption', found.on && /空房子|布置/.test(found.text), found);

  await page.evaluate(() => window.__home?.skip?.()); // enter
  await step(page, 50);
  await freeze(page);
  await shot(page, 'home-approach-door');

  await page.goto(base + 'home/?lang=zh&at=room', { waitUntil: 'domcontentloaded' });
  await waitCurtain(page);
  await page.waitForTimeout(300);
  const skipTurn = page.locator('[data-k=skipturn]');
  if (await skipTurn.isVisible().catch(() => false)) await skipTurn.click();
  await page.waitForTimeout(200);
  await page.click('[data-k=save]');
  await page.waitForTimeout(250);
  await page.click('.hm-skip');
  await page.click('.hm-skip'); // greet
  await step(page, 210);
  await freeze(page);
  await shot(page, 'home-greet-phone');
  await page.click('.hm-skip');
  await step(page, 70);
  await freeze(page);
  await shot(page, 'home-sofa-phone');
  await page.click('.hm-skip');
  await step(page, 70);
  await freeze(page);
  await shot(page, 'home-sleep-phone');
  await ctx.close();
}

// forest whispers + canopy + animal encounters (seek to documented spawn marks)
{
  const animals = [
    { name: 'flower-lamb', path: 'flower/?lang=zh', at: 260, steps: 160 },
    { name: 'flower-deer', path: 'flower/?lang=zh', at: 780, steps: 170 },
    { name: 'flower-collie', path: 'flower/?lang=zh', at: 1080, steps: 150 },
    { name: 'flower-owl', path: 'flower/?lang=zh', at: 1360, steps: 150 },
    { name: 'mushroom-deer', path: 'mushroom/?lang=zh', at: 480, steps: 170 },
    { name: 'mushroom-owl', path: 'mushroom/?lang=zh', at: 240, steps: 150 },
  ];
  for (const job of animals) {
    const ctx = await phoneCtx(wk, 390, 844);
    const page = await ctx.newPage();
    const errs = collectPage(page);
    await page.goto(base + job.path, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await waitCurtain(page);
    await page.waitForTimeout(400);
    const ready = await page.evaluate((x) => {
      if (!window.__wander?.seek) return { ok: false };
      window.__wander.seek(x);
      return { ok: true, x: window.__wander.x };
    }, job.at);
    await step(page, job.steps);
    await freeze(page);
    await shot(page, job.name);
    note('animal:' + job.name, ready.ok && realErrs(errs).length === 0, { seek: job.at, x: ready.x, errs: realErrs(errs) });
    await ctx.close();
  }

  for (const job of [
    { name: 'flower-phone', path: 'flower/?lang=zh', size: [390, 844], seek: 820, wait: 700 },
    { name: 'flower-land', path: 'flower/?lang=zh', size: [844, 390], seek: 820, wait: 700 },
    { name: 'flower-whisper-phone', path: 'flower/?lang=zh', size: [390, 844], wait: 2000 },
    { name: 'flower-whisper-land', path: 'flower/?lang=zh', size: [844, 390], wait: 2000 },
    { name: 'mushroom-phone', path: 'mushroom/?lang=zh', size: [390, 844], seek: 780, wait: 700 },
    { name: 'mushroom-land', path: 'mushroom/?lang=zh', size: [844, 390], seek: 780, wait: 700 },
  ]) {
    const [vw, vh] = job.size;
    const ctx = await phoneCtx(wk, vw, vh);
    const page = await ctx.newPage();
    const errs = collectPage(page);
    await page.goto(base + job.path, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await waitCurtain(page);
    if (job.seek) {
      await page.evaluate((x) => { window.__wander?.seek?.(x); }, job.seek);
      await step(page, 12);
    }
    await page.waitForTimeout(job.wait || 600);
    if (job.name.includes('whisper')) {
      const w = await page.evaluate(() => ({
        on: document.querySelector('.gift-whisper')?.classList.contains('on') || false,
        text: document.querySelector('.gift-whisper')?.textContent || '',
      }));
      note('caption:' + job.name, w.on && w.text.length > 4, w);
    }
    await freeze(page);
    await shot(page, job.name);
    note('shot:' + job.name, realErrs(errs).length === 0, realErrs(errs).join(' | '));
    await ctx.close();
  }
}

// chapter chain + audio, both engines
async function chainAndAudio(browser, label, launchCtx) {
  const ctx = await launchCtx();
  const page = await ctx.newPage();
  const errs = collectPage(page);
  const seen = [];
  for (const st of STAGES) {
    const url = base + st.path + (st.path.includes('?') ? '&sound=1' : '?sound=1');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await waitCurtain(page);
    await page.waitForTimeout(280);
    const info = await page.evaluate(() => ({
      stage: document.querySelector('meta[name="gift-stage"]')?.content || '',
      canvas: !!document.querySelector('canvas'),
    }));
    seen.push({ id: st.id, ...info, href: page.url() });
  }
  const audioErrs = realErrs(errs).filter(e => /NotAllowedError|AudioContext/i.test(e));
  note(label + '-chain', seen.length === STAGES.length && seen.every(s => s.stage === s.id || s.id === 'meadow'),
    seen.map(s => s.stage || s.id));
  note(label + '-audio-nongesture', audioErrs.length === 0, audioErrs.join(' | ') || 'no NotAllowedError');
  await page.goto(base + 'coop/?lang=zh&sound=1', { waitUntil: 'domcontentloaded' });
  await waitCurtain(page);
  await page.mouse.click(40, 40);
  await page.waitForTimeout(160);
  const soundBtn = await page.$('.gc-sound');
  if (soundBtn) { await soundBtn.click(); await page.waitForTimeout(120); await soundBtn.click(); }
  await page.waitForTimeout(200);
  const afterGesture = realErrs(errs).filter(e => /NotAllowedError|AudioContext/i.test(e));
  note(label + '-audio-gesture', afterGesture.length === 0, afterGesture.join(' | ') || 'ok');
  await ctx.close();
}

await chainAndAudio(wk, 'webkit', () => phoneCtx(wk, 390, 844));

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

// recordings (Chromium). Do not claim these were watched.
{
  const ctx = await ch.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: 'zh-CN',
    recordVideo: { dir: videoDir, size: { width: 844, height: 390 } },
  });
  const page = await ctx.newPage();
  await seedSavedLayout(page);
  await page.goto(base + 'home/?lang=zh&at=room', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await waitCurtain(page);
  await page.waitForSelector('[data-k=save]');
  await page.waitForTimeout(300);
  await page.click('[data-k=save]');
  await page.waitForTimeout(800);
  await page.click('.hm-skip'); // walk from 0, door closed → open
  await page.waitForTimeout(6200);
  await page.click('.hm-skip'); // greet rush
  await page.waitForTimeout(6000);
  await page.click('.hm-skip'); // sofa
  await page.waitForTimeout(2800);
  const vid = page.video();
  await ctx.close();
  if (vid) {
    const savedAs = path.join(videoDir, 'door-greet-sofa.webm');
    await vid.saveAs(savedAs);
    copyRecording(savedAs, 'door-greet-sofa.webm');
    note('record:door-greet-sofa', fs.existsSync(savedAs) && fs.statSync(savedAs).size > 10000, { bytes: fs.statSync(savedAs).size, path: savedAs });
  } else {
    note('record:door-greet-sofa', false, 'no video object');
  }
}

{
  const ctx = await ch.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    recordVideo: { dir: videoDir, size: { width: 844, height: 390 } },
  });
  const page = await ctx.newPage();
  await page.goto(base + 'home/?lang=zh&at=snow', { waitUntil: 'domcontentloaded' });
  await waitCurtain(page);
  await page.waitForTimeout(3500);
  await page.goto(base + 'home/?lang=zh&at=dawn', { waitUntil: 'domcontentloaded' });
  await waitCurtain(page);
  await page.waitForTimeout(3500);
  const vid = page.video();
  await ctx.close();
  if (vid) {
    const savedAs = path.join(videoDir, 'snow-dawn.webm');
    await vid.saveAs(savedAs);
    copyRecording(savedAs, 'snow-dawn.webm');
    note('record:snow-dawn', fs.existsSync(savedAs) && fs.statSync(savedAs).size > 8000, { bytes: fs.statSync(savedAs).size, path: savedAs });
  } else note('record:snow-dawn', false, 'no video object');
}

{
  const ctx = await ch.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: 'zh-CN',
    recordVideo: { dir: videoDir, size: { width: 390, height: 844 } },
  });
  const page = await ctx.newPage();
  await page.goto(base + 'flower/?lang=zh', { waitUntil: 'domcontentloaded' });
  await waitCurtain(page);
  await page.evaluate(() => window.__wander?.seek?.(780));
  await page.waitForTimeout(4500);
  const vid = page.video();
  await ctx.close();
  if (vid) {
    const savedAs = path.join(videoDir, 'flower-deer.webm');
    await vid.saveAs(savedAs);
    copyRecording(savedAs, 'flower-deer.webm');
    note('record:flower-deer', fs.existsSync(savedAs) && fs.statSync(savedAs).size > 8000, { bytes: fs.statSync(savedAs).size, path: savedAs });
  } else note('record:flower-deer', false, 'no video object');
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

await grid('room-grid.jpg', ['home-room-empty.png', 'home-room-placed.png', 'home-room-drag.png', 'home-room-flip.png', 'home-room-chosen.png', 'home-room-reloaded.png'], 3);
await grid('door-grid.jpg', ['home-walk-closed.png', 'home-walk-mid.png', 'home-walk-open.png', 'home-approach-door.png'], 4);
await grid('pets-grid.jpg', ['home-greet-rush.png', 'home-greet-settle.png', 'home-greet-phone.png'], 3);
await grid('montage-grid.jpg', ['home-sofa.png', 'home-sleep.png', 'home-snow.png', 'home-dawn.png', 'home-finale.png', 'home-transform.png'], 3);
await grid('caption-grid.jpg', ['home-found.png', 'home-transform.png', 'flower-whisper-phone.png', 'flower-whisper-land.png', 'home-finale.png'], 3);
await grid('animals-grid.jpg', ['flower-lamb.png', 'flower-deer.png', 'flower-collie.png', 'flower-owl.png', 'mushroom-deer.png', 'mushroom-owl.png'], 3);
await grid('forests-grid.jpg', ['flower-phone.png', 'flower-land.png', 'mushroom-phone.png', 'mushroom-land.png'], 2);

await new Promise(res => {
  const p = spawn('python3', ['-'], { stdio: ['pipe', 'inherit', 'inherit'] });
  p.stdin.write(`
from PIL import Image
from pathlib import Path
out = Path(${JSON.stringify(out)})
jobs = [
  ('home-sofa.png', 'close-sofa.png', 0.16, 0.22, 0.88, 0.96),
  ('home-sleep.png', 'close-sleep.png', 0.12, 0.28, 0.90, 0.96),
  ('home-snow.png', 'close-snow.png', 0.10, 0.22, 0.80, 0.98),
  ('home-dawn.png', 'close-dawn.png', 0.22, 0.28, 0.78, 0.96),
  ('home-greet-settle.png', 'close-greet.png', 0.08, 0.28, 0.88, 0.98),
  ('home-walk-mid.png', 'close-walk.png', 0.16, 0.22, 0.86, 0.98),
]
for src, dest, l, t, r, b in jobs:
    pth = out / src
    if not pth.exists():
        continue
    im = Image.open(pth)
    w, h = im.size
    im.crop((int(w*l), int(h*t), int(w*r), int(h*b))).save(out / dest)
    print('crop', dest)
`);
  p.stdin.end();
  p.on('close', () => res());
});
await grid('montage-close-grid.jpg', ['close-walk.png', 'close-greet.png', 'close-sofa.png', 'close-sleep.png', 'close-snow.png', 'close-dawn.png'], 3);

const pages = {
  attempted: true,
  method: 'POST /repos/smartlotus/jelly-gift-story/pages',
  request: { build_type: 'legacy', source: { branch: 'gh-pages', path: '/' } },
  response: {
    message: 'Your current plan does not support GitHub Pages for this repository.',
    documentation_url: 'https://docs.github.com/rest/pages/pages#create-a-apiname-pages-site',
    status: '422',
  },
  visibility_after: { private: true, visibility: 'private', has_pages: false },
  note: 'Exact GitHub denial. Repo left private. gh-pages branch was pushed; Pages was not enabled.',
};
fs.writeFileSync(path.join(out, 'pages-response.json'), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ bad, results, pages, base }, null, 2));
console.log(bad ? `${bad} BAD` : 'ALL OK');
process.exit(bad ? 1 : 0);
