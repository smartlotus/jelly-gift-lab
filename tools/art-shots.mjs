import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const OUT = '/workspace/jelly/jelly-gift-story/review/v03k';
fs.mkdirSync(OUT, { recursive: true });
const LOCAL = 'http://127.0.0.1:8833';
const LIVE = 'https://smartlotus.github.io/jelly-gift-story';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', `--window-size=1280,720`],
});

async function shot(name, url, { w = 1280, h = 720, seek, after } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  page.setDefaultNavigationTimeout(60000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  } catch (e) {
    try { await page.goto(url, { waitUntil: 'load', timeout: 60000 }); } catch (e2) { errors.push(String(e2)); }
  }
  await new Promise(r => setTimeout(r, 1400));
  if (seek != null) {
    await page.evaluate((x) => { window.__wander?.seek(x); }, seek).catch(() => {});
    await new Promise(r => setTimeout(r, 250));
  }
  if (after) await after(page);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, type: 'png' });
  const title = await page.title().catch(() => '');
  console.log('shot', name, w + 'x' + h, errors.length ? 'ERR ' + errors[0] : 'ok', title);
  await page.close();
  return file;
}

// NEW local
await shot('flower-desktop', `${LOCAL}/flower/`, { w: 1280, h: 720, seek: 980 });
await shot('flower-portrait', `${LOCAL}/flower/`, { w: 390, h: 844, seek: 980 });
await shot('flower-landscape', `${LOCAL}/flower/`, { w: 844, h: 390, seek: 980 });
await shot('mushroom-desktop', `${LOCAL}/mushroom/`, { w: 1280, h: 720, seek: 980 });
await shot('mushroom-portrait', `${LOCAL}/mushroom/`, { w: 390, h: 844, seek: 980 });
await shot('mushroom-landscape', `${LOCAL}/mushroom/`, { w: 844, h: 390, seek: 980 });
await shot('home-empty-desktop', `${LOCAL}/home/?at=room&fresh`, { w: 1280, h: 720 });
await shot('home-empty-landscape', `${LOCAL}/home/?at=room&fresh`, { w: 844, h: 390 });
await shot('home-furnished-desktop', `${LOCAL}/home/?at=room&furnish`, { w: 1280, h: 720 });
await shot('home-walk-desktop', `${LOCAL}/home/?at=walk`, { w: 1280, h: 720 });
await shot('home-walk-portrait', `${LOCAL}/home/?at=walk`, { w: 390, h: 844 });
await shot('home-walk-landscape', `${LOCAL}/home/?at=walk`, { w: 844, h: 390 });
await shot('home-sofa-desktop', `${LOCAL}/home/?at=sofa&furnish`, { w: 1280, h: 720 });
await shot('home-sleep-desktop', `${LOCAL}/home/?at=sleep`, { w: 1280, h: 720 });
await shot('home-snow-desktop', `${LOCAL}/home/?at=snow`, { w: 1280, h: 720 });
await shot('home-dawn-desktop', `${LOCAL}/home/?at=dawn`, { w: 1280, h: 720 });
await shot('home-approach-desktop', `${LOCAL}/home/?fresh`, { w: 1280, h: 720 });

// OLD live published (for side-by-side, not a grid)
await shot('old-flower-desktop', `${LIVE}/flower/`, { w: 1280, h: 720, seek: 980 });
await shot('old-mushroom-desktop', `${LIVE}/mushroom/`, { w: 1280, h: 720, seek: 980 });
await shot('old-home-walk-desktop', `${LIVE}/home/?at=walk`, { w: 1280, h: 720 });

await browser.close();
console.log('ALL SHOTS DONE');
