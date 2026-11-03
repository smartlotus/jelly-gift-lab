// Quick stage-3 screenshots (headless SwiftShader). Usage: node review/stage3-night/shoot.mjs <url> <out.png> [w h steps mobile]
import puppeteer from 'puppeteer-core';
const [url, out, w = '1280', h = '800', steps = '60', mobile = ''] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage();
await p.setViewport({ width: +w, height: +h, deviceScaleFactor: 1, isMobile: !!mobile, hasTouch: !!mobile });
p.on('pageerror', e => console.log('pageerror', e.message)); p.on('console', m => m.type() === 'error' && console.log('console', m.text()));
await p.evaluateOnNewDocument(() => { window.__pause = true; window.__steps = 0; });
await p.goto(url, { waitUntil: 'load' });
await p.evaluate(n => { window.__steps = n; }, +steps);
await p.waitForFunction(() => !window.__steps, { timeout: 300000, polling: 200 });
await new Promise(r => setTimeout(r, 800));
await p.screenshot({ path: out }); console.log('shot', out); await b.close();
