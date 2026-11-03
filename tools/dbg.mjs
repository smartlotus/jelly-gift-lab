import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage(); await page.setViewport({width:800,height:500});
page.on('console', m => { if (!m.text().includes('stall')) console.log(m.text().slice(0,300)); });
await page.goto('http://localhost:8800/jelly/?backend=webgl2'); await page.waitForFunction(() => window.__jellyReady, {timeout: 60000});
await new Promise(r=>setTimeout(r,2000));
console.log(await page.evaluate(() => { const e = window.__jelly; const n = e.path.nodes(); return JSON.stringify({ first: n ? Array.from(n.data.slice(0, 20)) : null, nan: n ? n.data.findIndex(v => Number.isNaN(v)) : -2, len: n?.data.length, simTime: e.simTime, act: Array.from(e.act) }); }));
await browser.close();
