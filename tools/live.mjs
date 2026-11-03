// Live-site check: load URL, record console errors / HTTP>=400 / failed requests / transfer bytes,
// shark screenshot, switch pig + cat via buttons, optional mushroom egg. Usage:
// node tools/live.mjs url=https://smartlotus.github.io/jelly-gift/ w=390 h=844 mobile=1 tag=phone egg=1 chars=1
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const a = Object.fromEntries(process.argv.slice(2).map(s => { const [k, ...v] = s.split('='); return [k, v.join('=') || '1']; }));
const W = +(a.w || 1440), H = +(a.h || 900), tag = a.tag || 'desktop', dir = a.dir || 'review/deploy';
const url = a.url || 'https://smartlotus.github.io/jelly-gift/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 900000,
  args: ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${W},${H}`] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1, isMobile: !!a.mobile, hasTouch: !!a.mobile });
if (a.mobile) await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1');
const errs = [], bad = [], reqs = new Map(); let bytes = 0, phase = 'first';
const phaseBytes = {};
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warn') errs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', r => bad.push(`failed ${r.url()} ${r.failure()?.errorText}`));
page.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); reqs.set(r.url(), `${r.status()} ${r.headers()['content-type'] || ''}`); });
const cdp = await page.target().createCDPSession(); await cdp.send('Network.enable');
cdp.on('Network.loadingFinished', e => { bytes += e.encodedDataLength; phaseBytes[phase] = (phaseBytes[phase] || 0) + e.encodedDataLength; });
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__jellyReady || !document.getElementById('fail').hidden, { timeout: 240000 });
const ready = await page.evaluate(() => window.__jellyReady);
console.log(tag, 'ready', JSON.stringify(ready), 'after', Date.now() - t0, 'ms');
await sleep(+(a.wait || 5000));
// freeze the sim/render loop around the capture (SwiftShader WebGPU canvases read back black otherwise)
const shot = async (n) => { const f = `${dir}/live_${n}.jpg`; await page.evaluate(() => window.__jelly?.debugFreeze(true)); await page.screenshot({ path: f, type: 'jpeg', quality: 88 }); await page.evaluate(() => window.__jelly?.debugFreeze(false)); console.log('shot', f); };
const fontsOk = async () => page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family}/${f.style}`));
await shot(tag); phase = 'after-first';
console.log('first-load transfer bytes', phaseBytes.first);
const title = async () => page.evaluate(() => document.title);
console.log('title', await title());
if (a.chars) for (const id of ['pig', 'cat']) {
  phase = id;
  await page.click(`.char[data-char="${id}"]`);
  await page.waitForFunction((id) => location.search.includes('char=' + id), { timeout: 240000 }, id);
  await sleep(4000);
  console.log(id, 'title', await title(), 'active', await page.evaluate(() => document.querySelector('.char.active')?.dataset.char), 'bytes', phaseBytes[id]);
  await shot(`${tag}_${id}`);
}
if (a.egg) {
  phase = 'egg';
  await page.click('#shroom');
  await sleep(1300); await shot(`egg_fx_${tag}`);
  await sleep(3500);
  const card = await page.evaluate(() => { const l = document.querySelector('.egg-line'); const fx = document.querySelector('.egg-fx');
    return l && { text: l.textContent, ff: getComputedStyle(l).fontFamily, latFF: getComputedStyle(l.querySelector('.lat')).fontFamily, fx: !!fx,
      check: { playfair: document.fonts.check('italic 40px "Playfair Egg"', 'lushiva'), noto: document.fonts.check('40px "Noto Serif SC Sub"', '纪念日快乐') } }; });
  console.log('egg card', JSON.stringify(card));
  await shot(`egg_${tag}`);
}
console.log('fonts loaded', JSON.stringify(await fontsOk()));
console.log('total transfer bytes', bytes, JSON.stringify(phaseBytes));
console.log('console errors/warnings', errs.length, '\n  ' + errs.join('\n  '));
console.log('http errors/failed', bad.length, '\n  ' + bad.join('\n  '));
fs.writeFileSync(`${dir}/live_${tag}_requests.txt`, [...reqs].map(([u, s]) => `${s} ${u}`).join('\n'));
await browser.close();
