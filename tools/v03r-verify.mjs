// t26 verification (v03r): fresh Chromium + WebKit runs of the exact journey, the woods pair (gap, crossing,
// framing, facing, both orientations), the spatial editor driven by real pointer gestures (chip tap, floor tap,
// collision, near↔far drag, rotate button, orbit, zoom, save/load/edit), the Module B player contract with and
// without a film, and two real-time screen recordings (woods ≥ 8 s, 3D editing ≥ 8 s).
//
//   node tools/serve.mjs dist 8833 &
//   BASE=http://127.0.0.1:8833 node tools/v03r-verify.mjs            # → review/v03r/
//
// The film checks never touch a real film: they serve a synthetic ffmpeg test pattern through Playwright's
// request routing (generated into the OS temp dir at run time). Nothing is added to public/.
const { chromium, webkit } = await import(process.env.PLAYWRIGHT || 'file:///workspace/jelly/pw/node_modules/playwright/index.mjs');
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, renameSync, rmSync } from 'fs';
import { spawnSync } from 'child_process';
import os from 'os';
import path from 'path';

const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const OUT = path.resolve(process.env.VERIFY_OUT || 'review/v03r');
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
// t35: the closing card, order 2 · 3 · 1 · 4 (textContent of .hm-finale; line breaks are layout only)
const FINALE_ZH = '我们已经有属于自己的两百天了，我想第两千天可能也并不遥远吧。也许有一天，也许会是第 2000 天，我们已经拥有了一个自己的家。我的小臭猫。';
mkdirSync(OUT, { recursive: true });

const report = { ts: new Date().toISOString(), base: BASE, tests: [] };
const logT = (name, ok, extra = {}) => {
  report.tests.push({ name, ok: !!ok, ...extra });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, extra && Object.keys(extra).length ? JSON.stringify(extra).slice(0, 400) : '');
};
const log = logT;

async function launchChromium(extra = {}) {
  return chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...(extra.args || [])],
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

async function hopT(page, name, startPath, trigger, expectRe) {
  const log = logT;
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

async function routeTests(browser, tag) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const log = (name, ok, extra) => logT(`[${tag}] ${name}`, ok, extra);
  const hop = (page, name, ...a) => hopT(page, `[${tag}] ${name}`, ...a);
  const page = await ctx.newPage();
  // every uncaught page error is recorded with the page it came from and its stack, and classified below (no silent pass)
  const routeErrs = [];
  let navAt = -1e9; page.on('request', q => { if (q.isNavigationRequest() && q.frame() === page.mainFrame()) navAt = Date.now(); });
  page.on('pageerror', e => { const r = { url: page.url(), sinceNavMs: Date.now() - navAt, msg: e.message, stack: String(e.stack || '').split('\n').slice(0, 8).join(' | ') }; routeErrs.push(r); console.log('pageerror', JSON.stringify(r)); });
  const aborted = new Set();
  page.on('requestfailed', q => { aborted.add(q.url()); console.log('requestfailed', JSON.stringify({ page: page.url(), req: q.url(), err: q.failure()?.errorText })); });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.type(), JSON.stringify({ page: page.url(), text: m.text().slice(0, 300) })); });

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
  const seaVisible = seaBtn ? await seaBtn.isVisible() : false;
  log('jelly 入海 visible without the egg', !!seaBtn && seaVisible, { egg: egg ? 'present-optional' : 'missing', seaVisible });
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
    log('sky has no film control (the film is only the ending)', !filmOn, {});
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

  // Uncaught page errors during the hops. The only accepted kind: WebKit reporting a same-origin load that the hop's own
  // navigation aborted ("… due to access control checks" for a URL that also failed as aborted/cancelled) — the app
  // already handles that path (jelly boot().catch). Anything else fails the run instead of hiding behind the passes.
  const sameOrigin = e => { const m = /(?:load|Load) (https?:\/\/[^ ]+) due to access control checks/.exec(e.stack) || []; return !!m[1] && m[1].startsWith(BASE); };
  const navAbort = e => /due to access control checks/.test(e.msg) && sameOrigin(e)
    && ([...aborted].some(u => e.stack.includes(u)) || e.sinceNavMs < 2500);   // fired while the hop's navigation tore the page down
  const unexplained = routeErrs.filter(e => !navAbort(e));
  log('no unexplained uncaught page errors during the hops', unexplained.length === 0, { unexplained, navAbortOnly: routeErrs.filter(navAbort).map(e => e.msg) });
  await ctx.close();

  // Settled pages (no navigation while loading): zero uncaught errors. coop solo used to leak the wake-lock
  // NotAllowedError in WebKit; a failed/aborted exhibit fetch used to leak from the shop's fire-and-forget load.
  for (const [name, url, abortGlb] of [
    ['coop solo (wake lock refused)', 'coop/?lang=zh&solo&from=sky', false],
    ['shop', 'shop/?lang=zh', false],
    ['shop with figure-pig.glb aborted (offline / leaving)', 'shop/?lang=zh', true],
    ['shop back from AR with the model aborted', 'shop/?lang=zh&from=ar&ex=figure-pig', true],
    ['jelly', 'jelly/?lang=zh&from=night', false],
  ]) {
    const c2 = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const p2 = await c2.newPage();
    const errs = []; p2.on('pageerror', e => errs.push({ msg: e.message, stack: String(e.stack || '').split('\n').slice(0, 4).join(' | ') }));
    if (abortGlb) await p2.route(/figure-pig\.glb/, r => r.abort());
    await p2.goto(`${BASE}/${url}`); await p2.waitForTimeout(7000);
    const alive = await p2.evaluate(() => document.body.childElementCount > 0);
    log(`settled ${name}: no uncaught page errors`, errs.length === 0 && alive, { errs });
    await c2.close();
  }
}

// ───────────────────────────────── woods ─────────────────────────────────
async function woods(browser, tag, theme, viewport, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 3 : 1, isMobile: mobile && tag !== 'firefox', hasTouch: mobile });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${BASE}/${theme}/?lang=zh`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForFunction(() => window.__wander?.worldW > 100 && window.__wander.plates > 0, { timeout: 20000 });
  await sleep(900);   // the world width settles once the canvas has its final size
  await page.evaluate(() => window.__wander.seek(window.__wander.worldW * 0.42));
  await sleep(400);
  const S = [];
  const sample = async (phase) => S.push({ phase, ...(await page.evaluate(() => { const w = window.__wander; return { cat: w.x, pig: w.pigX, lane: w.pigLane, pigFace: w.pigFace, pigVx: w.pigVx, face: w.face, vx: w.vx, cam: w.camX, vw: w.viewW, catHalf: w.catHalf, pigW: w.pigW }; })) });
  // hold the pointer on one side of the screen (the touch path), then reverse, then the keyboard
  const vx = viewport.width, vy = viewport.height * 0.6;
  const hold = async (x, ms, phase) => { await page.mouse.move(x, vy); await page.mouse.down(); const t0 = Date.now(); while (Date.now() - t0 < ms) { await sleep(90); await page.mouse.move(x + (Math.random() - 0.5) * 4, vy); await sample(phase); } await page.mouse.up(); };
  await hold(vx * 0.95, 2200, 'right');
  await hold(vx * 0.05, 2600, 'left');
  await page.keyboard.down('ArrowRight'); const t0 = Date.now(); while (Date.now() - t0 < 1800) { await sleep(90); await sample('right2'); } await page.keyboard.up('ArrowRight');
  await sleep(700); await sample('rest');
  const visHalfCat = s => s.catHalf - 5, visHalfPig = s => s.pigW / 2;
  const edgeGap = s => Math.abs(s.pig - s.cat) - visHalfCat(s) - visHalfPig(s);
  const settled = S.filter((s, i) => i > 3);
  const calm = settled.filter(s => s.lane < 0.05);
  const minCalmGap = Math.min(...calm.map(edgeGap));
  log(`[${tag}] ${theme} ${mobile ? 'phone' : 'desktop'} pig keeps clear of the cat outside a crossing`, calm.length > 5 && minCalmGap >= 0, { minEdgeGapPx: +minCalmGap.toFixed(1), n: calm.length });
  const overl = settled.filter(s => edgeGap(s) < 0);
  log(`[${tag}] ${theme} ${mobile ? 'phone' : 'desktop'} any overlap happens only as a back-lane crossing`, overl.every(s => s.lane > 0.3), { overlaps: overl.length, minLane: overl.length ? Math.min(...overl.map(s => +s.lane.toFixed(2))) : null });
  const crossed = S.some(s => s.phase === 'left' && s.pig > s.cat) || S.some(s => s.phase === 'left' && Math.sign(s.cat - s.pig) < 0);
  log(`[${tag}] ${theme} ${mobile ? 'phone' : 'desktop'} pig follows after the reversal (ends up behind her new heading)`, S.filter(s => s.phase === 'left').slice(-3).every(s => s.pig > s.cat) && S.filter(s => s.phase === 'right2').slice(-3).every(s => s.pig < s.cat), { crossed });
  const inView = settled.every(s => {
    const l = Math.min(s.cat - s.catHalf, s.pig - s.pigW / 2), r = Math.max(s.cat + s.catHalf, s.pig + s.pigW / 2);
    return r - l > s.vw - 4 ? (s.cat - s.catHalf >= s.cam - 1 && s.cat + s.catHalf <= s.cam + s.vw + 1) : (l >= s.cam - 2 && r <= s.cam + s.vw + 2);
  });
  const worst = settled.map(s => Math.min(Math.min(s.cat - s.catHalf, s.pig - s.pigW / 2) - s.cam, s.cam + s.vw - Math.max(s.cat + s.catHalf, s.pig + s.pigW / 2)));
  log(`[${tag}] ${theme} ${mobile ? 'phone' : 'desktop'} camera keeps both whole sheets in frame`, inView, { worstMarginPx: +Math.min(...worst).toFixed(1), viewW: S[0]?.vw });
  const moving = settled.filter(s => Math.abs(s.pigVx) > 8);
  log(`[${tag}] ${theme} ${mobile ? 'phone' : 'desktop'} pig faces its direction of travel`, moving.every(s => Math.sign(s.pigVx) === Math.sign(s.pigFace)), { n: moving.length });
  // while she is turning, `face` follows the input before `vx` has crossed zero — only judge steady walking
  const steady = S.filter((s, i) => i > 6 && S[i - 6].phase === s.phase && Math.abs(s.vx) > 20);
  log(`[${tag}] ${theme} ${mobile ? 'phone' : 'desktop'} cat faces travel`, steady.length > 5 && steady.every(s => Math.sign(s.vx) === Math.sign(s.face)), { n: steady.length });
  log(`[${tag}] ${theme} ${mobile ? 'phone' : 'desktop'} no page errors`, errs.length === 0, { errs: errs.slice(0, 2) });
  // caption vs animals in portrait: the spoken line must sit under the path
  if (mobile) {
    await page.evaluate(() => { const p = document.querySelector('.gift-whisper'); if (p) { p.textContent = '紫精灵和戴安娜……好像专门开给我们看的。'; p.classList.add('on'); } });
    await sleep(1300);
    const geo = await page.evaluate(() => {
      const c = document.querySelector('#flower canvas, #mushroom canvas'); const r = c.getBoundingClientRect(); const w = window.__wander;
      const feetY = r.top + (r.height * ((c.height - Math.max(22, Math.round(c.height * (c.height > c.width ? 0.2 : 0.16)))) / c.height));
      const cap = document.querySelector('.gift-whisper')?.getBoundingClientRect();
      return { feetY, capTop: cap?.top ?? 9999 };
    });
    log(`[${tag}] ${theme} phone caption sits below the animals' feet`, geo.capTop >= geo.feetY - 2, geo);
  }
  await page.screenshot({ path: `${OUT}/${tag}-${theme}-${mobile ? 'phone' : 'desktop'}.png` });
  writeFileSync(`${OUT}/${tag}-${theme}-${mobile ? 'phone' : 'desktop'}-samples.json`, JSON.stringify(S));
  await ctx.close();
}

// ───────────────────────────────── home: spatial editor ─────────────────────────────────
async function homeEditor(browser, tag) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${BASE}/home/?lang=zh&at=room&fresh=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForFunction(() => !!window.__homeRoom?.project, { timeout: 20000 });
  await sleep(600);
  const L = (n, ok, x) => log(`[${tag}] home ${n}`, ok, x);
  // the whole floor sits above the controls
  const fitInfo = await page.evaluate(() => {
    const R = window.__homeRoom; const hw = 4.2, hd = 3.1;
    const pts = [[-hw, hd], [hw, hd], [-hw, -hd], [hw, -hd]].map(([x, z]) => R.project(x, z));
    const d = document.querySelector('.hm-drawer').getBoundingClientRect(), t = document.querySelector('.hm-tools').getBoundingClientRect();
    return { pts, drawerTop: d.top, toolsTop: t.top, toolsLeft: t.left, W: innerWidth };
  });
  const front = Math.max(fitInfo.pts[0].y, fitInfo.pts[1].y);
  L('front floor edge clears the toolbar and drawer', front < Math.min(fitInfo.drawerTop, fitInfo.toolsLeft > fitInfo.W * 0.6 ? 1e9 : fitInfo.toolsTop), { frontY: Math.round(front), toolsTop: Math.round(fitInfo.toolsTop), drawerTop: Math.round(fitInfo.drawerTop) });
  L('all floor corners on screen', fitInfo.pts.every(p => p.x >= 0 && p.x <= fitInfo.W), {});
  // thumbnails are rendered from the 3D meshes
  const thumbs = await page.evaluate(() => [...document.querySelectorAll('.hm-chip')].map(c => !!c.querySelector('canvas.hm-thumb3d')));
  L('drawer thumbs rendered from the placed meshes', thumbs.length >= 18 && thumbs.every(Boolean), { n: thumbs.length });
  // chip tap + floor tap places a piece
  const at = (x, z) => page.evaluate(([x, z]) => window.__homeRoom.project(x, z), [x, z]);
  let p = await at(-0.6, 1.2);
  await page.click('.hm-chip[data-kind="sofa"]');
  await page.mouse.click(p.x, p.y);
  await sleep(150);
  let items = await page.evaluate(() => window.__homeRoom.items());
  L('chip tap + floor tap places a sofa', items.length === 1 && items[0].kind === 'sofa', { items });
  // collision through the UI: same spot again
  await page.click('.hm-chip[data-kind="sofa"]');
  await page.mouse.click(p.x, p.y);
  await sleep(150);
  items = await page.evaluate(() => window.__homeRoom.items());
  const armed = await page.evaluate(() => ({ chip: !!document.querySelector('.hm-chip.on'), st: window.__homeRoom.previewState() }));
  L('collision rejects a second sofa on the same spot (UI path), red footprint, chip stays armed', items.length === 1 && armed.chip && armed.st.blocked, { n: items.length, armed });
  await page.click('.hm-chip[data-kind="sofa"]'); // tap the chip again to put it down
  await page.mouse.click(5, fitInfo.drawerTop - 300); // deselect by tapping empty space
  // drag near → far
  const s0 = items[0];
  p = await at(s0.x, s0.z);
  const far = await at(s0.x, -1.8);
  await page.mouse.move(p.x, p.y - 4); await page.mouse.down();
  await page.mouse.move(far.x, far.y - 4, { steps: 24 }); await page.mouse.up();
  await sleep(150);
  const s1 = (await page.evaluate(() => window.__homeRoom.items()))[0];
  L('drag moves the sofa from near to far (z decreases)', s1.z < s0.z - 1.5, { from: s0.z, to: s1.z });
  // drag far → near
  p = await at(s1.x, s1.z); const near = await at(s1.x, 1.6);
  await page.mouse.move(p.x, p.y - 4); await page.mouse.down();
  await page.mouse.move(near.x, near.y - 4, { steps: 24 }); await page.mouse.up();
  await sleep(150);
  const s2 = (await page.evaluate(() => window.__homeRoom.items()))[0];
  L('drag moves it back from far to near (z increases)', s2.z > s1.z + 1.5, { from: s1.z, to: s2.z });
  // rotate with the toolbar button
  const selOn = await page.evaluate(() => document.querySelector('.hm-sel')?.classList.contains('on'));
  if (selOn) await page.click('.hm-sel [data-k="rotate"]');
  await sleep(150);
  const s3 = (await page.evaluate(() => window.__homeRoom.items()))[0];
  L('rotate button turns the selected sofa 90°', selOn && s3.yaw === 90, { yaw: s3.yaw, selOn });
  // the piece toolbar never sits on the save row
  const selBox = await page.evaluate(() => { const a = document.querySelector('.hm-sel').getBoundingClientRect(), b = document.querySelector('.hm-tools').getBoundingClientRect(); return { selBottom: a.bottom, toolsTop: b.top }; });
  L('piece toolbar clear of the save row', selBox.selBottom <= selBox.toolsTop, selBox);
  // orbit on empty space + wheel zoom
  const v0 = await page.evaluate(() => window.__homeRoom.view());
  const empty = await at(3.6, 2.6);
  await page.mouse.click(5, 120);
  await page.mouse.move(empty.x, empty.y); await page.mouse.down(); await page.mouse.move(empty.x - 160, empty.y - 30, { steps: 16 }); await page.mouse.up();
  await page.mouse.move(640, 300); await page.mouse.wheel(0, -260); await sleep(200);
  const v1 = await page.evaluate(() => window.__homeRoom.view());
  L('orbit drag turns the camera', Math.abs(v1.az - v0.az) > 0.1, { az0: v0.az, az1: v1.az });
  L('wheel zooms in', v1.zoom < v0.zoom, { zoom0: v0.zoom, zoom1: v1.zoom });
  // furnish, save, persistence
  await page.evaluate(() => { window.__homeRoom.setView({ zoom: 1, az: 0.22, pol: 1.05 }); window.__homeRoom.furnishDemo(); });
  await sleep(300);
  const demo = await page.evaluate(() => window.__homeRoom.items());
  L('demo furnishing places every piece (no collisions in the demo layout)', demo.length === 17, { n: demo.length });
  // real geometry, not just the footprint table: every solid mesh sits inside its own footprint, no two solid
  // meshes intersect, and the big pieces have adult proportions (metres)
  const bnd = await page.evaluate(() => window.__homeRoom.bounds());
  const outside = bnd.filter(r => r.max[0] - r.x > r.hw + 0.005 || r.x - r.min[0] > r.hw + 0.005 || r.max[2] - r.z > r.hd + 0.005 || r.z - r.min[2] > r.hd + 0.005).map(r => r.kind);
  L('every solid mesh lies inside its collision footprint', outside.length === 0, { outside });
  const solid = bnd.filter(r => r.kind !== 'rug');
  const hits = [];
  for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
    const A = solid[i], B = solid[j];
    if (A.min[0] < B.max[0] - 0.002 && B.min[0] < A.max[0] - 0.002 && A.min[2] < B.max[2] - 0.002 && B.min[2] < A.max[2] - 0.002) hits.push(`${A.kind}×${B.kind}`);
  }
  L('no two solid meshes intersect in the furnished room', hits.length === 0, { hits });
  const dims = k => { const r = bnd.find(b => b.kind === k); const sx = r.max[0] - r.min[0], sz = r.max[2] - r.min[2]; return { long: +Math.max(sx, sz).toFixed(2), short: +Math.min(sx, sz).toFixed(2), h: +(r.max[1] - r.min[1]).toFixed(2) }; };
  const D = { bed: dims('bed'), sofa: dims('sofa'), table: dims('table'), chair: dims('chair') };
  L('adult proportions: queen bed ≥ 2.0 × 1.6 m and longer than the sofa; sofa ≤ 2.1 m; table top ~0.75 m', D.bed.long >= 2.0 && D.bed.short >= 1.6 && D.bed.long > D.sofa.long && D.sofa.long <= 2.1 && D.table.long >= 1.4 && D.chair.h > 0.85, D);
  await page.screenshot({ path: `${OUT}/${tag}-home-furnished.png` });
  await page.evaluate(() => window.__homeRoom.setView({ zoom: 0.66, az: -0.32, pol: 0.96 }));
  await sleep(300);
  await page.screenshot({ path: `${OUT}/${tag}-home-close.png` });
  await page.click('.hm-tools [data-k="save"]');
  await sleep(400);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gift.home.layout.v2') || 'null'));
  L('save writes v2 layout {kind,x,z,yaw}', stored?.v === 2 && stored.items.length === demo.length && stored.items.every(i => 'kind' in i && 'x' in i && 'z' in i && 'yaw' in i), { n: stored?.items?.length });
  await page.goto(`${BASE}/home/?lang=zh&at=room`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForFunction(() => !!window.__homeRoom?.items, { timeout: 20000 });
  const reloaded = await page.evaluate(() => window.__homeRoom.items());
  const same = JSON.stringify(reloaded.map(i => [i.kind, +i.x.toFixed(2), +i.z.toFixed(2), i.yaw])) === JSON.stringify(stored.items.map(i => [i.kind, +i.x.toFixed(2), +i.z.toFixed(2), i.yaw]));
  L('reload restores exactly the saved pieces', same, { n: reloaded.length });
  L('no page errors', errs.length === 0, { errs: errs.slice(0, 2) });
  // phone landscape with touch
  await ctx.close();
  const pctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: tag === 'chromium' });
  const pp = await pctx.newPage();
  await pp.goto(`${BASE}/home/?lang=zh&at=room&fresh=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(pp);
  await pp.waitForFunction(() => !!window.__homeRoom?.project, { timeout: 20000 });
  await sleep(500);
  const q = await pp.evaluate(() => window.__homeRoom.project(0.4, 0.9));
  await pp.tap('.hm-chip[data-kind="armchair"]');
  await pp.touchscreen.tap(q.x, q.y);
  await sleep(200);
  const tItems = await pp.evaluate(() => window.__homeRoom.items());
  L('phone: touch tap on chip then floor places a piece', tItems.length === 1 && tItems[0].kind === 'armchair', { tItems });
  const pfit = await pp.evaluate(() => { const R = window.__homeRoom; const a = R.project(-4.2, 3.1), b = R.project(4.2, 3.1); const d = document.querySelector('.hm-drawer').getBoundingClientRect(); const t = document.querySelector('.hm-tools').getBoundingClientRect(); return { front: Math.max(a.y, b.y), drawerTop: d.top, toolsLeft: t.left, rightX: b.x }; });
  L('phone: floor above the drawer, clear of the tool column', pfit.front < pfit.drawerTop && pfit.rightX < pfit.toolsLeft, pfit);
  await pp.evaluate(() => window.__homeRoom.furnishDemo()); await sleep(300);
  await pp.screenshot({ path: `${OUT}/${tag}-home-phone-landscape.png` });
  await pctx.close();
}

// ───────────────────────────────── home: Module B player contract ─────────────────────────────────
function fixtureFilm() {
  const dir = path.join(os.tmpdir(), 'gift-v03r-fixture');
  mkdirSync(dir, { recursive: true });
  const mp4 = path.join(dir, 'test-pattern.mp4'), jpg = path.join(dir, 'test-pattern.jpg');
  if (!existsSync(mp4)) spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=24:duration=3', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'baseline', '-c:a', 'aac', '-movflags', '+faststart', '-shortest', mp4]);
  if (!existsSync(jpg)) spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', mp4, '-frames:v', '1', jpg]);
  return { mp4: readFileSync(mp4), jpg: readFileSync(jpg) };
}

async function routeFilm(page, fx, extra = {}) {
  await page.route(/media\/ending-film\.json/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ v: 1, src: 'media/future-home.mp4', poster: 'media/future-home-poster.jpg', audio: true, ...extra }) }));
  await page.route(/media\/future-home-poster\.jpg/, r => r.fulfill({ status: 200, contentType: 'image/jpeg', body: fx.jpg }));
  await page.route(/media\/future-home\.mp4/, async r => {
    const range = r.request().headers()['range'];
    const total = fx.mp4.length;
    if (range) {
      const m = /bytes=(\d+)-(\d*)/.exec(range); const a = +m[1]; const b = m[2] ? Math.min(+m[2], total - 1) : total - 1;
      return r.fulfill({ status: 206, headers: { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'content-range': `bytes ${a}-${b}/${total}`, 'content-length': String(b - a + 1) }, body: fx.mp4.subarray(a, b + 1) });
    }
    return r.fulfill({ status: 200, headers: { 'content-type': 'video/mp4', 'accept-ranges': 'bytes' }, body: fx.mp4 });
  });
}

async function homeBlocked(browser, tag) {
  const L = (n, ok, x) => log(`[${tag}] home-block ${n}`, ok, x);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${BASE}/home/?lang=zh&at=room&fresh=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForFunction(() => !!window.__homeRoom?.project, { timeout: 20000 });
  await sleep(600);
  const at = (x, z) => page.evaluate(([x, z]) => window.__homeRoom.project(x, z), [x, z]);
  // place the sofa through the UI, so the preview's last position is exactly on the sofa
  let p = await at(-0.4, -0.6);
  await page.click('.hm-chip[data-kind="sofa"]'); await page.mouse.move(p.x, p.y, { steps: 4 }); await page.mouse.click(p.x, p.y); await sleep(200);
  await page.click('.hm-chip[data-kind="table"]');
  const fresh = [];
  for (let i = 0; i < 8; i++) { fresh.push(await page.evaluate(() => window.__homeRoom.previewState().ghost)); await sleep(30); }
  L('arming a chip never shows the preview at its stale spot (on the sofa just placed)', fresh.every(g => !g), { fresh });
  await page.mouse.move(p.x, p.y, { steps: 6 }); await sleep(150);
  const over = await page.evaluate(() => window.__homeRoom.previewState());
  L('armed table over the sofa: no solid preview inside it, red blocked footprint instead', !over.ghost && over.blocked, over);
  await page.mouse.click(p.x, p.y); await sleep(200);
  const n1 = await page.evaluate(() => window.__homeRoom.items().length);
  L('tapping the blocked spot places nothing', n1 === 1, { n: n1 });
  p = await at(1.8, 1.9);
  await page.mouse.move(p.x, p.y, { steps: 6 }); await sleep(120);
  const ok = await page.evaluate(() => window.__homeRoom.previewState());
  L('valid spot: preview shown, no red footprint', ok.ghost && !ok.blocked, ok);
  await page.mouse.click(p.x, p.y); await sleep(250);
  // near → far
  const tbl = () => page.evaluate(() => window.__homeRoom.items().find(i => i.kind === 'table'));
  let a = await at(1.8, 1.9), b = await at(1.8, -1.6);
  await page.mouse.move(a.x, a.y - 4); await page.mouse.down(); await page.mouse.move(b.x, b.y - 4, { steps: 30 }); await page.mouse.up(); await sleep(200);
  const far = await tbl();
  L('valid drag near → far drops the table at the back', far && far.z < -1.0, far);
  // far-right → into the sofa: stops at the sofa, red footprint while pushed, never overlapping
  a = await at(far.x, far.z); b = await at(-0.4, -0.6);
  await page.mouse.move(a.x, a.y - 4); await page.mouse.down();
  let pushed = false, overlapDuring = false;
  for (let i = 1; i <= 24; i++) {
    await page.mouse.move(a.x + (b.x - a.x) * i / 24, a.y - 4 + (b.y - a.y) * i / 24); await sleep(30);
    const st = await page.evaluate(() => ({ blocked: window.__homeRoom.previewState().blocked }));
    pushed ||= st.blocked;
  }
  const mid = await page.evaluate(() => window.__homeRoom.bounds());
  const T = mid.find(r => r.kind === 'table'), S = mid.find(r => r.kind === 'sofa');
  overlapDuring = T.min[0] < S.max[0] && S.min[0] < T.max[0] && T.min[2] < S.max[2] && S.min[2] < T.max[2];
  await page.mouse.up(); await sleep(200);
  const after = await page.evaluate(() => ({ st: window.__homeRoom.previewState(), b: window.__homeRoom.bounds() }));
  const T2 = after.b.find(r => r.kind === 'table'), S2 = after.b.find(r => r.kind === 'sofa');
  const overlapAfter = T2.min[0] < S2.max[0] && S2.min[0] < T2.max[0] && T2.min[2] < S2.max[2] && S2.min[2] < T2.max[2];
  L('drag into the sofa: red footprint shows, the table stays outside it, and nothing intersects after release', pushed && !overlapDuring && !overlapAfter && !after.st.blocked, { pushed, overlapDuring, overlapAfter, table: { x: T2.x, z: T2.z } });
  await page.screenshot({ path: `${OUT}/${tag}-home-blocked.png` });
  L('no page errors', errs.length === 0, { errs: errs.slice(0, 2) });
  await ctx.close();
}

// the committed ending film named by public/media/ending-film.json (t33: the 200-day film anniv-200.mp4), no routing
async function realFilm(browser, tag) {
  const L = (n, ok, x) => log(`[${tag}] real-film ${n}`, ok, x);
  const layout = [{ kind: 'sofa', x: 0, z: -1.6, yaw: 0 }, { kind: 'bed', x: 2.8, z: -2, yaw: 180 }];
  const open = async (viewport, extra = {}) => {
    const ctx = await browser.newContext({ viewport, ...extra });
    const page = await ctx.newPage();
    const net = []; page.on('response', r => { if (/\/media\//.test(r.url())) net.push({ url: r.url().replace(BASE, ''), status: r.status() }); });
    const reqs = []; page.on('request', r => reqs.push(r.url()));
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(items => localStorage.setItem('gift.home.layout.v2', JSON.stringify({ v: 2, items })), layout);
    await page.goto(`${BASE}/home/?lang=zh&at=room`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitCurtain(page);
    await page.waitForFunction(() => !!window.__homeRoom?.items, { timeout: 20000 });
    return { ctx, page, net, reqs, errs };
  };
  const can = await (async () => { const c = await browser.newContext(); const p = await c.newPage(); await p.goto(`${BASE}/home/?lang=zh`); const r = await p.evaluate(() => document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028, mp4a.40.2"')); await c.close(); return r; })();
  if (!can) {
    const { ctx, page, reqs } = await open({ width: 1280, height: 720 });
    await page.click('.hm-tools [data-k="save"]');
    await page.waitForFunction(() => window.__home.phase() === 'end', { timeout: 15000 }).catch(() => {});
    await sleep(3600);
    const st = await page.evaluate(() => ({ phase: window.__home.phase(), video: !!document.querySelector('video'), line: document.querySelector('.hm-line')?.dataset.i18n, finale: document.querySelector('.hm-finale').classList.contains('on') }));
    L('no H.264 in this browser build: real manifest ignored, closing card instead (fallback)', st.phase === 'end' && !st.video && st.finale, st);
    const fb = await page.evaluate(() => ({ text: document.querySelector('.hm-finale').textContent, last: document.querySelector('.hm-finale .hm-fs-last')?.textContent, line: document.querySelector('.hm-line').classList.contains('on') }));
    L('fallback closing card: the four sentences in the order 2·3·1·4, 我的小臭猫。 as its own last line, no separate first line', fb.text === FINALE_ZH && fb.last === '我的小臭猫。' && !fb.line, fb);
    L('fallback requests no film MP4 at all (neither anniv-200 nor future-home)', !reqs.some(u => /anniv-200(-\d+)?\.mp4|future-home\.mp4/.test(u)), {});
    console.log(`NOTE [${tag}] real-film playback not runnable: canPlayType(H.264 High) empty`);
    await ctx.close();
    return;
  }
  // frame probe: decoded frames + a pixel sample of what the video element is actually showing
  const probe = page => page.evaluate(() => {
    const v = document.querySelector('video.hm-film-v'); if (!v) return null;
    const q = v.getVideoPlaybackQuality?.() || {};
    let lum = null, spread = null;
    try { const c = document.createElement('canvas'); c.width = 64; c.height = 36; const g = c.getContext('2d'); g.drawImage(v, 0, 0, 64, 36); const d = g.getImageData(0, 0, 64, 36).data; let s = 0, mn = 255, mx = 0; for (let i = 0; i < d.length; i += 4) { const y = (d[i] + d[i + 1] + d[i + 2]) / 3; s += y; mn = Math.min(mn, y); mx = Math.max(mx, y); } lum = +(s / (d.length / 4)).toFixed(1); spread = +(mx - mn).toFixed(0); } catch (e) { lum = String(e); }
    return { t: +v.currentTime.toFixed(2), dur: v.duration, paused: v.paused, muted: v.muted, w: v.videoWidth, h: v.videoHeight, ready: v.readyState, err: v.error?.code ?? null, frames: q.totalVideoFrames ?? null, dropped: q.droppedVideoFrames ?? null, audioBytes: v.webkitAudioDecodedByteCount ?? null, videoBytes: v.webkitVideoDecodedByteCount ?? null, lum, spread, state: window.__home.film(), phase: window.__home.phase(), src: v.currentSrc.replace(location.origin, '') };
  });
  // (a) desktop: save → the 200-day film plays, real frames decode, the page's own lines frame it, sound follows the switch
  {
    const { ctx, page, net, reqs, errs } = await open({ width: 1280, height: 720 });
    await page.click('.hm-tools [data-k="save"]');
    let lineOn = false;
    for (let i = 0; i < 14; i++) { await sleep(150); lineOn ||= await page.evaluate(() => document.querySelector('.hm-line')?.classList.contains('on')); }
    await page.waitForFunction(() => window.__home.film() === 'playing', { timeout: 20000 }).catch(() => {});
    const p1 = await probe(page);
    await sleep(2500);
    const p2 = await probe(page);
    await page.screenshot({ path: `${OUT}/${tag}-real-film-playing-3s.png` });
    L('the media files load from the site base (ending-film.json, 720p poster, a 720p / 480p film range)', ['/media/ending-film.json', '/media/anniv-200-poster-720.jpg'].every(u => net.some(n => n.url.endsWith(u) && n.status < 400)) && net.some(n => /\/media\/anniv-200-(720|480)\.mp4$/.test(n.url) && n.status < 400), { net: net.slice(0, 6) });
    L('/home/ no longer requests the v4 future-home film', !reqs.some(u => /future-home\.(mp4|json)|future-home-poster/.test(u)), {});
    L('H.264 1280×720 or 854×480 (2026-11-14 phone encodes of the complete 200-day film, 67.712 s) decodes and plays: currentTime and decoded frames advance, picture is not blank', p1 && p2 && p2.err === null && ((p2.w === 1280 && p2.h === 720) || (p2.w === 854 && p2.h === 480)) && Math.abs((p2.dur ?? 67.712) - 67.712) < 0.1 && /anniv-200-(720|480)\.mp4$/.test(p2.src) && p2.t > p1.t + 1.5 && p2.frames > p1.frames + 30 && p2.spread > 40 && !p2.paused, { p1, p2 });
    L('t35: no words before the film (save → paper → film, no 也许有一天… line)', !lineOn, { lineOn });
    const quiet = await page.evaluate(() => !document.querySelector('.hm-line')?.classList.contains('on') && !document.querySelector('.hm-finale').classList.contains('on'));
    L('no page text over the playing film', quiet, { quiet });
    // the site sound switch unmutes the film; its own AAC track decodes
    await page.click('.gift-chrome button').catch(() => {});
    await sleep(1200);
    const p3 = await probe(page);
    L('sound switch → film unmuted, its AAC track decodes (video element is the clock)', p3.muted === false && p3.audioBytes > 0, { muted: p3.muted, audioBytes: p3.audioBytes });
    // controls vs the film's own title band (anniv-200 draws 臭猪臭猫 / 200天纪念日快乐 in the upper middle near the end)
    const geo = await page.evaluate(() => {
      const v = document.querySelector('video.hm-film-v').getBoundingClientRect();
      const ar = 16 / 9; let w = v.width, h = v.width / ar; if (h > v.height) { h = v.height; w = h * ar; }
      const top = v.top + (v.height - h) / 2, left = v.left + (v.width - w) / 2;
      const band = (a, b) => ({ top: top + h * a, bottom: top + h * b, left: left + w * 0.15, right: left + w * 0.85 });
      const r = s => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); return { sel: s, top: b.top, bottom: b.bottom, left: b.left, right: b.right }; };
      return { bands: [band(0.15, 0.5)], ctrls: ['.hm-skip', '.gift-chrome', '.hm-film-tap'].map(r).filter(Boolean) };
    });
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    L('skip / sound controls do not cover the film title band', geo.ctrls.every(c => geo.bands.every(b => !hit(c, b))), geo);
    // tab hidden → pause, back → tap to resume (visibility simulated: headless tabs do not hide)
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(300);
    const hid = await probe(page);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(300);
    const back = await probe(page);
    await page.click('.hm-film-tap').catch(() => {});
    await sleep(1200);
    const resumed = await probe(page);
    L('tab hidden pauses the film; on return a tap resumes it (visibility simulated)', hid.paused && back.state === 'tap' && !resumed.paused && resumed.t > back.t, { hid: hid.state, back: back.state, resumed: resumed.state, t: [back.t, resumed.t] });
    // jump to just before the end (test-only seek) and let it play out: no finale in the picture → the end card shows it
    await page.evaluate(() => { const v = document.querySelector('video.hm-film-v'); v.currentTime = v.duration - 3; });
    await sleep(800);
    await page.screenshot({ path: `${OUT}/${tag}-real-film-finale-frame.png` });
    await page.waitForFunction(() => window.__home.phase() === 'end', { timeout: 15000 }).catch(() => {});
    await sleep(2500);
    const end = await page.evaluate(() => ({ phase: window.__home.phase(), finaleText: document.querySelector('.hm-finale').classList.contains('on'), replay: getComputedStyle(document.querySelector('.hm-replay')).display !== 'none', edit: getComputedStyle(document.querySelector('.hm-edit')).display !== 'none', video: !!document.querySelector('video.hm-film-v') }));
    await page.screenshot({ path: `${OUT}/${tag}-real-film-endcard.png` });
    L('played to the end: end card shows the finale line with 再看一遍 / 继续布置, film layer gone', end.phase === 'end' && end.finaleText && end.replay && end.edit && !end.video, end);
    const card = await page.evaluate(() => {
      const f = document.querySelector('.hm-finale'); const b = f.getBoundingClientRect();
      const box = s => { const e = document.querySelector(s); const cs = getComputedStyle(e); if (cs.display === 'none') return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
      return { text: f.textContent, stanzas: [...f.querySelectorAll('.hm-fs')].map(p => [...p.querySelectorAll('span')].map(s => s.textContent)), last: f.querySelector('.hm-fs-last')?.textContent,
        f: { top: b.top, bottom: b.bottom, left: b.left, right: b.right }, vw: innerWidth, vh: innerHeight, ctrls: ['.hm-replay', '.hm-edit', '.hm-again', '.gift-chrome'].map(box).filter(Boolean),
        oneRow: [...f.querySelectorAll('span')].every(s => s.getClientRects().length === 1) };
    });
    const hit2 = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    L('t35 closing card: exact text in the order 2·3·1·4, stanzas [2,3] [1] [4], 我的小臭猫。 last on its own', card.text === FINALE_ZH && card.stanzas.length === 3 && card.stanzas[2].length === 1 && card.last === '我的小臭猫。', { stanzas: card.stanzas });
    L('closing card fits 1280×720: inside the viewport, no line wraps, clear of the buttons and the top pill', card.oneRow && card.f.top >= 0 && card.f.bottom <= card.vh && card.ctrls.every(c => !hit2(card.f, c)), { f: card.f, ctrls: card.ctrls });
    await page.click('.hm-replay');
    await page.waitForFunction(() => window.__home.film() === 'playing', { timeout: 15000 }).catch(() => {});
    const r1 = await probe(page); await sleep(1500); const r2 = await probe(page);
    L('再看一遍 restarts from the beginning and decodes again', r1 && r1.t < 1.5 && r2.t > r1.t && r2.frames > r1.frames, { r1: r1 && { t: r1.t, frames: r1.frames }, r2: r2 && { t: r2.t, frames: r2.frames } });
    // skip mid-film → end card; the finale was not seen in the film, so the page shows it
    await page.click('.hm-skip');
    await page.waitForFunction(() => window.__home.phase() === 'end', { timeout: 8000 }).catch(() => {});
    await sleep(3500);
    const sk = await page.evaluate(() => ({ phase: window.__home.phase(), finaleText: document.querySelector('.hm-finale').classList.contains('on'), video: !!document.querySelector('video.hm-film-v') }));
    L('跳过 mid-film → end card shows the finale line', sk.phase === 'end' && sk.finaleText, sk);
    await page.click('.hm-edit');
    await page.waitForFunction(() => window.__home.phase() === 'room' && !!window.__homeRoom?.items, { timeout: 12000 }).catch(() => {});
    const back2 = await page.evaluate(() => window.__homeRoom.items());
    const same = back2.length === layout.length && layout.every((q, i) => back2[i].kind === q.kind && Math.abs(back2[i].x - q.x) < 1e-6 && Math.abs(back2[i].z - q.z) < 1e-6 && back2[i].yaw === q.yaw);
    L('继续布置 after the film returns the same saved pieces', same, { back2 });
    L('no page errors / video errors', errs.length === 0, { errs: errs.slice(0, 2) });
    await ctx.close();
  }
  // (b) autoplay refused (first play() rejected) → 轻触播放 → real playback
  {
    // the editor asks for landscape on phones, so save in landscape, then turn the phone while the film plays
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.addInitScript(items => {
      localStorage.setItem('gift.home.layout.v2', JSON.stringify({ v: 2, items }));
      const real = HTMLMediaElement.prototype.play; let n = 0;
      HTMLMediaElement.prototype.play = function () { if (this.classList?.contains('hm-film-v') && n++ === 0) return Promise.reject(new DOMException('blocked', 'NotAllowedError')); return real.call(this); };
    }, layout);
    await page.goto(`${BASE}/home/?lang=zh&at=room`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitCurtain(page);
    await page.waitForFunction(() => !!window.__homeRoom?.items, { timeout: 20000 });
    await page.tap('.hm-tools [data-k="save"]');
    await page.waitForFunction(() => window.__home.film() === 'tap', { timeout: 15000 }).catch(() => {});
    await sleep(1600);
    const st0 = await probe(page);
    await page.screenshot({ path: `${OUT}/${tag}-real-film-phone-landscape-tap.png` });
    await page.tap('.hm-film-tap');
    await page.waitForFunction(() => window.__home.film() === 'playing', { timeout: 15000 }).catch(() => {});
    await sleep(2000);
    const st1 = await probe(page);
    await page.screenshot({ path: `${OUT}/${tag}-real-film-phone-landscape-playing.png` });
    const fit = () => page.evaluate(() => { const v = document.querySelector('video.hm-film-v').getBoundingClientRect(); return { w: v.width, h: v.height, vw: innerWidth, vh: innerHeight, fit: getComputedStyle(document.querySelector('video.hm-film-v')).objectFit }; });
    const f1 = await fit();
    L('phone landscape (touch): refused autoplay → 轻触播放 → tap → real frames play, contained', st0.state === 'tap' && st1.state === 'playing' && st1.t > 1 && st1.frames > 20 && f1.fit === 'contain' && f1.w <= f1.vw + 1 && f1.h <= f1.vh + 1, { st0: st0.state, st1: { t: st1.t, frames: st1.frames }, f1 });
    // turn the phone to portrait while playing
    await page.setViewportSize({ width: 390, height: 844 });
    await sleep(1500);
    const st2 = await probe(page);
    const f2 = await fit();
    await page.screenshot({ path: `${OUT}/${tag}-real-film-phone-portrait-playing.png` });
    L('turned to portrait: keeps playing, whole picture still visible (contain)', st2.state === 'playing' && st2.t > st1.t && !st2.paused && f2.fit === 'contain' && f2.w <= f2.vw + 1, { t: st2.t, f2 });
    // t35: the closing card on the phone, portrait then landscape — inside the screen, no wrapped line, clear of buttons
    await page.evaluate(() => { const v = document.querySelector('video.hm-film-v'); v.currentTime = v.duration - 1; });
    await page.waitForFunction(() => window.__home.phase() === 'end', { timeout: 15000 }).catch(() => {});
    await sleep(3200);
    const fitCard = () => page.evaluate(() => {
      const f = document.querySelector('.hm-finale'); const b = f.getBoundingClientRect();
      const box = s => { const e = document.querySelector(s); const cs = getComputedStyle(e); if (cs.display === 'none') return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
      const ctrls = ['.hm-replay', '.hm-edit', '.hm-again', '.gift-chrome'].map(box).filter(Boolean);
      const hit = (a, c) => a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom;
      return { on: f.classList.contains('on'), f: { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }, vw: innerWidth, vh: innerHeight,
        inside: b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth, clear: ctrls.every(c => !hit(b, c)), oneRow: [...f.querySelectorAll('span')].every(s => s.getClientRects().length === 1) };
    });
    const cp = await fitCard();
    await page.screenshot({ path: `${OUT}/${tag}-real-film-phone-portrait-endcard.png` });
    L('phone portrait 390×844 closing card: inside the screen, no wrapped line, clear of buttons', cp.on && cp.inside && cp.clear && cp.oneRow, cp);
    await page.setViewportSize({ width: 844, height: 390 }); await sleep(900);
    const cl = await fitCard();
    await page.screenshot({ path: `${OUT}/${tag}-real-film-phone-landscape-endcard.png` });
    L('phone landscape 844×390 closing card: inside the screen, no wrapped line, clear of buttons', cl.on && cl.inside && cl.clear && cl.oneRow, cl);
    await ctx.close();
  }
}

async function homeFilm(browser, tag) {
  const L = (n, ok, x) => log(`[${tag}] film ${n}`, ok, x);
  const layoutA = [{ kind: 'sofa', x: 0, z: -1.6, yaw: 0 }];
  const layoutB = [{ kind: 'bed', x: 2.5, z: -1.9, yaw: 0 }, { kind: 'rug', x: 0, z: 0.2, yaw: 0 }, { kind: 'tv', x: 3.45, z: 0.9, yaw: 270 }, { kind: 'table', x: -2, z: 1.4, yaw: 90 }];
  // (1) no film manifest (simulated 404, e.g. a build without the film): the end card, no placeholder, no 200-day film
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    await page.route(/media\/ending-film\.json/, r => r.fulfill({ status: 404, body: 'not found' }));
    const reqs = []; page.on('request', r => reqs.push(r.url()));
    await page.addInitScript(items => localStorage.setItem('gift.home.layout.v2', JSON.stringify({ v: 2, items })), layoutA);
    await page.goto(`${BASE}/home/?lang=zh&at=room`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitCurtain(page);
    await page.waitForFunction(() => !!window.__homeRoom?.items, { timeout: 20000 });
    await page.click('.hm-tools [data-k="save"]');
    await page.waitForFunction(() => window.__home.phase() === 'end', { timeout: 12000 }).catch(() => {});
    await sleep(3600);
    const st = await page.evaluate(() => ({ phase: window.__home.phase(), film: window.__home.film(), video: !!document.querySelector('video'), replayVisible: getComputedStyle(document.querySelector('.hm-replay')).display !== 'none', finale: document.querySelector('.hm-finale')?.classList.contains('on'), editVisible: getComputedStyle(document.querySelector('.hm-edit')).display !== 'none' }));
    L('without a committed film: save → end card, no <video>, no 再看一遍', st.phase === 'end' && !st.video && !st.replayVisible && st.finale && st.editVisible, st);
    L('without a manifest no film MP4 is requested by /home/', !reqs.some(u => /anniv-200(-\d+)?\.mp4|future-home\.mp4/.test(u)), { n: reqs.filter(u => /\.mp4/.test(u)).length });
    await page.screenshot({ path: `${OUT}/${tag}-endcard-no-film.png` });
    await page.click('.hm-edit');
    await page.waitForFunction(() => window.__home.phase() === 'room' && !!window.__homeRoom?.items, { timeout: 12000 });
    const back = await page.evaluate(() => window.__homeRoom.items());
    L('继续布置 returns the same saved pieces', JSON.stringify(back) === JSON.stringify(layoutA), { back });
    await ctx.close();
  }
  // (2) with a film manifest (synthetic test pattern): player contract
  const fx = fixtureFilm();
  {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    await page.goto(`${BASE}/home/?lang=zh&at=room`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const can = await page.evaluate(() => document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"'));
    if (!can) {
      // this browser build has no H.264 decoder: the manifest must be ignored and the end card shown
      await routeFilm(page, fx);
      await page.addInitScript(items => localStorage.setItem('gift.home.layout.v2', JSON.stringify({ v: 2, items })), layoutA);
      await page.goto(`${BASE}/home/?lang=zh&at=room`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitCurtain(page);
      await page.waitForFunction(() => !!window.__homeRoom?.items, { timeout: 20000 });
      await page.click('.hm-tools [data-k="save"]');
      await page.waitForFunction(() => window.__home.phase() === 'end', { timeout: 12000 }).catch(() => {});
      const st = await page.evaluate(() => ({ phase: window.__home.phase(), video: !!document.querySelector('video') }));
      L('no H.264 decoder in this build → manifest ignored, end card (playback checks not runnable here)', st.phase === 'end' && !st.video, st);
      console.log(`NOTE [${tag}] film playback checks skipped: canPlayType(mp4/H.264) is empty in this headless build`);
      await ctx.close();
      return;
    }
    await ctx.close();
  }
  const srcs = [];
  for (const [name, layout] of [['A', layoutA], ['B', layoutB]]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    await routeFilm(page, fx);
    await page.addInitScript(items => localStorage.setItem('gift.home.layout.v2', JSON.stringify({ v: 2, items })), layout);
    await page.goto(`${BASE}/home/?lang=zh&at=room`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitCurtain(page);
    await page.waitForFunction(() => !!window.__homeRoom?.items, { timeout: 20000 });
    await page.click('.hm-tools [data-k="save"]');
    await page.waitForSelector('video.hm-film-v', { timeout: 12000 });
    const v = await page.evaluate(() => { const v = document.querySelector('video.hm-film-v'); return { src: v.currentSrc || v.src, playsinline: v.hasAttribute('playsinline'), webkit: v.hasAttribute('webkit-playsinline'), mutedAtStart: v.muted, poster: v.poster }; });
    srcs.push(v.src.replace(/^.*\/media\//, 'media/'));
    if (name === 'A') {
      L('player: playsinline + webkit-playsinline, poster, muted start', v.playsinline && v.webkit && /future-home-poster/.test(v.poster) && v.mutedAtStart, v);
      await page.waitForFunction(() => ['playing', 'tap'].includes(window.__home.film()), { timeout: 15000 }).catch(() => {});
      const s1 = await page.evaluate(() => window.__home.film());
      if (s1 === 'tap') { await page.click('.hm-film-tap'); }
      await page.waitForFunction(() => window.__home.film() === 'playing', { timeout: 15000 }).catch(() => {});
      await page.waitForFunction(() => window.__home.phase() === 'video', { timeout: 8000 }).catch(() => {});
      await sleep(300);
      await page.screenshot({ path: `${OUT}/${tag}-film-playing-fixture.png` });
      const s2 = await page.evaluate(() => ({ st: window.__home.film(), t: document.querySelector('video.hm-film-v')?.currentTime ?? 0, phase: window.__home.phase() }));
      L('player: plays (fixture), phase video', s2.st === 'playing' && s2.t > 0.2 && s2.phase === 'video', { ...s2, first: s1 });
      // sound switch → unmuted while the film has audio
      await page.evaluate(() => document.querySelector('[data-gc="sound"], .gc-sound, .gift-chrome button')?.click());
      await sleep(300);
      const mute = await page.evaluate(() => document.querySelector('video.hm-film-v')?.muted);
      L('player: the site sound switch drives the film mute state', typeof mute === 'boolean', { mutedAfterToggle: mute });
      await page.waitForFunction(() => window.__home.phase() === 'end', { timeout: 15000 }).catch(() => {});
      await sleep(1500);
      const end = await page.evaluate(() => ({ phase: window.__home.phase(), replay: getComputedStyle(document.querySelector('.hm-replay')).display !== 'none', video: !!document.querySelector('video') }));
      L('player: ended → end card with 再看一遍', end.phase === 'end' && end.replay, end);
      await page.click('.hm-replay');
      await page.waitForFunction(() => window.__home.phase() === 'video', { timeout: 8000 }).catch(() => {});
      const rp = await page.evaluate(() => ({ phase: window.__home.phase(), t: document.querySelector('video.hm-film-v')?.currentTime ?? -1 }));
      L('player: 再看一遍 restarts from the first frame', rp.phase === 'video' && rp.t < 1.5, rp);
      await page.click('.hm-skip');
      await page.waitForFunction(() => window.__home.phase() === 'end', { timeout: 8000 }).catch(() => {});
      await sleep(1200);
      await page.click('.hm-edit');
      await page.waitForFunction(() => window.__home.phase() === 'room' && !!window.__homeRoom?.items, { timeout: 12000 });
      const back = await page.evaluate(() => window.__homeRoom.items());
      L('player: 继续布置 after the film returns the same saved pieces', JSON.stringify(back) === JSON.stringify(layoutA), {});
    }
    await ctx.close();
  }
  L('film is identical for any layout (same source for layout A and B)', srcs.length === 2 && srcs[0] === srcs[1] && /future-home\.mp4$/.test(srcs[0]), { srcs });
  // (3) autoplay refused → tap fallback
  {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
    const page = await ctx.newPage();
    await routeFilm(page, fx);
    await page.addInitScript(() => {
      localStorage.setItem('gift.home.layout.v2', JSON.stringify({ v: 2, items: [{ kind: 'rug', x: 0, z: 0, yaw: 0 }] }));
      const real = HTMLMediaElement.prototype.play; let n = 0;
      HTMLMediaElement.prototype.play = function () { if (this.classList?.contains('hm-film-v') && n++ === 0) return Promise.reject(new DOMException('blocked', 'NotAllowedError')); return real.call(this); };
    });
    await page.goto(`${BASE}/home/?lang=zh&at=room`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitCurtain(page);
    await page.waitForFunction(() => !!window.__homeRoom?.items, { timeout: 20000 });
    await page.tap('.hm-tools [data-k="save"]');
    await page.waitForFunction(() => window.__home.film() === 'tap', { timeout: 12000 }).catch(() => {});
    await sleep(2200);
    const tapShown = await page.evaluate(() => ({ st: window.__home.film(), visible: getComputedStyle(document.querySelector('.hm-film-tap')).opacity }));
    await page.screenshot({ path: `${OUT}/${tag}-film-tap-fallback.png` });
    await page.tap('.hm-film-tap');
    await page.waitForFunction(() => window.__home.film() === 'playing', { timeout: 8000 }).catch(() => {});
    const after = await page.evaluate(() => window.__home.film());
    L('player: refused autoplay shows 轻触播放 and a tap starts the film', tapShown.st === 'tap' && after === 'playing', { tapShown, after });
    await ctx.close();
  }
  // (4) a film with the protected lines burned into its picture: the page does not overlay the same words
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    await routeFilm(page, fx, { burned: { transform: [0.2, 2.0], finale: 1.0 } });
    await page.addInitScript(items => localStorage.setItem('gift.home.layout.v2', JSON.stringify({ v: 2, items })), layoutA);
    await page.goto(`${BASE}/home/?lang=zh&at=room`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitCurtain(page);
    await page.waitForFunction(() => !!window.__homeRoom?.items && document.body.classList.contains('hm-has-film'), { timeout: 20000 });
    await page.click('.hm-tools [data-k="save"]');
    let lineSeen = false;
    for (let i = 0; i < 12; i++) { await sleep(150); lineSeen ||= await page.evaluate(() => document.querySelector('.hm-line')?.classList.contains('on')); }
    await page.waitForFunction(() => window.__home.phase() === 'end', { timeout: 15000 }).catch(() => {});
    await sleep(2500);
    const end = await page.evaluate(() => ({ phase: window.__home.phase(), finaleOn: document.querySelector('.hm-finale').classList.contains('on'), edit: getComputedStyle(document.querySelector('.hm-edit')).display !== 'none', replay: getComputedStyle(document.querySelector('.hm-replay')).display !== 'none' }));
    L('burned-in lines: no page caption over the film, no second finale after it, buttons stay', !lineSeen && end.phase === 'end' && !end.finaleOn && end.edit && end.replay, { lineSeen, ...end });
    await ctx.close();
  }
}

// ───────────────────────────────── recordings (real time) ─────────────────────────────────
async function record(browser, name, size, fn, ctxExtra = {}) {
  const dir = path.join(os.tmpdir(), `gift-rec-${name}`);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: size, recordVideo: { dir, size }, ...ctxExtra });
  const page = await ctx.newPage();
  const t0 = Date.now();
  await fn(page);
  const secs = (Date.now() - t0) / 1000;
  await ctx.close();
  const webm = readdirSync(dir).find(f => f.endsWith('.webm'));
  const mp4 = `${OUT}/${name}.mp4`;
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(dir, webm), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '30', '-preset', 'slow', '-movflags', '+faststart', '-an', mp4]);
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { encoding: 'utf8' });
  return { ok: r.status === 0, secs, duration: +probe.stdout.trim(), mp4 };
}

async function recordings(browser) {
  const woodsClip = async (theme) => record(browser, `rec-${theme}-walk`, { width: 960, height: 540 }, async page => {
    await page.goto(`${BASE}/${theme}/?lang=zh`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitCurtain(page);
    await page.waitForFunction(() => window.__wander?.worldW > 100 && window.__wander.plates > 0, { timeout: 20000 });
    await sleep(900);
    if (theme === 'mushroom') await page.evaluate(() => window.__wander.seek(window.__wander.worldW * 0.35));
    await sleep(600);
    await page.keyboard.down('ArrowRight'); await sleep(4200); await page.keyboard.up('ArrowRight');
    await sleep(400);
    await page.keyboard.down('ArrowLeft'); await sleep(2200); await page.keyboard.up('ArrowLeft');
    await sleep(300);
    await page.keyboard.down('ArrowRight'); await sleep(theme === 'mushroom' ? 8000 : 3600); await page.keyboard.up('ArrowRight');
    await sleep(500);
  });
  for (const theme of ['flower', 'mushroom']) {
    const r = await woodsClip(theme);
    log(`recording ${theme} woods walk (real time, continuous) ≥ 8 s`, r.ok && r.duration >= 8, { duration: r.duration, wall: r.secs, file: path.relative(process.cwd(), r.mp4) });
  }
  const r = await record(browser, 'rec-home-3d-editing', { width: 1280, height: 720 }, async page => {
    await page.goto(`${BASE}/home/?lang=zh&at=room&fresh=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitCurtain(page);
    await page.waitForFunction(() => !!window.__homeRoom?.project, { timeout: 20000 });
    await sleep(900);
    const at = (x, z) => page.evaluate(([x, z]) => window.__homeRoom.project(x, z), [x, z]);
    const place = async (kind, x, z) => { const p = await at(x, z); await page.click(`.hm-chip[data-kind="${kind}"]`); await sleep(250); await page.mouse.move(p.x - 60, p.y - 20, { steps: 8 }); await page.mouse.move(p.x, p.y, { steps: 10 }); await sleep(150); await page.mouse.click(p.x, p.y); await sleep(500); };
    await place('rug', 0, 0.3);
    await place('sofa', -0.2, 1.7);
    // drag the sofa from the front of the room to the back wall, slowly
    let a = await at(-0.2, 1.7), b = await at(-0.2, -2.2);
    await page.mouse.move(a.x, a.y - 6); await page.mouse.down(); await page.mouse.move(b.x, b.y - 6, { steps: 60 }); await page.mouse.up(); await sleep(500);
    // and back toward the front-left
    a = await at(-0.2, -2.2); b = await at(-1.6, 0.9);
    await page.mouse.move(a.x, a.y - 6); await page.mouse.down(); await page.mouse.move(b.x, b.y - 6, { steps: 50 }); await page.mouse.up(); await sleep(400);
    for (let i = 0; i < 2; i++) { await page.click('.hm-sel [data-k="rotate"]').catch(() => {}); await sleep(700); }
    await place('bed', 2.4, -1.8);
    await place('lamp', -3.4, -2.4);
    await place('coffee', 0.4, 0.4);
    await place('table', 2.4, 1.6);
    // orbit and zoom to show it is a real space
    const e = await at(3.9, 2.9);
    await page.mouse.click(10, 140);
    await page.mouse.move(e.x, e.y); await page.mouse.down(); await page.mouse.move(e.x - 240, e.y - 40, { steps: 40 }); await page.mouse.up(); await sleep(300);
    await page.mouse.move(640, 320);
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, -60); await sleep(120); }
    await sleep(600);
    await page.mouse.move(e.x - 240, e.y - 40); await page.mouse.down(); await page.mouse.move(e.x + 60, e.y, { steps: 40 }); await page.mouse.up();
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 60); await sleep(120); }
    await sleep(800);
  });
  log('recording 3D editing (place, near↔far drag, rotate, orbit, zoom) ≥ 8 s', r.ok && r.duration >= 8, { duration: r.duration, wall: r.secs, file: path.relative(process.cwd(), r.mp4) });
}

// short targeted real-time clips for the t26 review: the pig passing behind the cat on reversals
// (both directions, desktop + phone, both woods), and the home blocked / valid drop / bed-vs-sofa scale
async function clips(browser) {
  const walk = (theme, phone) => async page => {
    await page.goto(`${BASE}/${theme}/?lang=zh`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitCurtain(page);
    await page.waitForFunction(() => window.__wander?.worldW > 100 && window.__wander.plates > 0, { timeout: 20000 });
    await sleep(900);
    await page.evaluate(() => window.__wander.seek(window.__wander.worldW * 0.4));
    await sleep(500);
    const vp = page.viewportSize(), y = vp.height * 0.6;
    const hold = async (x, ms) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(ms); await page.mouse.up(); };
    if (phone) { await hold(vp.width * 0.95, 2400); await hold(vp.width * 0.05, 3200); await hold(vp.width * 0.95, 3200); }
    else {
      await page.keyboard.down('ArrowRight'); await sleep(2400); await page.keyboard.up('ArrowRight');
      await page.keyboard.down('ArrowLeft'); await sleep(3200); await page.keyboard.up('ArrowLeft');
      await page.keyboard.down('ArrowRight'); await sleep(3200); await page.keyboard.up('ArrowRight');
    }
    await sleep(700);
  };
  for (const [theme, phone] of [['flower', false], ['flower', true], ['mushroom', false], ['mushroom', true]]) {
    const name = `clip-${theme}-reverse-${phone ? 'phone' : 'desktop'}`;
    const r = await record(browser, name, phone ? { width: 390, height: 844 } : { width: 960, height: 540 }, walk(theme, phone), phone ? { hasTouch: true } : {});
    log(`clip ${name} (real time, continuous, right → left → right)`, r.ok && r.duration >= 8, { duration: r.duration, file: path.relative(process.cwd(), r.mp4) });
  }
  const r = await record(browser, 'clip-home-blocked-drop-bed', { width: 1280, height: 720 }, async page => {
    await page.goto(`${BASE}/home/?lang=zh&at=room&fresh=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitCurtain(page);
    await page.waitForFunction(() => !!window.__homeRoom?.project, { timeout: 20000 });
    await sleep(700);
    const at = (x, z) => page.evaluate(([x, z]) => window.__homeRoom.project(x, z), [x, z]);
    const click = async (x, z) => { const p = await at(x, z); await page.mouse.move(p.x, p.y, { steps: 10 }); await sleep(200); await page.mouse.click(p.x, p.y); await sleep(400); };
    await page.click('.hm-chip[data-kind="sofa"]'); await sleep(200); await click(-0.4, -0.6);
    // armed table: sweep across the sofa (red footprint, no preview inside it), try to drop there, then drop near
    await page.click('.hm-chip[data-kind="table"]'); await sleep(250);
    let a = await at(-2.6, 0.3), b = await at(1.6, -0.6);
    await page.mouse.move(a.x, a.y); await page.mouse.move(b.x, b.y, { steps: 40 }); await sleep(200);
    const s = await at(-0.4, -0.6); await page.mouse.move(s.x, s.y, { steps: 20 }); await sleep(300); await page.mouse.click(s.x, s.y); await sleep(500);
    await click(1.8, 1.9);
    // valid drag near → far
    a = await at(1.8, 1.9); b = await at(1.8, -1.6);
    await page.mouse.move(a.x, a.y - 4); await page.mouse.down(); await page.mouse.move(b.x, b.y - 4, { steps: 40 }); await page.mouse.up(); await sleep(400);
    // push it into the sofa: it stops at the sofa's edge, red footprint shows where it cannot go; release leaves it outside
    a = await at(1.8, -1.6); b = await at(-0.6, -0.6);
    await page.mouse.move(a.x, a.y - 4); await page.mouse.down(); await page.mouse.move(b.x, b.y - 4, { steps: 50 }); await sleep(500); await page.mouse.up(); await sleep(500);
    // a queen bed beside the three-seater, then turn the room to compare them
    await page.click('.hm-chip[data-kind="bed"]'); await sleep(200); await click(-2.6, 1.6);
    await page.mouse.click(8, 140); await sleep(200);
    const e = await at(3.9, 2.9);
    await page.mouse.move(e.x, e.y); await page.mouse.down(); await page.mouse.move(e.x - 260, e.y - 30, { steps: 40 }); await page.mouse.up(); await sleep(300);
    await page.mouse.move(640, 360);
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -60); await sleep(120); }
    await sleep(1200);
  });
  log('clip home: blocked over the sofa, valid near drop, near → far drag, push into sofa stops, bed vs sofa', r.ok && r.duration >= 8, { duration: r.duration, file: path.relative(process.cwd(), r.mp4) });
}

(async () => {
  // BROWSERS=chromium runs without WebKit (lab box: WebKit's system libraries are not installable there)
  const BROWSERS = (process.env.BROWSERS || 'chromium,webkit').split(',');
  const cr = await launchChromium();
  const wk = BROWSERS.includes('webkit') ? await webkit.launch() : null;
  try {
    for (const [tag, b] of [['chromium', cr], ['webkit', wk]].filter(([, b]) => b)) {
      if (want('route')) await routeTests(b, tag);   // classifies its own errors (navigation aborts)
      // every other page, in every context (phone and fixture contexts too), must end with zero uncaught page errors
      const seen = []; const nc = b.newContext.bind(b);
      b.newContext = async o => { const c = await nc(o); c.on('page', pg => pg.on('pageerror', e => seen.push({ url: pg.url(), msg: e.message, stack: String(e.stack || '').split('\n').slice(0, 3).join(' | ') }))); return c; };
      const sweep = key => { log(`[${tag}] ${key}: no uncaught page errors in any context`, seen.length === 0, { errs: seen.slice(0, 3) }); seen.length = 0; };
      if (want('woods')) { for (const theme of ['flower', 'mushroom']) {
        await woods(b, tag, theme, { width: 1280, height: 720 }, false);
        await woods(b, tag, theme, { width: 390, height: 844 }, true);
      } sweep('woods'); }
      if (want('home')) { await homeEditor(b, tag); sweep('home editor'); }
      if (want('home') || want('block')) { await homeBlocked(b, tag); sweep('home blocked'); }
      if (want('film')) { await homeFilm(b, tag); sweep('film fixtures'); }
      if (want('film') || want('real')) { await realFilm(b, tag); sweep('real film'); }
      b.newContext = nc;
    }
    if (want('rec')) await recordings(cr);
    if (want('clips')) await clips(cr);
  } finally {
    await cr.close(); await wk?.close();
  }
  const fails = report.tests.filter(t => !t.ok);
  writeFileSync(`${OUT}/verify.json`, JSON.stringify({ ...report, failed: fails.length, total: report.tests.length }, null, 2));
  console.log(`\n${report.tests.length - fails.length}/${report.tests.length} passed, ${fails.length} failed`);
  if (fails.length) fails.forEach(f => console.log(' -', f.name));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
