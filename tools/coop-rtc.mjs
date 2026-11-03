// Headless two-page WebRTC test of /coop/: host offer -> guest answer -> host accept -> both playing, snapshots flowing.
// NOTE: this box's managed Chrome policy (WebRtcIPHandling = disable_non_proxied_udp) yields zero ICE candidates, so the pages
// never connect HERE; run it on a normal machine. The signalling itself is checked in Node by tools/coop-net-test.ts.
//   node tools/coop-rtc.mjs [base=http://localhost:8811/] [shotDir]
import puppeteer from 'puppeteer-core';
const base = process.argv[2] || 'http://localhost:8811/', dir = process.argv[3];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
const errs = [];
const page = async () => { const p = await b.newPage(); await p.setViewport({ width: 844, height: 390, deviceScaleFactor: 2 }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); return p; };
const A = await page(); await A.goto(base + 'coop/?lang=zh'); await A.click('[data-m="duo"]');
await A.waitForFunction(() => window.__code, { timeout: 15000 }); const offer = await A.evaluate(() => window.__code);
console.log('offer url length', offer.length);
if (dir) await A.screenshot({ path: `${dir}/coop-offer-qr.png` });
const B = await page(); await B.goto(offer.replace(/^https?:\/\/[^/]+\//, base));
await B.waitForFunction(() => window.__code, { timeout: 15000 }); const answer = await B.evaluate(() => window.__code);
console.log('answer url length', answer.length);
await A.evaluate(a => window.__accept(a), answer);
const sdp = await A.evaluate(() => window.__link.pc.localDescription.sdp); console.log(sdp.split('\n').filter(l => /candidate|fingerprint/.test(l)).join('\n'));
for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 1000)); console.log('A', await A.evaluate(() => [window.__link.pc.iceConnectionState, window.__link.pc.connectionState, window.__link.ch.readyState].join(' ')), 'B', await B.evaluate(() => [window.__link.pc.iceConnectionState, window.__link.pc.connectionState].join(' '))); }
await A.waitForFunction(() => document.body.classList.contains('cp-playing'), { timeout: 15000 });
await B.waitForFunction(() => document.body.classList.contains('cp-playing'), { timeout: 15000 });
console.log('both playing');
await new Promise(r => setTimeout(r, 1500));
// guest presses right for 1 s -> the host's cat must move
const x0 = await A.evaluate(() => window.__coop.sim.b[1].x);
await B.keyboard.down('ArrowRight'); await new Promise(r => setTimeout(r, 1000)); await B.keyboard.up('ArrowRight');
await new Promise(r => setTimeout(r, 400));
const x1 = await A.evaluate(() => window.__coop.sim.b[1].x), gx = await B.evaluate(() => window.__coop.sim.b[1].x);
console.log('cat x on host', x0.toFixed(1), '->', x1.toFixed(1), '| guest replica', gx.toFixed(1));
if (dir) { await A.screenshot({ path: `${dir}/coop-duo-host.png` }); await B.screenshot({ path: `${dir}/coop-duo-guest.png` }); }
console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no console errors');
await b.close();
