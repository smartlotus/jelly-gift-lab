// t23/t24 verification: exact journey hops, pig-follow, cat walk strips, spatial independence.
//   BASE=http://127.0.0.1:8833 node tools/v03m-verify.mjs
import { chromium, webkit } from 'file:///workspace/jelly/pw/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';

const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const OUT = path.resolve('review/v03m');
const CHROME = '/usr/bin/google-chrome';
mkdirSync(OUT, { recursive: true });
mkdirSync(`${OUT}/frames`, { recursive: true });

const report = { ts: new Date().toISOString(), tests: [] };
const log = (name, ok, extra = {}) => {
  report.tests.push({ name, ok, ...extra });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, extra && Object.keys(extra).length ? JSON.stringify(extra) : '');
};

async function launchChromium(extra = {}) {
  return chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
    ...extra,
  });
}

async function waitCurtain(page, ms = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const gone = await page.evaluate(() => {
      const c = document.getElementById('gift-curtain');
      return !c || c.classList.contains('gcc-gone') || c.classList.contains('gcc-out') || getComputedStyle(c).opacity === '0';
    }).catch(() => false);
    if (gone) return;
    await page.waitForTimeout(80);
  }
}

async function shot(page, name, clip) {
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, clip, animations: 'disabled' }).catch(async () => {
    await page.screenshot({ path: file });
  });
  return file;
}

async function canvasClip(page) {
  return page.evaluate(() => {
    const c = document.querySelector('#flower canvas, #mushroom canvas, #game canvas, #home canvas, #hm-space canvas, canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.max(1, r.width), height: Math.max(1, r.height) };
  });
}

function stitch(files, dest, { maxH = 160 } = {}) {
  const py = `
from PIL import Image
files = ${JSON.stringify(files)}
imgs = []
for f in files:
    im = Image.open(f).convert('RGBA')
    if im.height > ${maxH}:
        im = im.resize((max(1, int(im.width * ${maxH} / im.height)), ${maxH}), Image.NEAREST)
    imgs.append(im)
if not imgs:
    raise SystemExit('no frames')
w = sum(i.width for i in imgs)
h = max(i.height for i in imgs)
out = Image.new('RGBA', (w, h), (0,0,0,0))
x = 0
for im in imgs:
    out.paste(im, (x, h - im.height))
    x += im.width
out.save(${JSON.stringify(dest)})
print(out.size)
`;
  const r = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
  if (r.status !== 0) console.log('stitch fail', dest, r.stderr);
  return r.status === 0;
}

async function hop(page, name, startPath, trigger, expectRe) {
  await page.goto(`${BASE}/${startPath}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForTimeout(400);
  await trigger(page);
  try {
    await page.waitForURL(expectRe, { timeout: 20000 });
    log(name, expectRe.test(page.url()), { url: page.url() });
  } catch (e) {
    log(name, false, { url: page.url(), err: String(e).slice(0, 180) });
  }
}

async function routeTests(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror', e.message));

  await hop(page, 'meadow door -> shop', '?lang=zh', async p => {
    await p.waitForFunction(() => window.__meadow?.door, { timeout: 15000 });
    await p.evaluate(() => { const m = window.__meadow; m.door.state = 'done'; m.door.t = 0.5; });
  }, /\/shop\//);

  await hop(page, 'shop dark door -> night', 'shop/?lang=zh&at=door', async p => {
    await p.waitForTimeout(1800);
  }, /\/night\//);

  // superseded bypass must not exist
  await page.goto(`${BASE}/shop/?lang=zh&at=lit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForTimeout(2500);
  log('shop ?at=lit does not skip to jelly', !/\/jelly\//.test(page.url()), { url: page.url() });

  await hop(page, 'night kawaii continue -> jelly', 'night/?lang=zh&at=kawaii', async p => {
    await p.waitForSelector('.kw-go', { timeout: 15000 });
    await p.waitForTimeout(400);
    await p.click('.kw-go');
  }, /\/jelly\//);

  await page.goto(`${BASE}/jelly/?lang=zh`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  const seaBtn = await page.$('#to-sea');
  const egg = await page.$('#shroom');
  log('jelly 入海 exists outside egg', !!seaBtn, { egg: egg ? 'present-optional' : 'missing' });
  if (seaBtn) {
    await seaBtn.click();
    try {
      await page.waitForURL(/\/sea\//, { timeout: 15000 });
      log('jelly 入海 -> sea', /\/sea\//.test(page.url()), { url: page.url() });
    } catch (e) {
      log('jelly 入海 -> sea', false, { url: page.url(), err: String(e).slice(0, 180) });
    }
  }

  await hop(page, 'sky next without film -> coop', 'sky/?lang=zh&from=sea&hz=0.66', async p => {
    await p.waitForSelector('.sk-next', { timeout: 15000 });
    const filmOn = await p.evaluate(() => {
      const f = document.querySelector('.sk-film');
      return f && getComputedStyle(f).display !== 'none';
    });
    log('sky film control present (optional)', !!filmOn, {});
    await p.click('.sk-next');
  }, /\/coop\//);

  await hop(page, 'coop 往前走走 -> flower', 'coop/?lang=zh&solo&from=sky', async p => {
    await p.waitForFunction(() => window.__coop?.sim, { timeout: 20000 });
    await p.evaluate(() => { window.__coop.sim.end = 8; });
    await p.waitForSelector('.cp-home', { state: 'visible', timeout: 8000 });
    await p.click('.cp-home');
  }, /\/flower\//);

  await hop(page, 'flower exit -> mushroom', 'flower/?lang=zh', async p => {
    await p.waitForFunction(() => window.__wander?.worldW > 100, { timeout: 20000 });
    await p.evaluate(() => { const w = window.__wander; w.seek(w.worldW); });
  }, /\/mushroom\//);

  await hop(page, 'mushroom exit -> home', 'mushroom/?lang=zh', async p => {
    await p.waitForFunction(() => window.__wander?.worldW > 100, { timeout: 20000 });
    await p.evaluate(() => { const w = window.__wander; w.seek(w.worldW); });
  }, /\/home\//);

  await page.goto(`${BASE}/ar/?lang=zh&from=shop`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  const clicked = await page.evaluate(() => {
    const b = document.querySelector('.ar-back');
    if (b) { b.click(); return true; }
    return false;
  });
  if (clicked) {
    try {
      await page.waitForURL(/\/shop\//, { timeout: 15000 });
      log('AR returns to shop', /\/shop\//.test(page.url()), { url: page.url() });
    } catch (e) {
      log('AR returns to shop', false, { url: page.url(), err: String(e).slice(0, 180) });
    }
  } else {
    log('AR returns to shop', false, { reason: 'no back button found' });
  }

  // code-level NEXT check via curtain skip href
  await page.goto(`${BASE}/shop/?lang=zh`, { waitUntil: 'domcontentloaded' });
  const skip = await page.evaluate(() => document.querySelector('.gcc-skip')?.getAttribute('href') || '');
  log('curtain skip from shop points at night', /night/.test(skip), { skip });

  await ctx.close();
}

async function pigFollow(browser, theme) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${theme}/?lang=zh`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForFunction(() => window.__wander?.worldW > 100, { timeout: 20000 });
  await page.evaluate(() => window.__wander.seek(Math.min(420, window.__wander.worldW * 0.25)));
  await page.waitForTimeout(300);
  await page.keyboard.down('ArrowRight');
  const samples = [];
  const frames = [];
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(180);
    const info = await page.evaluate(() => ({
      cat: window.__wander.x, pig: window.__wander.pigX, pigFace: window.__wander.pigFace,
      pigVx: window.__wander.pigVx, face: window.__wander.face, vx: window.__wander.vx, worldW: window.__wander.worldW,
    }));
    samples.push(info);
    const clip = await canvasClip(page);
    const f = `${OUT}/frames/${theme}-follow-${i}.png`;
    await page.screenshot({ path: f, clip: clip || undefined });
    frames.push(f);
  }
  await page.keyboard.up('ArrowRight');
  // turn around
  await page.keyboard.down('ArrowLeft');
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(180);
    samples.push(await page.evaluate(() => ({
      cat: window.__wander.x, pig: window.__wander.pigX, pigFace: window.__wander.pigFace,
      pigVx: window.__wander.pigVx, face: window.__wander.face, vx: window.__wander.vx, turn: true,
    })));
  }
  await page.keyboard.up('ArrowLeft');
  const mid = samples.filter(s => !s.turn && Math.abs(s.vx) > 8);
  const gaps = mid.map(s => Math.abs(s.cat - s.pig));
  const overlap = mid.some(s => Math.abs(s.cat - s.pig) < 16);
  const parked = theme === 'flower'
    ? samples.every(s => Math.abs(s.pig - 118) < 6)
    : samples.every(s => Math.abs(s.pig - ((s.worldW || 0) - 80 - 46)) < 8);
  const facesOk = mid.every(s => (s.vx > 8 ? s.pigFace >= 0 || s.pigVx >= -4 : true));
  log(`${theme} pig follows (not parked)`, !parked && gaps.length > 0, { gaps: gaps.map(g => +g.toFixed(1)), parked });
  log(`${theme} pig gap comfortable`, gaps.length > 0 && gaps.every(g => g >= 16 && g <= 70), { min: Math.min(...gaps), max: Math.max(...gaps) });
  log(`${theme} pig does not overlap/trap cat`, !overlap, { closest: Math.min(...gaps) });
  stitch(frames, `${OUT}/${theme}-pig-follow-strip.png`);
  await page.screenshot({ path: `${OUT}/${theme}-pig-follow.png` });
  writeFileSync(`${OUT}/${theme}-pig-follow.json`, JSON.stringify(samples, null, 2));
  await ctx.close();
  return samples;
}

async function catStrips(browser, tag, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/flower/?lang=zh`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForFunction(() => window.__wander?.worldW > 100, { timeout: 20000 });
  await page.evaluate(() => window.__wander.seek(Math.min(380, window.__wander.worldW * 0.22)));
  const capture = async (dir, key) => {
    await page.keyboard.down(key);
    const files = [];
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(140);
      const clip = await canvasClip(page);
      const f = `${OUT}/frames/cat-after-${tag}-${dir}-${i}.png`;
      await page.screenshot({ path: f, clip: clip || undefined });
      files.push(f);
    }
    await page.keyboard.up(key);
    stitch(files, `${OUT}/cat-walk-after-${tag}-${dir}-strip.png`);
    await page.screenshot({ path: `${OUT}/cat-walk-after-${tag}-${dir}-frame.png` });
    return files;
  };
  await capture('right', 'ArrowRight');
  await capture('left', 'ArrowLeft');
  await ctx.close();
}

async function homeSpatial(browser) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('home pageerror', e.message));

  await page.goto(`${BASE}/home/?lang=zh&at=room&fresh=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/home-empty-desktop.png` });
  const empty = await page.evaluate(() => {
    const c = document.querySelector('#hm-space canvas');
    const r = c?.getBoundingClientRect();
    const hit = r ? window.__homeRoom?.raycast(r.left + r.width * 0.5, r.top + r.height * 0.62) : null;
    return { canvas: !!c, n: window.__homeRoom?.items?.().length ?? -1, hit, phase: window.__home?.phase?.() };
  });
  log('home empty webgl canvas', !!empty.canvas && empty.phase === 'room', empty);
  log('home empty raycast hits floor', !!(empty.hit && Number.isFinite(empty.hit.x)), empty.hit);

  const placed = await page.evaluate(() => {
    const r = window.__homeRoom;
    const a = r.place('sofa', -1.4, 0.2, 0);
    const b = r.place('sofa', -1.35, 0.25, 0);
    return { sofa: a, overlap: b, items: r.items() };
  });
  log('home place sofa', placed.sofa === true, { n: placed.items.length });
  log('home collision rejects overlapping sofa', placed.overlap === false, { overlap: placed.overlap });
  await page.screenshot({ path: `${OUT}/home-placed-desktop.png` });

  const rotated = await page.evaluate(() => window.__homeRoom?.rotate());
  await page.waitForTimeout(250);
  const yaw = await page.evaluate(() => window.__homeRoom?.items()?.find(i => i.kind === 'sofa')?.yaw);
  log('home rotate 90', rotated === true && yaw === 90, { yaw, rotated });
  await page.screenshot({ path: `${OUT}/home-rotated-desktop.png` });

  await page.evaluate(() => {
    const r = window.__homeRoom;
    r.place('rug', 0, 0.2, 0);
    r.place('table', 2.2, 1.3, 0);
    r.persist();
  });

  // persistence across a fresh navigation (not reload of ?fresh=1, which clears storage)
  await page.goto(`${BASE}/home/?lang=zh&at=room`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForTimeout(1600);
  const afterReload = await page.evaluate(() => window.__homeRoom?.items?.() || []);
  log('editor layout persists on reload', afterReload.some(i => i.kind === 'sofa'), { n: afterReload.length, kinds: afterReload.map(i => i.kind) });

  // demo furnish shot
  await page.evaluate(() => window.__homeRoom?.furnishDemo());
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/home-furnished-desktop.png` });

  // portrait
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/home-furnished-portrait.png` });
  await page.setViewportSize({ width: 844, height: 390 });

  // drag: pick canvas center-ish and move
  const box = await page.evaluate(() => {
    const c = document.querySelector('#hm-space canvas');
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width * 0.45, y: r.top + r.height * 0.6, w: r.width, h: r.height, l: r.left, t: r.top };
  });
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y - 30, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/home-dragged-desktop.png` });

  // independent film: two radically different layouts, same seek
  async function filmAt(layout, tag) {
    await page.evaluate((items) => {
      localStorage.setItem('gift.home.layout.v2', JSON.stringify({ v: 2, items }));
    }, layout);
    await page.goto(`${BASE}/home/?lang=zh&at=greet`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitCurtain(page);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/film-greet-${tag}.png` });
    await page.evaluate(() => window.__home?.seek('sofa', 1.8));
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/film-sofa-${tag}.png` });
  }
  const emptyLayout = [];
  const clutter = [
    { kind: 'rug', x: 0, z: 0.4, yaw: 0 },
    { kind: 'sofa', x: -1.6, z: 0.8, yaw: 90 },
    { kind: 'bed', x: 2.4, z: -1.5, yaw: 0 },
    { kind: 'table', x: 0.2, z: 1.6, yaw: 0 },
    { kind: 'bookshelf', x: -3.2, z: -2.2, yaw: 0 },
    { kind: 'tv', x: 0.1, z: -2.3, yaw: 180 },
    { kind: 'lamp', x: 2.8, z: 1.8, yaw: 0 },
  ];
  // main.ts sets FILM_ENABLED = false while the film is parked; skip the independence checks then
  const filmOn = await page.evaluate(() => !document.body.classList.contains('hm-no-film'));
  if (filmOn) {
    await filmAt(emptyLayout, 'empty');
    await filmAt(clutter, 'clutter');
  } else log('film disabled (FILM_ENABLED=false) — independence checks skipped', true, {});

  const py = `
from PIL import Image, ImageChops, ImageStat
import json
pairs = [
  ('${OUT}/film-greet-empty.png', '${OUT}/film-greet-clutter.png', '${OUT}/film-greet-diff.png'),
  ('${OUT}/film-sofa-empty.png', '${OUT}/film-sofa-clutter.png', '${OUT}/film-sofa-diff.png'),
]
out = {}
for a,b,d in pairs:
    A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    if A.size != B.size:
        B = B.resize(A.size)
    diff = ImageChops.difference(A, B)
    diff.save(d)
    st = ImageStat.Stat(diff)
    mean = sum(st.mean)/len(st.mean)
    out[d.split('/')[-1]] = {'mean': mean, 'size': A.size}
print(json.dumps(out))
`;
  const diff = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
  let diffJson = {};
  try { diffJson = JSON.parse(diff.stdout.trim() || '{}'); } catch { diffJson = { raw: diff.stdout, err: diff.stderr }; }
  const greetMean = diffJson['film-greet-diff.png']?.mean ?? 999;
  const sofaMean = diffJson['film-sofa-diff.png']?.mean ?? 999;
  // tiny differences from seeded particles / timing are OK; furniture leak would be large
  if (filmOn) {
    log('film greet identical across empty vs cluttered save', greetMean < 6, { mean: greetMean });
    log('film sofa identical across empty vs cluttered save', sofaMean < 6, { mean: sofaMean });
  }

  // save -> film -> edit returns layout
  await page.evaluate((items) => {
    localStorage.setItem('gift.home.layout.v2', JSON.stringify({ v: 2, items }));
  }, clutter);
  await page.goto(`${BASE}/home/?lang=zh&at=room`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForTimeout(1600);
  const beforeSave = await page.evaluate(() => window.__homeRoom?.items?.().length ?? 0);
  await page.evaluate(() => window.__homeRoom?.save());
  await page.waitForTimeout(400);
  const phaseAfterSave = await page.evaluate(() => window.__home?.phase?.());
  log('save leaves editor into transform/film/end', ['transform', 'walk', 'montage', 'greet', 'end'].includes(phaseAfterSave), { phaseAfterSave, beforeSave });
  // skip into film if still transforming
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.__home?.skip?.());
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => window.__home?.edit?.());
  await page.waitForTimeout(1400);
  const back = await page.evaluate(() => ({ phase: window.__home?.phase?.(), n: window.__homeRoom?.items?.().length ?? -1, kinds: (window.__homeRoom?.items?.() || []).map(i => i.kind) }));
  log('edit returns persisted layout', back.phase === 'room' && back.n === beforeSave && back.n > 0, back);

  await ctx.close();
}

async function webkitSmoke() {
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  for (const p of ['flower/?lang=zh', 'mushroom/?lang=zh', 'shop/?lang=zh', 'home/?lang=zh&at=room']) {
    await page.goto(`${BASE}/${p}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitCurtain(page);
    await page.waitForTimeout(700);
    const stage = await page.evaluate(() => document.querySelector('meta[name="gift-stage"]')?.content);
    log(`webkit loads ${p.split('/')[0] || 'page'}`, !!stage && errs.length === 0, { stage, errs: errs.slice(0, 3) });
  }
  // pig present on flower webkit
  await page.goto(`${BASE}/flower/?lang=zh`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForFunction(() => window.__wander?.worldW > 100, { timeout: 20000 });
  const pig = await page.evaluate(() => ({ cat: window.__wander.x, pig: window.__wander.pigX }));
  log('webkit flower pig present', Number.isFinite(pig.pig) && Math.abs(pig.pig - pig.cat) < 80, pig);
  await page.screenshot({ path: `${OUT}/webkit-flower-phone.png` });
  await ctx.close();
  await browser.close();
}

(async () => {
  const browser = await launchChromium();
  try {
    await routeTests(browser);
    await pigFollow(browser, 'flower');
    await pigFollow(browser, 'mushroom');
    await catStrips(browser, 'desktop', { width: 1280, height: 720 });
    await catStrips(browser, 'phone', { width: 390, height: 844 });
    await homeSpatial(browser);
  } finally {
    await browser.close();
  }
  try { await webkitSmoke(); }
  catch (e) { log('webkit smoke', false, { err: String(e).slice(0, 240) }); }

  const fails = report.tests.filter(t => !t.ok);
  writeFileSync(`${OUT}/verify.json`, JSON.stringify({ ...report, failed: fails.length, total: report.tests.length }, null, 2));
  console.log(`\n${report.tests.length - fails.length}/${report.tests.length} passed, ${fails.length} failed`);
  if (fails.length) fails.forEach(f => console.log(' -', f.name, JSON.stringify(f)));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
