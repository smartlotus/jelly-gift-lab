// t35 preview (branch v03s-anniv-ending): no words before the film; closing card in the order 2 · 3 · 1 · 4.
//   BASE=http://127.0.0.1:8833 OUT=/workspace/jelly-preview-v03s/t35 node tools/v03s-t35-preview.mjs
// Silent recording; one test-only seek to near the end of the 67.7 s film to keep it short.
import { chromium } from 'file:///workspace/jelly/pw/node_modules/playwright/index.mjs';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import os from 'os';
import path from 'path';

const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const OUT = path.resolve(process.env.OUT || 'review/v03s/t35');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const waitCurtain = async page => { for (let i = 0; i < 150; i++) { const g = await page.evaluate(() => { const c = document.getElementById('gift-curtain'); return !c || c.classList.contains('gcc-gone') || c.classList.contains('gcc-out') || getComputedStyle(c).opacity === '0'; }).catch(() => false); if (g) return; await sleep(80); } };
const layout = [{ kind: 'rug', x: 0, z: 0.3, yaw: 0 }, { kind: 'sofa', x: -0.2, z: -1.9, yaw: 0 }, { kind: 'bed', x: 2.4, z: -1.8, yaw: 180 }, { kind: 'lamp', x: -3.2, z: -2.3, yaw: 0 }];
const report = [];
const geo = page => page.evaluate(() => {
  const box = e => { if (!e) return null; const cs = getComputedStyle(e); if (cs.display === 'none' || +cs.opacity < 0.05) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }; };
  const f = document.querySelector('.hm-finale');
  const lines = [...f.querySelectorAll('span')].map(s => { const r = s.getClientRects(); return { text: s.textContent, rects: r.length }; });
  return { vw: innerWidth, vh: innerHeight, finale: box(f), text: f.textContent, lines, ctrls: ['.hm-replay', '.hm-edit', '.hm-again', '.gift-chrome'].map(s => ({ s, b: box(document.querySelector(s)) })).filter(x => x.b) };
});
const check = (name, g) => {
  const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const f = g.finale;
  const ok = f && f.top >= 0 && f.bottom <= g.vh && f.left >= 0 && f.right <= g.vw && g.ctrls.every(c => !hit(f, c.b)) && g.lines.every(l => l.rects === 1);
  report.push({ name, ok, ...g }); console.log(ok ? 'OK  ' : 'BAD ', name, JSON.stringify({ finale: f, vw: g.vw, vh: g.vh, ctrls: g.ctrls }));
};
const open = async (viewport, extra = {}, lang = 'zh') => {
  const ctx = await browser.newContext({ viewport, ...extra });
  const page = await ctx.newPage();
  await page.addInitScript(items => localStorage.setItem('gift.home.layout.v2', JSON.stringify({ v: 2, items })), layout);
  await page.goto(`${BASE}/home/?lang=${lang}&at=room`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForFunction(() => !!window.__homeRoom?.items, { timeout: 20000 });
  await sleep(700);
  return { ctx, page };
};
const toEnd = async page => { await page.evaluate(() => { const v = document.querySelector('video.hm-film-v'); v.currentTime = v.duration - 1.5; }); await page.waitForFunction(() => window.__home.phase() === 'end', { timeout: 20000 }); await sleep(3800); };

// 1) desktop landscape, recorded: save → film starts with no text → (seek) end → closing card
{
  const dir = path.join(os.tmpdir(), 'gift-t35-rec'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const size = { width: 1280, height: 720 };
  const { ctx, page } = await open(size, { recordVideo: { dir, size } });
  await page.mouse.click(10, 140); await sleep(500);
  await page.click('.hm-tools [data-k="save"]');
  const seen = [];
  for (const [ms, n] of [[300, 'a'], [600, 'b'], [700, 'c'], [1200, 'd']]) {
    await sleep(ms);
    seen.push(await page.evaluate(() => ({ phase: window.__home.phase(), line: document.querySelector('.hm-line').classList.contains('on') ? document.querySelector('.hm-line').textContent : '', finale: document.querySelector('.hm-finale').classList.contains('on') })));
    await page.screenshot({ path: `${OUT}/1${n}-save-to-film-${n}.png` });
  }
  console.log('after save (0.3, 0.9, 1.6, 2.8 s):', JSON.stringify(seen));
  report.push({ name: 'no text between save and film', ok: seen.every(s => !s.line && !s.finale), seen });
  await page.waitForFunction(() => window.__home.film() === 'playing', { timeout: 20000 }); await sleep(3000);
  await page.screenshot({ path: `${OUT}/2-film-playing.png` });
  await toEnd(page);
  await page.screenshot({ path: `${OUT}/3-endcard-landscape-1280x720.png` });
  check('endcard 1280x720', await geo(page));
  await sleep(1500);
  await ctx.close();
  const webm = readdirSync(dir).find(f => f.endsWith('.webm'));
  spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(dir, webm), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-preset', 'slow', '-movflags', '+faststart', '-an', `${OUT}/t35-save-film-endcard.mp4`]);
}
// 2) phones
for (const [name, vp, turn] of [['phone-landscape-844x390', { width: 844, height: 390 }, null], ['phone-portrait-390x844', { width: 844, height: 390 }, { width: 390, height: 844 }], ['phone-portrait-360x640', { width: 640, height: 360 }, { width: 360, height: 640 }], ['phone-landscape-667x375', { width: 667, height: 375 }, null]]) {
  const { ctx, page } = await open(vp, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await page.tap('.hm-tools [data-k="save"]');
  await page.waitForFunction(() => ['playing', 'tap'].includes(window.__home.film()), { timeout: 20000 });
  if (await page.evaluate(() => window.__home.film()) === 'tap') await page.tap('.hm-film-tap');
  await sleep(1500);
  if (turn) { await page.setViewportSize(turn); await sleep(800); }
  await toEnd(page);
  await page.screenshot({ path: `${OUT}/4-endcard-${name}.png` });
  check(`endcard ${name}`, await geo(page));
  await ctx.close();
}
// 3) English end card (layout check)
{
  const { ctx, page } = await open({ width: 844, height: 390 }, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, 'en');
  await page.tap('.hm-tools [data-k="save"]');
  await page.waitForFunction(() => ['playing', 'tap'].includes(window.__home.film()), { timeout: 20000 });
  if (await page.evaluate(() => window.__home.film()) === 'tap') await page.tap('.hm-film-tap');
  await sleep(1200); await toEnd(page);
  await page.screenshot({ path: `${OUT}/5-endcard-en-phone-landscape.png` });
  check('endcard en 844x390', await geo(page));
  await ctx.close();
}
writeFileSync(`${OUT}/t35-preview.json`, JSON.stringify(report, null, 1));
console.log(report.every(r => r.ok) ? 'ALL OK' : 'SOME BAD');
await browser.close();
