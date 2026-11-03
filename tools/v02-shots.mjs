// v02 extras: minimal sanity (console errors) + phone-size screenshots. node tools/v02-shots.mjs [base] ['path|shot.png|waitMs|WxH' ...]
import puppeteer from 'puppeteer-core';
const [base = 'http://localhost:8811/', ...jobs] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const job of jobs) {
  const [path, shot, wait = '2500', vp = '390x844'] = job.split('|');
  const [w, h] = vp.split('x').map(Number);
  const p = await b.newPage(); const errs = [];
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  await p.goto(base + path, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, +wait));
  if (shot) await p.screenshot({ path: shot });
  console.log(path.padEnd(30), errs.length ? errs.join(' | ') : 'OK'); await p.close();
}
await b.close();
