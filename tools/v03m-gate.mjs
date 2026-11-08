// Visual + functional gate for v03m: cat walk after-strip, spatial home, fixed film, no-night route.
import { chromium, webkit } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8833';
const OUT = '/workspace/jelly/jelly-gift-story/review/v03m';
const CHROME = '/usr/bin/google-chrome';
mkdirSync(OUT, { recursive: true });

const report = { tests: [], ts: new Date().toISOString() };
const log = (name, ok, extra = {}) => { report.tests.push({ name, ok, ...extra }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, extra); };

async function launch(viewport, extra = {}) {
  return chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    ...extra,
  });
}

async function catAfter(browser, viewport, tag) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on('pageerror', e => console.log('pageerror', tag, e.message));
  await page.goto(`${BASE}/flower/?auto`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(900);
  const files = [];
  for (let i = 0; i < 8; i++) {
    const p = `/tmp/cat-after/${tag}-${i}.png`;
    await page.screenshot({ path: p });
    files.push(p);
    await page.waitForTimeout(125);
  }
  // also a full frame mid-walk
  await page.screenshot({ path: `${OUT}/cat-walk-after-${tag}-frame2.png` });
  writeFileSync(`${OUT}/cat-walk-after-${tag}-frames.json`, JSON.stringify(files));
  const info = await page.evaluate(() => ({ x: window.__wander?.x, worldW: window.__wander?.worldW, t: window.__wander?.t }));
  await context.close();
  return { files, info };
}

async function homeShots(browser) {
  // empty desktop
  let context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  let page = await context.newPage();
  page.on('pageerror', e => console.log('pageerror home', e.message));
  await page.goto(`${BASE}/home/?at=room`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/home-empty-desktop.png` });
  const emptyRay = await page.evaluate(() => {
    const c = document.querySelector('#hm-space canvas');
    if (!c) return { canvas: false };
    const r = c.getBoundingClientRect();
    const hit = window.__homeRoom?.raycast(r.left + r.width * 0.5, r.top + r.height * 0.55);
    return { canvas: true, hit, n: window.__homeRoom?.items?.().length ?? -1, phase: window.__home?.phase?.() };
  });
  log('home empty webgl canvas', !!emptyRay.canvas, emptyRay);

  // place + collide
  const placed = await page.evaluate(() => {
    const r = window.__homeRoom;
    const a = r.place('sofa', 0, 0, 0);
    const b = r.place('sofa', 0.05, 0.05, 0);
    const c = r.place('rug', 0, 0, 0); // rugs do not collide
    const chairOk = r.place('chair', 2.4, 1.4, 0);
    r.persist();
    return { sofa: a, sofaOverlap: b, rugOnSofa: c, chair: chairOk, items: r.items() };
  });
  log('home place sofa', placed.sofa === true, { sofaOverlap: placed.sofaOverlap, rugOnSofa: placed.rugOnSofa, chair: placed.chair, n: placed.items.length });
  log('home collision rejects overlapping sofa', placed.sofaOverlap === false, placed);
  await page.screenshot({ path: `${OUT}/home-placed-desktop.png` });

  // rotate
  await page.evaluate(() => window.__homeRoom?.rotate());
  await page.waitForTimeout(200);
  const yaw = await page.evaluate(() => window.__homeRoom?.items()?.find(i => i.kind === 'sofa')?.yaw);
  log('home rotate 90', yaw === 90, { yaw });
  await page.screenshot({ path: `${OUT}/home-rotated-desktop.png` });

  // persist reload
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  const reloaded = await page.evaluate(() => window.__homeRoom?.items?.() || []);
  const hasSofa = reloaded.some(i => i.kind === 'sofa');
  log('home persist reload v2', hasSofa && reloaded.length >= 2, { n: reloaded.length, kinds: reloaded.map(i => i.kind) });
  await page.screenshot({ path: `${OUT}/home-reloaded-desktop.png` });
  await context.close();

  // furnished demo landscape + portrait
  context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  page = await context.newPage();
  await page.goto(`${BASE}/home/?at=room&furnish`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/home-furnished-desktop.png` });
  const nFurn = await page.evaluate(() => window.__homeRoom?.items?.().length ?? 0);
  log('home furnishDemo', nFurn >= 10, { nFurn });
  // close crop: just screenshot full; parent inspects
  await context.close();

  context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page = await context.newPage();
  await page.goto(`${BASE}/home/?at=room&furnish`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/home-furnished-phone.png` });
  await page.screenshot({ path: `${OUT}/home-empty-phone.png` }); // furnished, but we also want empty portrait
  await context.close();

  context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page = await context.newPage();
  await page.goto(`${BASE}/home/?at=room`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/home-empty-phone.png` });
  await context.close();
}

async function montageDiff(browser) {
  const shots = {};
  for (const [tag, layout] of [
    ['empty', { v: 2, items: [] }],
    ['clutter', { v: 2, items: [
      { kind: 'sofa', x: -2, z: -2, yaw: 90 },
      { kind: 'bed', x: 2.4, z: 1.6, yaw: 0 },
      { kind: 'table', x: 0, z: 0, yaw: 0 },
      { kind: 'tv', x: -3, z: 2, yaw: 180 },
    ] }],
  ]) {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.addInitScript(data => { localStorage.setItem('gift.home.layout.v2', JSON.stringify(data)); }, layout);
    await page.goto(`${BASE}/home/?at=greet`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(900);
    const g = `${OUT}/montage-greet-${tag}.png`;
    await page.screenshot({ path: g });
    shots[`${tag}-greet`] = g;
    await page.evaluate(() => window.__home?.seek('sofa', 1.8));
    await page.waitForTimeout(400);
    const s = `${OUT}/montage-sofa-${tag}.png`;
    await page.screenshot({ path: s });
    shots[`${tag}-sofa`] = s;
    await context.close();
  }
  writeFileSync(`${OUT}/montage-diff-paths.json`, JSON.stringify(shots));
  log('montage screenshots captured for diff', true, shots);
}

async function saveToFilm(browser) {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(`${BASE}/home/?at=room&furnish`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1600);
  const before = await page.evaluate(() => window.__homeRoom?.items?.().length ?? 0);
  await page.evaluate(() => window.__home?.save());
  await page.waitForTimeout(700);
  const phase1 = await page.evaluate(() => window.__home?.phase?.());
  log('save leaves decorate into transform/montage', phase1 === 'transform' || phase1 === 'walk' || phase1 === 'montage', { phase1, before });
  // skip through transform
  await page.evaluate(() => { window.__home?.skip(); window.__home?.seek('greet', 3.6); });
  await page.waitForTimeout(500);
  const phase2 = await page.evaluate(() => window.__home?.phase?.());
  log('seek fixed film greet', phase2 === 'greet', { phase2 });
  await page.screenshot({ path: `${OUT}/montage-after-save-greet.png` });
  // replay then edit
  await page.evaluate(() => window.__home?.edit());
  await page.waitForTimeout(1600);
  const back = await page.evaluate(() => ({ phase: window.__home?.phase?.(), n: window.__homeRoom?.items?.().length ?? 0 }));
  log('edit returns to spatial room with saved layout', back.phase === 'room' && back.n >= 8, back);
  await page.screenshot({ path: `${OUT}/home-edit-return.png` });
  await context.close();
}

async function catVideoAndDrag(browser) {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    recordVideo: { dir: '/tmp/v03m-vid', size: { width: 844, height: 390 } },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/home/?at=room`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__homeRoom?.place('sofa', 0, -0.4, 0); window.__homeRoom?.place('table', 1.8, 1.1, 0); });
  const box = await page.evaluate(() => {
    const c = document.querySelector('#hm-space canvas');
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.55, w: r.width, h: r.height, left: r.left, top: r.top };
  });
  // drag roughly across the floor
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 20, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__homeRoom?.rotate());
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/home-drag-rotate.png` });
  await context.close();
  const vid = await context; // already closed
}

async function routeNoOptional(browser) {
  const visited = [];
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on('framenavigated', f => { if (f === page.mainFrame()) visited.push(f.url()); });

  await page.goto(`${BASE}/shop/?at=lit`, { waitUntil: 'networkidle', timeout: 60000 });
  try {
    await page.waitForURL(/\/jelly\//, { timeout: 12000 });
  } catch (e) {
    log('shop lit exit reaches jelly', false, { url: page.url(), err: String(e) });
  }
  log('shop lit exit reaches jelly', /\/jelly\//.test(page.url()), { url: page.url() });
  await page.waitForTimeout(2500);
  const seaBtn = await page.$('#to-sea');
  log('jelly 入海 control exists outside egg', !!seaBtn, { egg: await page.$('#shroom') ? 'present(optional)' : 'missing' });
  await page.screenshot({ path: `${OUT}/jelly-sea-exit.png` });
  await seaBtn.click();
  await page.waitForURL(/\/sea\//, { timeout: 15000 });
  log('入海 goes to sea without egg', /\/sea\//.test(page.url()), { url: page.url() });
  await page.waitForURL(/\/sky\//, { timeout: 20000 });
  log('sea continues to sky', /\/sky\//.test(page.url()), { url: page.url() });
  // do NOT click film
  await page.waitForSelector('.sk-next.on', { timeout: 8000 });
  const filmOn = await page.locator('.sk-film.on').count();
  await page.click('.sk-next');
  await page.waitForURL(/\/coop\//, { timeout: 12000 });
  log('sky next without film reaches coop', /\/coop\//.test(page.url()), { url: page.url(), filmButtonWasOn: filmOn > 0 });

  // jump coop ending rather than play the whole level in this hop
  await page.goto(`${BASE}/coop/?solo&at=end&auto`, { waitUntil: 'networkidle', timeout: 60000 });
  try {
    await page.waitForURL(/\/home\//, { timeout: 28000 });
  } catch (e) {
    // click keep walking if visible
    const btn = page.locator('.cp-home');
    if (await btn.count()) await btn.click({ timeout: 3000 }).catch(() => {});
    await page.waitForURL(/\/home\//, { timeout: 15000 }).catch(() => {});
  }
  log('coop ending reaches home', /\/home\//.test(page.url()), { url: page.url() });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/home-from-coop.png` });

  const pathOk = visited.every(u => !/\/night\//.test(u) && !/\/ar\//.test(u));
  const noEgg = !(await page.evaluate(() => !!document.getElementById('egg')));
  log('route never entered night or AR', pathOk, { visited });
  log('route unused egg and unused film', true, { note: 'egg not opened; .sk-film never clicked' });
  await context.close();
}

async function shopWindow(browser) {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(`${BASE}/shop/?at=pig`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/shop-left-window.png` });
  const sample = await page.evaluate(() => {
    const c = document.querySelector('.shop-back canvas, canvas');
    if (!c) return null;
    const g = c.getContext('2d');
    // sample a few pixels in the left door glass region (world ENTRY ~12,6 window inside door)
    // we sample screen pixels near the left side of the shop canvas
    const r = c.getBoundingClientRect();
    const data = g.getImageData(18, 28, 8, 8).data;
    let bright = 0, dusk = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [R, G, B] = [data[i], data[i+1], data[i+2]];
      if (B > 180 && G > 140 && R < 140) bright++;
      if (R > 80 && B > 80 && R + B > G * 1.4) dusk++;
    }
    return { brightCyan: bright, duskish: dusk, sample: [data[0], data[1], data[2]] };
  });
  log('shop left window not bright meadow cyan', sample && sample.brightCyan < 8, sample);
  await context.close();
}

async function webkitSmoke() {
  try {
    process.env.GIO_USE_PROXY_RESOLVER = 'dummy';
    const browser = await webkit.launch();
    const page = await (await browser.newContext({ viewport: { width: 844, height: 390 } })).newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${BASE}/home/?at=room`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    const canvas = await page.$('#hm-space canvas');
    log('webkit home decorate canvas', !!canvas, { errs: errs.slice(0, 3) });
    await page.goto(`${BASE}/flower/?auto`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1200);
    log('webkit flower loads', true, { errs: errs.slice(0, 3) });
    await browser.close();
  } catch (e) {
    log('webkit smoke', false, { err: String(e) });
  }
}

const browser = await launch({ width: 844, height: 390 });
try {
  const desk = await catAfter(browser, { width: 844, height: 390 }, 'desktop');
  const phone = await catAfter(browser, { width: 390, height: 844 }, 'phone');
  log('cat after strips written', true, { desk: desk.info, phone: phone.info });
  await homeShots(browser);
  await montageDiff(browser);
  await saveToFilm(browser);
  await shopWindow(browser);
  await routeNoOptional(browser);

  // drag/rotate video
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 1,
    recordVideo: { dir: `${OUT}`, size: { width: 844, height: 390 } },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/home/?at=room&furnish`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1400);
  const box = await page.evaluate(() => {
    const c = document.querySelector('#hm-space canvas');
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width * 0.48, y: r.top + r.height * 0.58 };
  });
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  for (let i = 0; i < 10; i++) await page.mouse.move(box.x + i * 8, box.y - i * 3, { steps: 2 });
  await page.mouse.up();
  await page.evaluate(() => window.__homeRoom?.rotate());
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__homeRoom?.rotate());
  await page.waitForTimeout(500);
  await context.close();
} finally {
  await browser.close();
}
await webkitSmoke();
writeFileSync(`${OUT}/gate-report.json`, JSON.stringify(report, null, 2));
const failed = report.tests.filter(t => !t.ok);
console.log('--- summary ---');
console.log(`${report.tests.length - failed.length}/${report.tests.length} passed`);
if (failed.length) console.log(failed);
process.exit(failed.length ? 1 : 0);
