// v03f night playthrough in WebKit iPhone 15 emulation: boots, walks every route (holding the screen), solves puzzles by
// clicking through them, picks up stickers, reaches each ending. Screenshots into the out dir; console errors fail.
import { webkit, devices } from 'playwright';
import fs from 'fs';
const base = process.argv[2] || 'http://localhost:8811/';
const out = process.argv[3] || '/workspace/jelly/shots/v03f'; fs.mkdirSync(out, { recursive: true });
const only = process.argv[4] || '';
const b = await webkit.launch({ env: { ...process.env, GIO_EXTRA_MODULES: '/opt/wk/usr/lib/x86_64-linux-gnu/gio/modules', GIO_USE_PROXY_RESOLVER: 'dummy', GSETTINGS_BACKEND: 'memory' } });
const ctx = await b.newContext({ ...devices['iPhone 15'], ignoreHTTPSErrors: true });
if (base.startsWith('https')) await ctx.route(u => /^https?:/.test(u.href), async r => { try { r.fulfill({ response: await r.fetch() }); } catch { r.abort(); } });
const p = await ctx.newPage(); const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('error: ' + m.text()); if (m.text().startsWith('[t]')) console.log(m.text()); });
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
const N = () => p.evaluate(() => { const n = window.__night; return n ? { phase: n.phase, edge: n.edge, s: +n.s.toFixed(1), node: n.node } : null; });
const shot = async n => { await p.screenshot({ path: `${out}/${n}.png` }); console.log('  shot', n, JSON.stringify(await N())); };
let shotSt = 0; let lookAround = process.argv[5] === 'look';
const W = ms => p.waitForTimeout(ms);
async function holdWalk(until, max = 60000) { // press on the canvas until predicate true
  await p.mouse.move(195, 420); await p.mouse.down(); const t0 = Date.now();
  try { while (Date.now() - t0 < max) { await W(250); const st = await N(); if (!st || await until(st)) break;
    if (st.phase === 'walk' && lookAround) { const id = await p.evaluate(() => window.__night.lookAtSticker()); if (id) { await p.mouse.up(); await W(700); } }
    const pts = await p.evaluate(() => window.__night.stickersOnScreen()); if (pts.length && st.phase === 'walk') { await p.mouse.up(); await W(60); await p.mouse.click(pts[0][0], pts[0][1]); console.log('  tapped sticker', JSON.stringify(st)); await W(300); if (!shotSt++) await shot('st-pick'); await p.mouse.move(195, 420); await p.mouse.down(); } } } finally { await p.mouse.up(); }
  return N();
}
async function solve() { // click through whatever puzzle is open, cheaply (uses the auto-pass/hint behaviour)
  for (let i = 0; i < 80; i++) {
    const kind = await p.evaluate(() => { const el = document.querySelector('.pz:not(.out)'); return el ? el.className : ''; });
    if (!kind) return;
    if (kind.includes('pz-found')) await p.click('.pz-found', { force: true }).catch(() => {});
    else if (kind.includes('pz-music')) { const h = await p.$('.pz-key.hint'); if (h) await h.click({ force: true }).catch(() => {}); else await p.click('.pz-key[data-k="4"]', { force: true }).catch(() => {}); await W(900); continue; }
    else if (kind.includes('pz-candles')) { await p.click('.pz-c[data-i="4"]', { force: true }).catch(() => {}); await W(150); }
    else if (kind.includes('pz-code')) { await p.click('.pz-open', { force: true }).catch(() => {}); }
    else if (kind.includes('pz-gate')) { await p.click('.pz-open', { force: true }).catch(() => {}); }
    else if (kind.includes('pz-mush')) { const ms = await p.$$('.pz-m'); for (const m of ms) await m.click({ force: true }).catch(() => {}); }
    else if (kind.includes('pz-trail')) { const fs = await p.$$('.pz-fork'); for (const f of fs) await f.click({ force: true }).catch(() => {}); }
    await W(500);
  }
}
async function choose(edgeDir) { // pick a junction choice by edge id + dir
  for (let i = 0; i < 60; i++) { const st = await N(); if (st.phase === 'puzzle') await solve(); else if (st.phase === 'node' && await p.$('.nv-choices.on .nv-c')) break; await W(400); }
  await p.waitForSelector('.nv-choices.on .nv-c', { timeout: 15000 });
  const ok = await p.evaluate(k => { const b = [...document.querySelectorAll('.nv-c')].find(x => x.dataset.k.startsWith(k + ':')); if (b) b.click(); return !!b; }, edgeDir);
  if (!ok) throw new Error('no choice ' + edgeDir + ' have ' + await p.evaluate(() => [...document.querySelectorAll('.nv-c')].map(x => x.dataset.k).join(' ')));
  await W(200);
}
async function walkUntilStop(max = 240000) { // walk; solve puzzles; return at a junction (node phase) or ending
  const t0 = Date.now();
  while (Date.now() - t0 < max) {
    const st = await holdWalk(s => s.phase !== 'walk' && s.phase !== 'chase', 20000);
    if (!st) return st;
    if (st.phase === 'puzzle') { await solve(); await W(600); continue; }
    if (st.phase === 'node') return st;
    if (['scene', 'static', 'done', 'dead', 'turn', 'face'].includes(st.phase)) return st;
  }
  return N();
}
async function tapStickers() { // tap any visible un-taken sticker within reach by projecting it
  const pts = await p.evaluate(() => window.__night.stickersOnScreen?.() ?? []);
  for (const [x, y] of pts) { await p.mouse.click(x, y); await W(150); }
  return pts.length;
}
const t0 = Date.now();
await p.goto(base + 'night/?fresh=1', { waitUntil: 'load' });
await W(2500); await shot('00-card');
await p.mouse.click(195, 600); await W(2200); await shot('01-start');
const route = only || 'forest';
console.log('route', route);
// start -> fork (mushrooms puzzle on the way)
let st = await walkUntilStop(); console.log('at', JSON.stringify(st)); await shot('02-fork');
if (route === 'forest') {
  await choose('fw:1'); st = await walkUntilStop(); console.log('W1', JSON.stringify(st)); await shot('03-w1');
  await choose('w12:1'); st = await walkUntilStop(); console.log('W2', JSON.stringify(st)); await shot('04-w2');
  await choose('w2g:1'); st = await walkUntilStop(); console.log('G', JSON.stringify(st)); await shot('05-gate');
} else if (route === 'full') {
  // forest with the loop, then fast travel through the map to the house and the graveyard, then the tree house
  const go = async (k, tag) => { await choose(k); st = await walkUntilStop(); console.log(tag, JSON.stringify(st)); };
  const travel = async n => { await p.click('.nv-map'); await W(600); const xy = await p.evaluate(id => window.__night.mapXY(id), n); await p.mouse.click(xy[0], xy[1]); await W(1500); };
  await go('fw:1', 'W1'); await go('loop:1', 'W1 again'); await shot('10-loop'); await go('w12:1', 'W2'); await shot('11-w2');
  await go('w2g:1', 'G'); await shot('12-gate-first');
  await p.click('.nv-map'); await W(700); await shot('13-map'); await p.click('.nv-mapx'); await W(500);
  await travel('F'); await shot('14-ff');
  await go('fh:1', 'H2'); await shot('15-h2'); await go('h23:1', 'G'); 
  await travel('F'); await go('fe:1', 'E2'); await shot('16-e2'); await go('e23:1', 'E3'); await go('tun:1', 'G'); await shot('17-gate');
  await go('gg:1', 'G2'); await shot('18-g2');
  console.log('save', JSON.stringify(await p.evaluate(() => window.__night.save())));
  await choose('tree:1'); for (let i = 0; i < 40; i++) { const s2 = await holdWalk(s => s.phase !== 'walk', 20000); if (s2.phase === 'scene') break; }
  await W(3500); await shot('19-tree'); await W(6000); await shot('20-best');
} else if (route === 'ends') {
  for (const [k, tag] of [['bus:1', 'bus'], ['end:1', 'caught']]) {
    await p.goto(base + 'night/?at=G2&give=1&skip=1', { waitUntil: 'commit' }); await W(5000);
    await choose(k); for (let i = 0; i < 40; i++) { const s2 = await holdWalk(s => s.phase !== 'walk', 20000); if (!s2 || s2.phase !== 'walk') break; }
    if (tag === 'bus') { await W(4000); await shot('30-bus'); await W(5500); } else { await holdWalk(s => s.phase !== 'chase', 30000); await shot('31-chase'); await W(1600); await shot('32-turn'); await W(1500); }
    await shot('33-end-' + tag);
    await p.click('.kw-go').catch(() => {}); await W(3000); console.log(' after', tag, p.url());
  }
} else if (route === 'house') {
  await choose('fh:1'); st = await walkUntilStop(); console.log('H2', JSON.stringify(st)); await shot('03-h2');
  await choose('h23:1'); st = await walkUntilStop(); console.log('G', JSON.stringify(st)); await shot('05-gate');
} else if (route === 'grave') {
  await choose('fe:1'); st = await walkUntilStop(); console.log('E2', JSON.stringify(st)); await shot('03-e2');
  await choose('e23:1'); st = await walkUntilStop(); console.log('G', JSON.stringify(st)); await shot('05-gate');
}
console.log('save', JSON.stringify(await p.evaluate(() => window.__night.save())));
console.log('elapsed', ((Date.now() - t0) / 1000).toFixed(0) + 's');
console.log(errs.length ? errs.join('\n') : 'NO ERRORS');
await b.close();
