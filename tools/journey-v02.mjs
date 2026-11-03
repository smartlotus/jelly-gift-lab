// v02 journey handoffs, headless: jelly egg -> 抬头 -> /sky/ (rising) -> 一起玩 -> /coop/ (solo) -> finale -> 从头再来 -> /,
// and /shop/ inspector AR -> /ar/ -> back to the same exhibit. Screens go to review/v02/journey-*.png.
// node tools/journey-v02.mjs [base]
import puppeteer from 'puppeteer-core';
const base = process.argv[2] || 'http://localhost:8811/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const wait = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
const page = async (w = 390, h = 844) => { const p = await b.newPage(); await p.setViewport({ width: w, height: h, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true }); p.on('pageerror', e => errs.push(`${p.url()} ${e.message}`)); p.on('console', m => m.type() === 'error' && errs.push(`${p.url()} ${m.text()}`)); return p; };
const shot = (p, n) => p.screenshot({ path: `review/v02/journey-${n}.png` });
const log = (...a) => console.log(...a);
// 1) jelly -> sky -> coop
{
  const p = await page();
  await p.goto(`${base}jelly/?lang=zh&backend=webgl2&from=night`); await p.waitForFunction(() => window.__jellyReady, { timeout: 60000 });
  await wait(1500); await p.$eval('#shroom', e => e.click()); await wait(5600);
  await shot(p, '1-egg');
  let nav = p.waitForNavigation({ timeout: 20000 }); await p.$eval('.egg [data-a="up"]', e => e.click()); await wait(1300); await shot(p, '2-lookup-mid');
  await nav; log('-> ', p.url());
  await wait(1600); await shot(p, '3-sky-rising'); await wait(7000); await shot(p, '4-sky');
  log('sky next visible', await p.$eval('.sk-next', e => e.classList.contains('on')));
  nav = p.waitForNavigation({ timeout: 20000 }); await p.$eval('.sk-next', e => e.click()); await nav; log('-> ', p.url());
  await wait(1500); log('coop playing', await p.evaluate(() => document.body.classList.contains('cp-playing')), 'tolink', !!(await p.$('.cp-tolink')));
  await shot(p, '5-coop'); await p.close();
}
// 2) coop finale -> from the start
{
  const p = await page(844, 390);
  await p.goto(`${base}coop/?lang=zh&solo&at=end&auto`); await wait(14000);
  log('finale home visible', await p.$eval('.cp-home', e => !e.hidden)); await shot(p, '6-finale');
  const nav = p.waitForNavigation({ timeout: 20000 }); await p.$eval('.cp-home', e => e.click()); await nav; log('-> ', p.url()); await p.close();
}
// 3) shop AR -> /ar/ -> back
{
  const p = await page();
  await p.goto(`${base}shop/?lang=zh&viewer`); await wait(5000);
  await shot(p, '7-shop-ar');
  log('ar btn', await p.$eval('[data-k="ar"]', e => ({ hidden: e.hidden, suggest: e.classList.contains('suggest') })));
  let nav = p.waitForNavigation({ timeout: 20000 }); await p.$eval('[data-k="ar"]', e => e.click()); await nav; log('-> ', p.url());
  await wait(2500); await shot(p, '8-ar');
  nav = p.waitForNavigation({ timeout: 20000 }); await p.$eval('.ar-back', e => e.click()); await nav; log('-> ', p.url());
  await wait(5000); log('inspecting again', await p.evaluate(() => document.body.classList.contains('shop-inspecting')));
  await p.close();
}
console.log(errs.length ? errs : 'no console errors');
await b.close();
