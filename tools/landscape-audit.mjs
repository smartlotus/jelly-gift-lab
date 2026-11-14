// 横屏审计：每个页面 × 每个视口截图，并列出出界 / 进安全区 / 被遮挡 / 过小的可点元素，以及画布是否铺满视口。
//   BASE=http://127.0.0.1:8833 OUT=/workspace/lab-shots/landscape/audit node tools/landscape-audit.mjs [pages…]
const { chromium } = await import(process.env.PLAYWRIGHT || 'file:///workspace/pwtools/node_modules/playwright-core/index.mjs');
import { writeFileSync, mkdirSync } from 'node:fs';
const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const OUT = process.env.OUT || '/workspace/lab-shots/landscape/audit';
mkdirSync(OUT, { recursive: true });
const VIEWS = (process.env.VIEWS || '390x844,844x390,932x430,667x375').split(',').map(s => s.split('x').map(Number));
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ['meadow', 'shop', 'ar', 'night', 'jelly', 'sea', 'sky', 'coop', 'flower', 'mushroom', 'home', 'secret'];
const PATH = id => (id === 'meadow' ? '' : `${id}/`);
export const SAFE = (w, h) => (w > h ? { top: 0, left: 47, right: 47, bottom: 21 } : { top: 47, left: 0, right: 0, bottom: 34 });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const report = {};
for (const st of PAGES) for (const [w, h] of VIEWS) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: SAFE(w, h) }).catch(() => {});
  await p.goto(`${BASE}/${PATH(st)}?lang=zh`, { waitUntil: 'load' }).catch(e => errs.push(String(e)));
  await p.waitForTimeout(+(process.env.WAIT || 6000));
  const r = await p.evaluate(ins => {
    const vis = e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.15 && !e.closest('[hidden],[inert],[aria-hidden="true"]'); };
    const sel = 'button, a[href], [role="button"], input, select, .gs-btn';
    const bad = [];
    for (const e of document.querySelectorAll(sel)) {
      if (!vis(e)) continue;
      let a = e; let hide = false; while (a) { const cs = getComputedStyle(a); if (+cs.opacity < 0.15) { hide = true; break; } a = a.parentElement; }
      if (hide) continue;
      const r = e.getBoundingClientRect();
      const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
      const top = document.elementFromPoint(cx, cy);
      const issues = [];
      if (r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) continue; // fully off-screen (scrolled lists etc.)
      if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) issues.push('clipped');
      else if (r.left < ins.left - 1 || r.right > innerWidth - ins.right + 1 || r.top < ins.top - 1 || r.bottom > innerHeight - ins.bottom + 1) issues.push('safe-area');
      if (top && !e.contains(top) && !top.contains(e)) issues.push('covered by ' + (top.className?.baseVal ?? top.className ?? top.tagName).toString().slice(0, 40));
      if (Math.min(r.width, r.height) < 24) issues.push('small');
      if (issues.length) bad.push({ el: (e.className?.baseVal ?? e.className ?? '').toString().slice(0, 40) || e.tagName, t: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 16), r: [r.left, r.top, r.right, r.bottom].map(Math.round), issues });
    }
    // text leaves that are cut by the viewport
    const cut = [];
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) { const n = tw.currentNode; if (!n.textContent.trim()) continue; const e = n.parentElement; if (!e || !vis(e)) continue; let a = e, hide = false; while (a) { if (+getComputedStyle(a).opacity < 0.15) { hide = true; break; } a = a.parentElement; } if (hide) continue; const rg = document.createRange(); rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (r.width < 1) continue; if (r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) continue; if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) cut.push({ t: n.textContent.trim().slice(0, 24), r: [r.left, r.top, r.right, r.bottom].map(Math.round) }); }
    const canv = [...document.querySelectorAll('canvas')].filter(vis).map(c => { const r = c.getBoundingClientRect(); return { cls: c.className || c.id, css: [Math.round(r.width), Math.round(r.height)], buf: [c.width, c.height], ratioOk: Math.abs((c.width / c.height) / (r.width / r.height) - 1) < 0.04 }; });
    return { bad, cut: cut.slice(0, 12), canv, sw: document.documentElement.scrollWidth, vw: innerWidth };
  }, SAFE(w, h));
  r.errs = errs;
  report[`${st}@${w}x${h}`] = r;
  await p.screenshot({ path: `${OUT}/${st}-${w}x${h}.png`, timeout: 300000 }).catch(e => console.log('shot fail', st, w, h, String(e).slice(0, 80)));
  console.log(st, `${w}x${h}`, 'bad', r.bad.length, 'cut', r.cut.length, 'canvas', JSON.stringify(r.canv.map(c => c.css.join('x') + (c.ratioOk ? '' : '!ratio'))), errs.length ? 'ERR ' + errs[0].slice(0, 80) : '');
  await ctx.close();
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
}
await b.close();
