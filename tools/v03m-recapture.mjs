import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const OUT = '/workspace/jelly/jelly-gift-story/review/v03m';
fs.mkdirSync(OUT, { recursive: true });
const LOCAL = 'http://127.0.0.1:8833';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,720'],
});

async function shot(name, url, { w = 1280, h = 720, after } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  page.setDefaultNavigationTimeout(60000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const u = url.includes('?') ? `${url}&lang=zh` : `${url}?lang=zh`;
  try { await page.goto(u, { waitUntil: 'networkidle0', timeout: 60000 }); }
  catch { try { await page.goto(u, { waitUntil: 'load', timeout: 60000 }); } catch (e) { errors.push(String(e)); } }
  await new Promise(r => setTimeout(r, 900));
  let info = null;
  if (after) info = await after(page).catch(e => { errors.push(String(e)); return null; });
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, type: 'png' });
  console.log('shot', name, `${w}x${h}`, errors[0] || 'ok', JSON.stringify(info));
  await page.close();
}

const encounter = (frac, wait = 500) => async (page) => {
  const info = await page.evaluate((frac) => {
    const w = window.__wander;
    if (!w) return null;
    if (typeof w.placeEncounter === 'function') w.placeEncounter(frac);
    else w.seek(w.worldW * frac);
    return { x: Math.round(w.x), worldW: Math.round(w.worldW), plates: w.plates };
  }, frac);
  await new Promise(r => setTimeout(r, wait));
  return info;
};

const homeSeek = (id, tt) => async (page) => {
  await page.evaluate(({ id, tt }) => window.__home?.seek(id, tt), { id, tt });
  await new Promise(r => setTimeout(r, 350));
  return page.evaluate(() => window.__home?.phase());
};

await shot('flower-desktop-cat', `${LOCAL}/flower/`, { after: encounter(0.18) });
await shot('flower-desktop', `${LOCAL}/flower/`, { after: encounter(0.50) });
await shot('flower-desktop-collie', `${LOCAL}/flower/`, { after: encounter(0.66) });
await shot('flower-desktop-kitten', `${LOCAL}/flower/`, { after: encounter(0.34) });
await shot('flower-portrait', `${LOCAL}/flower/`, { w: 390, h: 844, after: encounter(0.50) });
await shot('flower-landscape', `${LOCAL}/flower/`, { w: 844, h: 390, after: encounter(0.50) });
await shot('mushroom-desktop-cat', `${LOCAL}/mushroom/`, { after: encounter(0.16) });
await shot('mushroom-desktop', `${LOCAL}/mushroom/`, { after: encounter(0.32) });
await shot('mushroom-desktop-collie', `${LOCAL}/mushroom/`, { after: encounter(0.66) });
await shot('mushroom-portrait', `${LOCAL}/mushroom/`, { w: 390, h: 844, after: encounter(0.32) });
await shot('mushroom-landscape', `${LOCAL}/mushroom/`, { w: 844, h: 390, after: encounter(0.32) });

await shot('home-walk-desktop', `${LOCAL}/home/?at=walk`, { after: homeSeek('walk', 1.8) });
await shot('home-walk-open', `${LOCAL}/home/?at=walk`, { after: homeSeek('walk', 4.2) });
await shot('home-walk-portrait', `${LOCAL}/home/?at=walk`, { w: 390, h: 844, after: homeSeek('walk', 1.8) });
await shot('home-greet-desktop', `${LOCAL}/home/?at=greet&furnish`, { after: homeSeek('greet', 4.8) });
await shot('home-sofa-desktop', `${LOCAL}/home/?at=sofa&furnish`, { after: homeSeek('sofa', 2.4) });
await shot('home-empty-desktop', `${LOCAL}/home/`);
await shot('home-furnished-desktop', `${LOCAL}/home/?furnish`);
await shot('home-sleep-desktop', `${LOCAL}/home/?at=sleep`, { after: homeSeek('sleep', 2.8) });
await shot('home-snow-desktop', `${LOCAL}/home/?at=snow`, { after: homeSeek('snow', 2.4) });
await shot('home-dawn-desktop', `${LOCAL}/home/?at=dawn`, { after: homeSeek('dawn', 5.5) });

await browser.close();
console.log('RECAPTURE DONE');
