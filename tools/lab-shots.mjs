// Lab: screenshots of the 惊喜 / 跳过 / 收集 layer on every stage at a phone viewport (default 390×844, Chromium).
//   node tools/serve.mjs dist 8833 &
//   BASE=http://127.0.0.1:8833 OUT=/workspace/lab-shots node tools/lab-shots.mjs [stage ...]
// Per stage: dock.png (the skin), mid1/mid2.png (the surprise animation while it plays), item.png (the hidden thing
// revealed), then the collection list once at the end (list.png). Uses the same Playwright + Chrome as v03r-verify.mjs.
import { chromium } from 'file:///workspace/jelly/pw/node_modules/playwright/index.mjs';
import { mkdirSync } from 'fs';
const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const OUT = process.env.OUT || 'review/lab';
const VW = +(process.env.VW || 390), VH = +(process.env.VH || 844);
const LANG = process.env.LANG_Q || 'zh';
const ALL = ['meadow', 'shop', 'night', 'jelly', 'sea', 'sky', 'coop', 'flower', 'mushroom', 'home'];
const only = process.argv.slice(2).filter(a => ALL.includes(a));
const STAGES = only.length ? only : ALL;
const MID = { meadow: [900, 1700], shop: [1300, 2600], night: [1500, 2900], jelly: [1000, 2400], sea: [1500, 2900], sky: [1300, 2700], coop: [1200, 1900], flower: [1300, 2600], mushroom: [1500, 2500], home: [1500, 3000] };
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, isMobile: VW < VH, hasTouch: true });
const errors = [];
const tag = `${VW}x${VH}`;
for (const st of STAGES) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${st}: ${e.message}`));
  const path = st === 'meadow' ? '' : `${st}/`;
  await page.goto(`${BASE}/${path}?lang=${LANG}`, { waitUntil: 'load' });
  await page.waitForSelector('.gs-dock', { timeout: 20000 });
  await sleep(st === 'home' ? 2500 : 4200);
  await page.screenshot({ path: `${OUT}/${st}-${tag}-dock.png` });
  await page.click('.gs-surprise', { force: true });
  const [m1, m2] = MID[st];
  await sleep(m1); await page.screenshot({ path: `${OUT}/${st}-${tag}-mid1.png` });
  await sleep(m2 - m1); await page.screenshot({ path: `${OUT}/${st}-${tag}-mid2.png` });
  await page.waitForSelector('.gs-item', { timeout: 15000 }).catch(() => errors.push(`${st}: no item`));
  await sleep(1300);
  await page.screenshot({ path: `${OUT}/${st}-${tag}-item.png` });
  // tap it
  await page.click('.gs-item', { force: true }).catch(e => errors.push(`${st}: tap ${e.message}`));
  await sleep(500); await page.screenshot({ path: `${OUT}/${st}-${tag}-found.png` });
  await sleep(1200);
  console.log('ok', st, await page.evaluate(() => localStorage.getItem('gift.collect.v1')));
  await page.close();
}
const page = await ctx.newPage();
await page.goto(`${BASE}/sky/?lang=${LANG}`); await page.waitForSelector('.gs-entry'); await sleep(1500);
await page.click('.gs-entry', { force: true }); await sleep(700);
await page.screenshot({ path: `${OUT}/list-${tag}.png` });
await b.close();
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no page errors');
