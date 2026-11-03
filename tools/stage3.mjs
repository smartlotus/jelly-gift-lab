// Stage-3 quick look: one page load, a main screenshot, optional egg frames.
// node tools/stage3.mjs w=390 h=844 mobile=1 lang=zh tag=phone_zh egg=1 [backend=webgl2] [url=...]
import puppeteer from 'puppeteer-core';
const a = Object.fromEntries(process.argv.slice(2).map(s => { const [k, ...v] = s.split('='); return [k, v.join('=') || '1']; }));
const W = +(a.w || 1440), H = +(a.h || 900), tag = a.tag || 'desktop', dir = a.dir || 'review/stage3';
const qs = new URLSearchParams({ lang: a.lang || 'en', ...(a.backend ? { backend: a.backend } : {}) });
const url = `${a.url || 'http://localhost:8800/'}?${qs}`;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 900000,
  args: ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${W},${H}`] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1, isMobile: !!a.mobile, hasTouch: !!a.mobile });
if (a.mobile) await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1');
const errs = [];
page.on('console', m => { if (['error', 'warn'].includes(m.type())) errs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errs.push(`[pageerror] ${e.message}`));
page.on('response', r => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url()}`); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__jellyReady || !document.getElementById('fail').hidden, { timeout: 240000 });
console.log(tag, 'ready', JSON.stringify(await page.evaluate(() => window.__jellyReady)), 'title', await page.evaluate(() => document.title));
await sleep(+(a.wait || 5000));
const shot = async n => { await page.screenshot({ path: `${dir}/${n}.jpg`, type: 'jpeg', quality: 86 }); console.log('shot', n); };
await page.evaluate(() => window.__jelly?.debugFreeze(true)); await shot(tag); await page.evaluate(() => window.__jelly?.debugFreeze(false));
if (a.egg) {
  await page.click('#shroom'); const t0 = Date.now();
  for (const at of (a.at || '1300,2600,4000,6500').split(',').map(Number)) {
    await sleep(Math.max(0, at - (Date.now() - t0)));
    await page.evaluate(() => window.__jelly?.debugFreeze(true)); await shot(`egg_${tag}_${at}`); await page.evaluate(() => window.__jelly?.debugFreeze(false));
  }
  console.log('egg text', await page.evaluate(() => document.querySelector('.egg-line')?.textContent));
}
console.log('fonts', JSON.stringify(await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + '/' + f.style))));
console.log('errors', errs.length, errs.join('\n  '));
await browser.close();
