import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
const OUT = '/workspace/jelly/jelly-gift-story/review/v03m';
const LOCAL = 'http://127.0.0.1:8833';
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,720'],
});
async function shot(name, url, { w = 1280, h = 720 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  const u = url.includes('?') ? `${url}&lang=zh` : `${url}?lang=zh`;
  try { await page.goto(u, { waitUntil: 'networkidle0', timeout: 60000 }); }
  catch { await page.goto(u, { waitUntil: 'load', timeout: 60000 }).catch(()=>{}); }
  await new Promise(r => setTimeout(r, 1100));
  await page.screenshot({ path: path.join(OUT, `${name}.png`), type: 'png' });
  console.log('shot', name);
  await page.close();
}
await shot('home-empty-desktop', `${LOCAL}/home/?at=room&fresh`);
await shot('home-furnished-desktop', `${LOCAL}/home/?at=room&furnish`);
await shot('home-furnished-landscape', `${LOCAL}/home/?at=room&furnish`, { w: 844, h: 390 });
await browser.close();
console.log('ROOM DONE');
