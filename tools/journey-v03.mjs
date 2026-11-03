// v03 handoff, headless: /jelly/?from=night (pig first, mushroom hidden) -> shark -> mushroom egg -> 入海 -> /sea/
import puppeteer from 'puppeteer-core';
const base = process.argv[2] || 'http://localhost:8811/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const wait = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
p.on('pageerror', e => errs.push(`${p.url()} ${e.message}`)); p.on('console', m => m.type() === 'error' && errs.push(`${p.url()} ${m.text()}`));
await p.goto(`${base}jelly/?lang=zh&backend=webgl2&from=night`); await wait(300); await p.screenshot({ path: 'review/v03/j-0-pink.png' });
await p.waitForFunction(() => window.__jellyReady, { timeout: 60000 }); await wait(800); await p.screenshot({ path: 'review/v03/j-1-pig.png' });
console.log('first', await p.$eval('.char.active', e => e.dataset.char), 'shroom off', await p.$eval('#shroom', e => e.classList.contains('off')));
await p.$eval('[data-char="shark"]', e => e.click()); await wait(2500);
console.log('on shark: shroom off', await p.$eval('#shroom', e => e.classList.contains('off')));
await p.$eval('#shroom', e => e.click()); await wait(5600);
const nav = p.waitForNavigation({ timeout: 20000 }); await p.$eval('.egg [data-a="up"]', e => e.click()); await wait(1500); await p.screenshot({ path: 'review/v03/j-2-tide.png' });
await nav; console.log('->', p.url()); await wait(700); await p.screenshot({ path: 'review/v03/j-3-sea.png' }); await wait(3000); await p.screenshot({ path: 'review/v03/j-4-sea.png' });
console.log(errs.length ? errs : 'no console errors'); await b.close();
