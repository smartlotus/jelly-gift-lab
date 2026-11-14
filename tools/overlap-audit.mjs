// Control-layout audit (2026-11-14): on every lab page × 8 phone / foldable / tablet viewports (portrait + landscape,
// incl. 360×640 and 360×780 Android, 20:9, a foldable, a tablet) with an Android gesture-bar bottom inset, collect every
// VISIBLE interactive element (buttons, links, inputs, the collectible) plus the HUD obstacles (spoken line, status
// chips, hearts HUD) and assert: no two bounding boxes intersect (> 2 px each way), every tap target ≥ 44 px (the
// box or its ::before hit-extension), all of them inside the viewport.
// Used by tools/lab-verify.mjs (part 5, OVERLAP=0 skips) and standalone:
//   BASE=http://127.0.0.1:8833 PLAYWRIGHT=<…/index.mjs> SHOTS=/dir node tools/overlap-audit.mjs
export const VIEWPORTS = [
  { name: '360x640', width: 360, height: 640 }, { name: '360x780', width: 360, height: 780 },
  { name: '393x873 (20:9)', width: 393, height: 873 }, { name: '412x915', width: 412, height: 915 },
  { name: '640x360 land', width: 640, height: 360 }, { name: '873x393 land', width: 873, height: 393 },
  { name: '673x841 fold', width: 673, height: 841 }, { name: '800x1280 tablet', width: 800, height: 1280 },
];
export const PAGES = ['meadow', 'shop', 'night', 'jelly', 'sea', 'sky', 'coop', 'flower', 'mushroom', 'home', 'ar', 'secret'];
const PATH = (id) => (id === 'meadow' ? '' : `${id}/`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** in-page: boxes of visible interactive elements + obstacles, and the overlaps between them */
function collect() {
  const INTER = 'button, a[href], [role="button"], input:not([type="hidden"]), select, textarea, .gs-item';
  const OBST = '.gift-whisper.on, .shop-load:not([hidden]), [data-hud]';
  const vis = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
    }
    return true;
  };
  const items = [];
  const add = (el, kind) => {
    if (items.some((i) => i.el === el)) return;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    if (!vis(el)) return;
    const cs = getComputedStyle(el); if (kind === 'tap' && cs.pointerEvents === 'none') return;
    // ::before hit extension (.gs-btn uses inset:-6px -3px)
    const b4 = getComputedStyle(el, '::before'); let hw = r.width, hh = r.height;
    if (b4.content && b4.content !== 'none' && b4.position === 'absolute') {
      const t = parseFloat(b4.top) || 0, bo = parseFloat(b4.bottom) || 0, l = parseFloat(b4.left) || 0, ri = parseFloat(b4.right) || 0;
      hh = r.height - Math.min(0, t) - Math.min(0, bo); hw = r.width - Math.min(0, l) - Math.min(0, ri);
    }
    const label = (el.getAttribute('aria-label') || el.textContent || el.className || el.tagName).toString().trim().replace(/\s+/g, ' ').slice(0, 28);
    items.push({ el, kind, label: `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}「${label}」`, x: r.left, y: r.top, w: r.width, h: r.height, hw, hh });
  };
  document.querySelectorAll(INTER).forEach((el) => add(el, 'tap'));
  document.querySelectorAll(OBST).forEach((el) => add(el, 'hud'));
  // veil up = everything is behind it by design
  const veil = document.querySelector('.gs-orient.on, .gs-orient.show');
  const overlaps = [], small = [], outside = [];
  const W = innerWidth, H = innerHeight, T = 2;
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    if (a.kind === 'tap' && (a.hw < 43.5 || a.hh < 43.5) && !a.el.closest('.gcc-acts, .gift-whisper, p, li')) small.push(`${a.label} ${Math.round(a.hw)}×${Math.round(a.hh)}`);
    if (a.x < -1 || a.y < -1 || a.x + a.w > W + 1 || a.y + a.h > H + 1) outside.push(`${a.label} @${Math.round(a.x)},${Math.round(a.y)} ${Math.round(a.w)}×${Math.round(a.h)}`);
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j];
      if (a.kind === 'hud' && b.kind === 'hud') continue;
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > T && iy > T) overlaps.push({ a: a.label, b: b.label, box: [Math.round(Math.max(a.x, b.x)), Math.round(Math.max(a.y, b.y)), Math.round(ix), Math.round(iy)] });
    }
  }
  return { veil: !!veil, n: items.length, overlaps, small, outside };
}

/** draw the overlapping boxes (for screenshots) */
function mark(list) {
  for (const o of list) { const d = document.createElement('div'); d.style.cssText = `position:fixed;z-index:99999;pointer-events:none;left:${o.box[0]}px;top:${o.box[1]}px;width:${o.box[2]}px;height:${o.box[3]}px;outline:2px solid #f00;background:rgba(255,0,0,.25)`; document.body.appendChild(d); }
}

export async function audit(browser, BASE, { log, shots = '', pages = PAGES, viewports = VIEWPORTS, tag = '' } = {}) {
  const results = [];
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' });
    // Android gesture bar: 24 px bottom inset through the shared --sab variable (env() cannot be emulated)
    await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = ':root{--sab:24px !important}'; document.head.appendChild(s); }); });
    for (const st of pages) {
      const p = await ctx.newPage();
      await p.goto(`${BASE}/${PATH(st)}?lang=zh`, { waitUntil: 'load' }).catch(() => {});
      await p.waitForSelector('.gs-dock, .gift-chrome', { timeout: 15000 }).catch(() => {});
      await sleep(3200);
      // the spoken line is the usual offender: make sure one is showing
      await p.evaluate(() => { const w = document.querySelector('.gift-whisper'); if (w && !w.classList.contains('on') && w.textContent) w.classList.add('on'); }).catch(() => {});
      await p.evaluate(() => window.__layout?.settleAll()).catch(() => {}); // what tell() does when a line starts
      await sleep(1600);
      const r = await p.evaluate(collect).catch((e) => ({ err: String(e) }));
      const ok = !r.err && (r.veil || (!r.overlaps.length && !r.small.length && !r.outside.length));
      results.push({ vp: vp.name, st, ...r });
      if (log) log(`layout ${vp.name} ${st}: no overlaps, taps ≥ 44 px, inside the screen${r.veil ? ' (rotation veil up)' : ''}`, ok, ok ? undefined : { overlaps: r.overlaps?.slice(0, 4), small: r.small?.slice(0, 4), outside: r.outside?.slice(0, 3), err: r.err });
      if (shots && (!ok || process.env.ALLSHOTS === '1') && r.overlaps) { await p.evaluate(mark, r.overlaps); await p.screenshot({ path: `${shots}/${tag}${st}-${vp.width}x${vp.height}.png` }); }
      await p.close();
    }
    await ctx.close();
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright-core');
  const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let pass = 0, fail = 0;
  const log = (name, ok, x) => { ok ? pass++ : fail++; if (!ok || process.env.VERBOSE) console.log(`${ok ? '  ok ' : '  FAIL'} ${name}${ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600)}`); };
  if (process.env.SHOTS) (await import('node:fs')).mkdirSync(process.env.SHOTS, { recursive: true });
  await audit(b, BASE, { log, shots: process.env.SHOTS || '', tag: process.env.TAG || '', pages: process.env.PAGES ? process.env.PAGES.split(',') : PAGES, viewports: process.env.VPS ? VIEWPORTS.filter((v) => process.env.VPS.split(',').some((n) => v.name.startsWith(n))) : VIEWPORTS });
  await b.close();
  console.log(`overlap-audit: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
