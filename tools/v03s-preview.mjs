// t33 preview (branch v03s-anniv-ending): a real-time recording of 保存布局 → the 200-day ending film → end card
// → 再看一遍, plus screenshots (desktop landscape, phone landscape, phone portrait). Chromium (H.264) only.
//   node tools/serve.mjs dist 8833 &
//   BASE=http://127.0.0.1:8833 OUT=/workspace/jelly-preview-v03s node tools/v03s-preview.mjs
// The recording is silent (Playwright screen capture has no audio). To keep it short it seeks once, test-only,
// from ~0:15 to 8 s before the end of the 67.7 s film; the seek point is printed in the log.
import { chromium } from 'file:///workspace/jelly/pw/node_modules/playwright/index.mjs';
import { mkdirSync, readdirSync, rmSync } from 'fs';
import { spawnSync } from 'child_process';
import os from 'os';
import path from 'path';

const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const OUT = path.resolve(process.env.OUT || 'review/v03s');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const waitCurtain = async page => { for (let i = 0; i < 150; i++) { const g = await page.evaluate(() => { const c = document.getElementById('gift-curtain'); return !c || c.classList.contains('gcc-gone') || c.classList.contains('gcc-out') || getComputedStyle(c).opacity === '0'; }).catch(() => false); if (g) return; await sleep(80); } };
const vstate = page => page.evaluate(() => { const v = document.querySelector('video.hm-film-v'); return { phase: window.__home.phase(), film: window.__home.film(), t: v ? +v.currentTime.toFixed(2) : null, d: v ? +v.duration.toFixed(2) : null, src: v?.currentSrc.replace(location.origin, '') ?? null, w: v?.videoWidth, h: v?.videoHeight, line: document.querySelector('.hm-line')?.classList.contains('on'), finale: document.querySelector('.hm-finale')?.classList.contains('on') }; });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// 1) landscape recording 1280×720
{
  const dir = path.join(os.tmpdir(), 'gift-v03s-rec'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const size = { width: 1280, height: 720 };
  const ctx = await browser.newContext({ viewport: size, recordVideo: { dir, size } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${BASE}/home/?lang=zh&at=room&fresh=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForFunction(() => !!window.__homeRoom?.project, { timeout: 20000 });
  await sleep(800);
  const at = (x, z) => page.evaluate(([x, z]) => window.__homeRoom.project(x, z), [x, z]);
  const place = async (kind, x, z) => { const p = await at(x, z); await page.click(`.hm-chip[data-kind="${kind}"]`); await sleep(200); await page.mouse.move(p.x, p.y, { steps: 8 }); await sleep(120); await page.mouse.click(p.x, p.y); await sleep(450); };
  await place('rug', 0, 0.3); await place('sofa', -0.2, -1.9); await place('bed', 2.4, -1.8); await place('lamp', -3.2, -2.3); await place('coffee', 0.3, 0.4);
  await page.mouse.click(10, 140); await sleep(600);
  await page.screenshot({ path: `${OUT}/1-furnished-before-save.png` });
  log('save'); await page.click('.hm-tools [data-k="save"]');
  await sleep(900); await page.screenshot({ path: `${OUT}/2-line-before-film.png` }); log('line', await vstate(page));
  await page.waitForFunction(() => window.__home.film() === 'playing', { timeout: 20000 });
  await sleep(6000); await page.screenshot({ path: `${OUT}/3-film-playing-landscape.png` }); log('playing', await vstate(page));
  await sleep(7000);
  const before = await vstate(page);
  await page.evaluate(() => { const v = document.querySelector('video.hm-film-v'); v.currentTime = v.duration - 8; });
  log('seek (test-only, to shorten the preview) from', before.t, 'to', before.d - 8);
  await sleep(3500); await page.screenshot({ path: `${OUT}/4-film-final-title.png` }); log('near end', await vstate(page));
  await page.waitForFunction(() => window.__home.phase() === 'end', { timeout: 20000 });
  await sleep(4500); await page.screenshot({ path: `${OUT}/5-endcard.png` }); log('endcard', await vstate(page));
  await page.click('.hm-replay'); log('replay');
  await page.waitForFunction(() => window.__home.film() === 'playing', { timeout: 15000 });
  await sleep(4500); log('replaying', await vstate(page));
  await page.click('.hm-skip'); await sleep(3000); log('skip → end', await vstate(page));
  await page.click('.hm-edit'); await sleep(2500);
  const back = await page.evaluate(() => ({ phase: window.__home.phase(), n: window.__homeRoom?.items().length }));
  log('继续布置 → room', back, 'pageerrors', errs);
  await ctx.close();
  const webm = readdirSync(dir).find(f => f.endsWith('.webm'));
  const mp4 = `${OUT}/v03s-anniv-ending-landscape.mp4`;
  spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(dir, webm), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-preset', 'slow', '-movflags', '+faststart', '-an', mp4]);
  log('recording', mp4, spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { encoding: 'utf8' }).stdout.trim());
}
// 2) phone: landscape save, film plays, turn to portrait
{
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('gift.home.layout.v2', JSON.stringify({ v: 2, items: [{ kind: 'sofa', x: 0, z: -1.6, yaw: 0 }, { kind: 'bed', x: 2.8, z: -2, yaw: 180 }, { kind: 'rug', x: 0, z: 0.3, yaw: 0 }] })));
  await page.goto(`${BASE}/home/?lang=zh&at=room`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitCurtain(page);
  await page.waitForFunction(() => !!window.__homeRoom?.items, { timeout: 20000 });
  await sleep(800);
  await page.tap('.hm-tools [data-k="save"]');
  await page.waitForFunction(() => ['playing', 'tap'].includes(window.__home.film()), { timeout: 20000 });
  if (await page.evaluate(() => window.__home.film()) === 'tap') await page.tap('.hm-film-tap');
  await sleep(7000); await page.screenshot({ path: `${OUT}/6-phone-landscape-playing.png` }); log('phone landscape', await vstate(page));
  await page.setViewportSize({ width: 390, height: 844 }); await sleep(2500);
  await page.screenshot({ path: `${OUT}/7-phone-portrait-playing.png` }); log('phone portrait', await vstate(page));
  await page.evaluate(() => { const v = document.querySelector('video.hm-film-v'); v.currentTime = v.duration - 2; });
  await page.waitForFunction(() => window.__home.phase() === 'end', { timeout: 20000 }); await sleep(4500);
  await page.screenshot({ path: `${OUT}/8-phone-portrait-endcard.png` }); log('phone portrait end', await vstate(page));
  await ctx.close();
}
await browser.close();
