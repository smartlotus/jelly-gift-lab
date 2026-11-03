import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:8811/sea/?lang=zh&end', { waitUntil: 'load' });
const nav = p.waitForNavigation({ timeout: 30000 }).catch(() => {});
await new Promise(r => setTimeout(r, 8000)); await p.screenshot({ path: 'review/v03/seasky-a.png' });
await nav; console.log(p.url());
for (const [ms, n] of [[400, 'b'], [1500, 'c'], [4000, 'd']]) { await new Promise(r => setTimeout(r, ms)); await p.screenshot({ path: `review/v03/seasky-${n}.png` }); }
console.log('errors', errs); await b.close();
