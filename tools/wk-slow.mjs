// the curtain is a solid colour first; the pig only hops in if the page is slow (~700 ms)
import { webkit, devices } from 'playwright';
const base = process.argv[2] || 'http://localhost:8811/';
const b = await webkit.launch({ env: { ...process.env, GIO_USE_PROXY_RESOLVER: 'dummy', GSETTINGS_BACKEND: 'memory' } });
const ctx = await b.newContext({ ...devices['iPhone 15'] });
await ctx.route(/\.js(\?.*)?$/, async r => { await new Promise(x => setTimeout(x, 1500)); try { await r.continue(); } catch {} });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const cls = () => p.evaluate(() => document.getElementById('gift-curtain')?.className + ' | pigOpacity=' + getComputedStyle(document.querySelector('#gift-curtain .gcc-stage')).opacity + ' | labels=' + document.querySelectorAll('#gift-curtain .gcc-to').length);
await p.goto(base + 'shop/', { waitUntil: 'commit' });
await p.waitForTimeout(450); console.log('t=450ms', await cls()); await p.screenshot({ path: '/workspace/jelly/shots/v03g/curtain-450.png' });
await p.waitForTimeout(900); console.log('t=1350ms', await cls()); await p.screenshot({ path: '/workspace/jelly/shots/v03g/curtain-1350.png' });
await p.waitForTimeout(6000); console.log('t=7s', await cls(), errs);
await b.close();
