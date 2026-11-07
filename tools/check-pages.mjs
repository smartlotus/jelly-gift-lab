// Minimal sanity (v03d: all eight pages + sea/sky/coop arrivals): load each journey page, report console errors / failed requests. Usage: node tools/check-pages.mjs [base] [shot.png]
import puppeteer from 'puppeteer-core';
const base = process.argv[2] || 'http://localhost:8811/', shot = process.argv[3];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const path of ['', 'flower/', 'mushroom/', 'shop/?skip', 'night/', 'jelly/?from=night&backend=webgl2', 'sea/', 'sea/?at=8', 'sea/?end', 'sky/', 'sky/?from=sea&hz=0.6', 'coop/', 'coop/?from=sky', 'home/', 'home/?at=room', 'ar/']) {
  const p = await b.newPage(); const errs = [];
  if (path === '' && shot) await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  await p.goto(base + path, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, path.startsWith('shop') ? 6000 : 2500));
  if (path === '' && shot) await p.screenshot({ path: shot });
  console.log((path || '/').padEnd(36), errs.length ? errs.join(' | ') : 'OK'); await p.close();
}
await b.close();
