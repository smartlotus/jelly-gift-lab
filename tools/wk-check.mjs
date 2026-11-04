import { webkit, chromium, devices } from 'playwright';
const base = process.argv[2] || 'http://localhost:8811/';
const out = process.argv[3] || '/workspace/jelly/shots/v03e';
const eng = process.argv[4] || 'webkit';
import fs from 'fs'; fs.mkdirSync(out, { recursive: true });
const pages = (process.argv[5] || 'meadow:,shop:shop/,night:night/,jelly:jelly/?from=night,jellyplain:jelly/,sea:sea/?from=jelly,sky:sky/,coop:coop/,ar:ar/').split(',').map(s => s.split(/:(.*)/s));
const b = eng === 'webkit' ? await webkit.launch({ env: { ...process.env, GIO_EXTRA_MODULES: '/opt/wk/usr/lib/x86_64-linux-gnu/gio/modules', GIO_USE_PROXY_RESOLVER: 'dummy', GSETTINGS_BACKEND: 'memory' } }) : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader'] });
const ctx = await b.newContext({ ...devices['iPhone 15'], ignoreHTTPSErrors: true });
if (base.startsWith('https')) await ctx.route(u => /^https?:/.test(u.href), async r => { try { r.fulfill({ response: await r.fetch() }); } catch (e) { r.abort(); } }); // WPE here lacks a working TLS stack: node fetches the live files
let bad = 0;
for (const [name, path] of pages) {
  const p = await ctx.newPage(); const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  const t0 = Date.now();
  await p.goto(base + path, { waitUntil: 'commit' });
  await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${eng}-${name}-0-curtain.png` });
  let gone = false;
  for (let i = 0; i < 60 && !gone; i++) { await p.waitForTimeout(500); gone = await p.evaluate(() => { const c = document.getElementById('gift-curtain'); return !c || c.classList.contains('gcc-gone'); }); }
  const dt = Date.now() - t0;
  await p.waitForTimeout(2500);
  const st = await p.evaluate(() => ({ jr: window.__jellyReady, fail: document.getElementById('gift-curtain')?.className, errs: window.__curtain?.errors }));
  await p.screenshot({ path: `${out}/${eng}-${name}-1-ready.png` });
  console.log(name, gone ? `revealed ${dt}ms` : 'CURTAIN STUCK', JSON.stringify(st), errs.length ? '\n   ' + errs.join('\n   ') : '');
  if (!gone || errs.some(e => e.startsWith('error') || e.startsWith('pageerror'))) bad++;
  await p.close();
}
await b.close(); console.log(bad ? `${bad} BAD` : 'ALL OK');
