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

async function shot(name, url, { w = 1280, h = 720, seekFrac, seekX, afterWait = 900 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  page.setDefaultNavigationTimeout(60000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const u = url.includes('?') ? `${url}&lang=zh` : `${url}?lang=zh`;
  try {
    await page.goto(u, { waitUntil: 'networkidle0', timeout: 60000 });
  } catch (e) {
    try { await page.goto(u, { waitUntil: 'load', timeout: 60000 }); } catch (e2) { errors.push(String(e2)); }
  }
  await new Promise(r => setTimeout(r, 1200));
  if (seekFrac != null || seekX != null) {
    await page.evaluate(({ seekFrac, seekX }) => {
      const wld = window.__wander;
      if (!wld) return;
      const x = seekX != null ? seekX : wld.worldW * seekFrac;
      wld.seek(x);
    }, { seekFrac, seekX }).catch(e => errors.push(String(e)));
    await new Promise(r => setTimeout(r, afterWait));
  }
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, type: 'png' });
  const title = await page.title().catch(() => '');
  const info = await page.evaluate(() => {
    const w = window.__wander;
    return w ? { x: Math.round(w.x), worldW: Math.round(w.worldW), t: +w.t.toFixed(2) } : null;
  }).catch(() => null);
  console.log('shot', name, `${w}x${h}`, errors.length ? 'ERR ' + errors[0] : 'ok', title, JSON.stringify(info));
  await page.close();
  return file;
}

await shot('flower-desktop-cat', `${LOCAL}/flower/`, { seekX: 140, afterWait: 500 });
await shot('flower-desktop', `${LOCAL}/flower/`, { seekFrac: 0.50, afterWait: 1100 });
await shot('flower-desktop-collie', `${LOCAL}/flower/`, { seekFrac: 0.66, afterWait: 1500 });
await shot('flower-portrait', `${LOCAL}/flower/`, { w: 390, h: 844, seekFrac: 0.50, afterWait: 1100 });
await shot('flower-landscape', `${LOCAL}/flower/`, { w: 844, h: 390, seekFrac: 0.50, afterWait: 1100 });
await shot('mushroom-desktop-cat', `${LOCAL}/mushroom/`, { seekX: 140, afterWait: 500 });
await shot('mushroom-desktop', `${LOCAL}/mushroom/`, { seekFrac: 0.32, afterWait: 1100 });
await shot('mushroom-desktop-collie', `${LOCAL}/mushroom/`, { seekFrac: 0.66, afterWait: 1500 });
await shot('mushroom-portrait', `${LOCAL}/mushroom/`, { w: 390, h: 844, seekFrac: 0.32, afterWait: 1100 });
await shot('mushroom-landscape', `${LOCAL}/mushroom/`, { w: 844, h: 390, seekFrac: 0.32, afterWait: 1100 });
await shot('home-empty-desktop', `${LOCAL}/home/?at=room&fresh`);
await shot('home-furnished-desktop', `${LOCAL}/home/?at=room&furnish`);
await shot('home-furnished-landscape', `${LOCAL}/home/?at=room&furnish`, { w: 844, h: 390 });
await shot('home-walk-desktop', `${LOCAL}/home/?at=walk`);
await shot('home-walk-portrait', `${LOCAL}/home/?at=walk`, { w: 390, h: 844 });
await shot('home-walk-open', `${LOCAL}/home/?at=walk`, { afterWait: 200 });
await shot('home-greet-desktop', `${LOCAL}/home/?at=greet&furnish`);
await shot('home-sofa-desktop', `${LOCAL}/home/?at=sofa&furnish`);
await shot('home-sleep-desktop', `${LOCAL}/home/?at=sleep`);
await shot('home-snow-desktop', `${LOCAL}/home/?at=snow`);
await shot('home-dawn-desktop', `${LOCAL}/home/?at=dawn`);

await browser.close();
console.log('ALL SHOTS DONE');
