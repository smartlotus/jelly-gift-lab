import { webkit, devices } from 'playwright';
const b = await webkit.launch(); const ctx = await b.newContext({ ...devices['iPhone 15'], locale: 'zh-CN' });
const p = await ctx.newPage(); await p.route('**/*.bin', r => r.fulfill({ status: 404, body: 'nf' }));
await p.goto('http://localhost:8811/jelly/?from=night&lang=zh'); await p.waitForTimeout(5000);
console.log(await p.evaluate(() => [document.getElementById('gift-curtain').className, JSON.stringify(window.__curtain.errors), document.querySelector('.gcc-skip').getAttribute('href')]));
await p.screenshot({ path: '/workspace/jelly/shots/v03e/webkit-jelly-fail-card.png' }); await b.close();
