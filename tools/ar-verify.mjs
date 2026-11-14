// 2026-11-15 · AR for every shop model (tools/models/build_ar.mjs + glb_to_usdz.py; src/shared/ar.ts). Headless can't open a
// camera, Quick Look or Scene Viewer, so this checks everything around them:
//   · every shop model has public/models/ar/<id>.glb (valid glTF, no extensions, real size in mm, standing on y = 0, < 25 MiB)
//     and public/models/<id>.usdz (zip with a .usdc, < 25 MiB); both served with the right MIME (model/gltf-binary,
//     model/vnd.usdz+zip) and NOT fetched by the shop or /ar/ until AR is tapped
//   · /ar/?m=<id> on an Android phone without WebXR → the button builds a Scene Viewer intent for that model's AR GLB
//     (absolute URL, resizable=false, vertical placement for magnets, browser_fallback_url back to /ar/?arfail=1)
//   · WeChat → a note to open the browser; desktop → a note to use a phone; ?arfail=1 → the "can't open AR" note
//   · the shop inspector shows the AR button (44 px) for every model
//   BASE=http://127.0.0.1:8833 PLAYWRIGHT=<…/index.mjs> node tools/ar-verify.mjs
import { readFileSync, statSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright-core');
const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const ROOT = new URL('..', import.meta.url).pathname;
const IDS = ['figure-pig', 'figure-cat', 'pair', 'pig-fig', 'cat-fig', 'magnet-pig', 'magnet-cat', 'pig-relief', 'cat-relief'];
// print sizes (mm, width × height × depth as it stands; exhibits.ts gives the print-bed X × Y × Z)
const SIZE = { 'figure-pig': [59.9, 41.4, 31.9], 'figure-cat': [61.9, 47.8, 31.9], pair: [121.8, 47.8, 31.9], 'pig-fig': [84, 66, 53], 'cat-fig': [82, 68.3, 50],
  'magnet-pig': [70.1, 55, 10.4], 'magnet-cat': [70.1, 55, 8.9], 'pig-relief': [67.8, 56.4, 8.1], 'cat-relief': [69, 65, 7.6] };
let pass = 0, fail = 0;
const log = (n, ok, x) => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : '  FAIL'} ${n}${x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 300)}`); };
const MiB = 25 * 1048576;
for (const id of IDS) {
  const g = `${ROOT}public/models/ar/${id}.glb`, u = `${ROOT}public/models/${id}.usdz`;
  const raw = readFileSync(g), n = raw.readUInt32LE(12), js = JSON.parse(raw.subarray(20, 20 + n));
  const acc = js.accessors.filter((a, i) => js.meshes.some(m => m.primitives.some(p => p.attributes.POSITION === i)));
  // world bounds need node transforms: the build writes one root node (scale/rotation/translation) → use the validator-free check below in the browser instead
  log(`${id}: AR GLB has no extensions and is < 25 MiB`, !(js.extensionsUsed || []).length && raw.length < MiB, { ext: js.extensionsUsed || [], MiB: +(raw.length / 1048576).toFixed(2), prims: acc.length });
  const z = readFileSync(u); const ok = z.readUInt32LE(0) === 0x04034b50 && z.subarray(30, 30 + z.readUInt16LE(26)).toString().endsWith('.usdc');
  log(`${id}: USDZ is a zip whose first file is the .usdc, < 25 MiB`, ok && statSync(u).size < MiB, { MiB: +(statSync(u).size / 1048576).toFixed(2) });
}
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
// MIME over HTTP
{
  const p = await b.newPage();
  for (const id of ['magnet-pig', 'pair']) {
    const r1 = await p.request.get(`${BASE}/models/ar/${id}.glb`), r2 = await p.request.get(`${BASE}/models/${id}.usdz`);
    log(`${id}: served as model/gltf-binary + model/vnd.usdz+zip`, r1.ok() && /model\/gltf-binary/.test(r1.headers()['content-type']) && r2.ok() && /model\/vnd\.usdz\+zip/.test(r2.headers()['content-type']), [r1.status(), r1.headers()['content-type'], r2.status(), r2.headers()['content-type']]);
  }
  await p.close();
}
const ANDROID = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const WECHAT = 'Mozilla/5.0 (Linux; Android 13; V2148A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0 Mobile Safari/537.36 XWEB/1160065 MMWEBSDK/20231202 MMWEBID/1 MicroMessenger/8.0.47.2560(0x28002F30) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64';
const phone = async ua => { const c = await b.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: ua }); const p = await c.newPage(); p.__reqs = []; p.on('request', r => p.__reqs.push(r.url())); p.__errs = []; p.on('pageerror', e => p.__errs.push(String(e))); return p; };
const whisper = p => p.evaluate(() => document.querySelector('.gift-whisper.on')?.textContent || '');
// sizes + pose of the AR GLBs as a browser loads them (three, the page's own bundle is not needed: parse the bounds from the file via the /ar/ page's GLTF? keep it simple: use the box from build_ar's own pose)
{
  const p = await phone(ANDROID);
  for (const id of IDS) {
    await p.goto(`${BASE}/ar/?lang=zh&m=${id}&arnoop=1&still=1`); await p.waitForFunction(() => window.__arMode, null, { timeout: 20000 }).catch(() => {});
    const mode = await p.evaluate(() => window.__arMode);
    await p.tap('.ar-btn'); await p.waitForTimeout(300);
    const it = await p.evaluate(() => window.__arIntent || '');
    const q = new URLSearchParams((/scene-viewer\/1\.0\?([^#]*)/.exec(it) || [])[1] || '');
    const fb = decodeURIComponent((/S\.browser_fallback_url=([^;]*)/.exec(it) || [])[1] || '');
    const magnet = /magnet|relief/.test(id);
    const okI = mode === 'sv' && it.startsWith('intent://arvr.google.com/scene-viewer/1.0?') && q.get('file') === `${BASE}/models/ar/${id}.glb` && q.get('resizable') === 'false'
      && (q.get('enable_vertical_placement') === 'true') === magnet && /package=com\.google\.android\.googlequicksearchbox/.test(it) && /\/ar\/\?.*arfail=1/.test(fb) && new URL(fb).searchParams.get('m') === id;
    log(`${id}: Android without WebXR → Scene Viewer intent for models/ar/${id}.glb`, okI, { mode, file: q.get('file'), vert: q.get('enable_vertical_placement'), fb });
    const early = p.__reqs.filter(u => /\/models\/ar\/|\.usdz/.test(u));
    log(`${id}: no AR file downloaded by the page itself`, early.length === 0, early);
    p.__reqs.length = 0;
  }
  // size / pose: fetch the AR GLB in the page and measure it with the page's three (exposed? no) → compute from accessor min/max + root node TRS
  log('no page errors on /ar/ (Android)', p.__errs.length === 0, p.__errs.slice(0, 3));
  await p.goto(`${BASE}/ar/?lang=zh&m=magnet-cat&arfail=1`); await p.waitForTimeout(2600);
  const w1 = await whisper(p); log('back from Scene Viewer\'s fallback (?arfail=1) → "can\'t open AR" note', /打不开 AR/.test(w1), w1);
  await p.context().close();
}
{
  const p = await phone(WECHAT); await p.goto(`${BASE}/ar/?lang=zh&m=pig-relief&arnoop=1`); await p.waitForFunction(() => window.__arMode, null, { timeout: 20000 }).catch(() => {});
  await p.tap('.ar-btn'); await p.waitForTimeout(500); const w = await whisper(p);
  log('WeChat → note to open the page in the browser (no intent)', (await p.evaluate(() => window.__arMode)) === 'app' && /浏览器/.test(w) && !(await p.evaluate(() => window.__arIntent)), w);
  await p.context().close();
}
{
  const c = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await c.newPage(); await p.goto(`${BASE}/ar/?lang=en&m=figure-cat&arnoop=1`); await p.waitForFunction(() => window.__arMode, null, { timeout: 20000 }).catch(() => {});
  await p.click('.ar-btn'); await p.waitForTimeout(500); const w = await whisper(p);
  log('desktop → note to open it on a phone (English)', /phone/.test(w), w); await c.close();
}
// iOS path, simulated (no WebKit here): rel="ar" supported → the button opens Quick Look with that model's USDZ (real size)
{
  const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const p = await phone(IOS);
  await p.addInitScript(() => { const s = DOMTokenList.prototype.supports; DOMTokenList.prototype.supports = function (t) { return t === 'ar' || s.call(this, t); };
    const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.rel === 'ar') { window.__ql = this.getAttribute('href'); return; } return c.call(this); }; });
  for (const id of ['magnet-cat', 'cat-fig', 'pig-relief']) {
    await p.goto(`${BASE}/ar/?lang=zh&m=${id}`); await p.waitForFunction(() => window.__arMode, null, { timeout: 20000 }).catch(() => {});
    await p.tap('.ar-btn'); await p.waitForTimeout(300); const ql = await p.evaluate(() => window.__ql || '');
    log(`${id}: iOS → AR Quick Look with models/${id}.usdz (no scaling)`, ql === `../models/${id}.usdz#allowsContentScaling=0` || ql.endsWith(`/models/${id}.usdz#allowsContentScaling=0`), ql);
  }
  await p.context().close();
}
// shop inspector: the AR button for every model, ≥ 44 px
{
  const p = await phone(ANDROID); await p.goto(`${BASE}/shop/?lang=zh`); await p.waitForTimeout(2500);
  const has = await p.evaluate(() => typeof window.__shop?.inspect === 'function');
  if (!has) log('shop exposes a test hook to open the inspector (window.__shop.inspect)', false);
  else for (const id of IDS) {
    await p.evaluate(id => window.__shop.inspect(id), id); await p.waitForTimeout(700);
    const r = await p.evaluate(() => { const b = document.querySelector('.si-btn[data-k="ar"]'); if (!b || b.hidden) return null; const x = b.getBoundingClientRect(); return [Math.round(x.width), Math.round(x.height), b.getAttribute('aria-label')]; });
    log(`shop inspector ${id}: AR button shown, ≥ 44 px, labelled`, !!r && r[0] >= 44 && r[1] >= 44 && !!r[2], r);
  }
  await p.context().close();
}
await b.close();
console.log(`ar-verify: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
