import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width: +(process.env.VW||390), height: +(process.env.VH||844), deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:8811/sky/?lang=zh', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 4500));
await p.evaluate(() => document.querySelector('.sk-next').click());
const nav = p.waitForNavigation({ timeout: 20000 }).catch(() => {});
for (const [ms, n] of [[900, 'a'], [1500, 'b']]) { await new Promise(r => setTimeout(r, ms)); await p.screenshot({ path: `review/v03/sky-coop-${n}.png` }); }
await nav;
console.log(p.url());
for (const [ms, n] of [[300, 'd'], [1300, 'e'], [2500, 'f']]) { await new Promise(r => setTimeout(r, ms)); await p.screenshot({ path: `review/v03/sky-coop-${n}.png` }); }
console.log('errors', errs); await b.close();
