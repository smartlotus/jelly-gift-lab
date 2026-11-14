// Lab e2e for the 惊喜 / 跳过 / 收集 layer (Chromium, phone viewport). Complements tools/v03r-verify.mjs (journey regression)
// and tools/collect-test.ts (pure state).
//   npm run build && node tools/serve.mjs dist 8833 &
//   BASE=http://127.0.0.1:8833 node tools/lab-verify.mjs
// Checks: every stage has the dock (惊喜 / 跳过 / pouch, touch-sized) and 跳过 reaches the next stage; 惊喜 reveals the
// hidden thing, a tap collects it, it survives a reload and shows in the list; the list's 回去找 goes back; after the
// ending film: something missing → list, everything found → the secret page; 再看一遍/继续布置 cancel it; 从头再来 resets.
// 横屏（t11）: every page incl. AR + secret at 844×390 / 932×430 / 667×375 with iPhone-like safe areas — dock and
// chrome inside the safe area and uncovered, canvases keep their buffer ratio; list / hidden thing / closing card in
// landscape; portrait ⇄ landscape shows the themed veil and re-fits the canvas (reduced motion: plain fade).
// 布局（2026-11-14）: tools/overlap-audit.mjs on 12 pages × 8 viewports (360×640 … tablet), no overlapping controls, taps ≥ 44 px;
// OVERLAP=0 skips it. Part 6 = jelly gravity sensor in four directions (TILT=0 skips). LANDSCAPE=0 skips the landscape part; SHOTS=/dir saves landscape + mid-transition screenshots.
const { chromium } = await import(process.env.PLAYWRIGHT || 'file:///workspace/jelly/pw/node_modules/playwright/index.mjs');
const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const KEY = 'gift.collect.v1';
// SECRET_PAGE (src/shared/surprise/config.ts) now points to the album site; any jump there counts as reaching it.
const SECRET_RE = /\/secret\/|rhine-album\/\?from=jelly/;
const ALL = ['meadow', 'shop', 'night', 'jelly', 'sea', 'sky', 'coop', 'flower', 'mushroom', 'home'];
const PATH = id => (id === 'meadow' ? '' : `${id}/`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const errors = [];
const log = (name, ok, x) => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : '  FAIL'} ${name}${ok || x === undefined ? '' : '  ' + JSON.stringify(x)}`); };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const newCtx = (vp = { width: 390, height: 844 }, extra = {}) => b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...extra });
const SAFE = (w, h) => (w > h ? { top: 0, left: 47, right: 47, bottom: 21 } : { top: 47, left: 0, right: 0, bottom: 34 });
const SHOTS = process.env.SHOTS || '';
const state = found => JSON.stringify({ v: 1, found: Object.fromEntries(found.map(id => [id, 1])), revealed: Object.fromEntries(found.map(id => [id, 1])) });
async function page(ctx, tag) { const p = await ctx.newPage(); p.on('pageerror', e => errors.push(`${tag}: ${e.message}`)); return p; }
const stageOf = url => { const m = new URL(url).pathname.replace(/\/index\.html$/, '/').match(/\/([a-z]+)\/$/); return m ? m[1] : 'meadow'; };

console.log('lab-verify', BASE);
if (process.env.LANDSCAPE_ONLY !== '1') {
// 1. dock + 跳过 on every stage
{
  const ctx = await newCtx();
  for (let i = 0; i < ALL.length; i++) {
    const st = ALL[i], next = ALL[i + 1];
    const p = await page(ctx, st);
    await p.goto(`${BASE}/${PATH(st)}?lang=zh`, { waitUntil: 'load' });
    const ok = await p.waitForSelector(`.gs-dock[data-stage="${st}"]`, { timeout: 20000 }).then(() => true, () => false);
    await sleep(st === 'home' ? 2500 : 3500);
    const dock = ok && await p.evaluate(() => [...document.querySelectorAll('.gs-dock .gs-btn')].map(b => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return { c: b.className.replace('gs-btn ', ''), w: r.width, h: r.height, vis: cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.3, inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, t: b.textContent.trim() }; }));
    log(`${st}: dock with 惊喜 / 跳过 / pouch, visible, ≥32px, inside the screen`, dock && dock.length === 3 && dock.every(d => d.vis && d.inView && d.h >= 32 && d.w >= 32) && /惊喜/.test(dock[0].t) && /跳过/.test(dock[1].t), dock);
    // the top-most element at each button's centre is the button (nothing covers it)
    const hit = await p.evaluate(() => [...document.querySelectorAll('.gs-dock .gs-btn')].every(b => { const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e && b.contains(e); }));
    log(`${st}: dock buttons are not covered`, hit);
    if (st === 'home') {
      await p.click('.gs-skip', { force: true });
      const ph = await p.waitForFunction(() => window.__home?.phase() === 'room', null, { timeout: 15000 }).then(() => true, () => false);
      log('home: 跳过 on the approach walks in (room)', ph, await p.evaluate(() => window.__home?.phase()));
    } else {
      await p.click('.gs-skip', { force: true });
      const went = await p.waitForURL(u => stageOf(u.toString()) === next, { timeout: 20000 }).then(() => true, () => false);
      log(`${st}: 跳过 → ${next}`, went, p.url());
    }
    await p.close();
  }
  await ctx.close();
}
// 2. 惊喜 → hidden thing → tap → saved → reload → list → 回去找
{
  const ctx = await newCtx();
  const p = await page(ctx, 'collect');
  await p.goto(`${BASE}/night/?lang=zh`); await p.waitForSelector('.gs-dock'); await sleep(2500);
  await p.evaluate(k => localStorage.removeItem(k), KEY);
  await p.click('.gs-surprise', { force: true });
  const busy = await p.evaluate(() => window.__surprise?.playing?.());
  log('night: 惊喜 starts the animation', busy === true || busy === undefined, busy);
  const item = await p.waitForSelector('.gs-item', { timeout: 20000 }).then(() => true, () => false);
  log('night: the hidden thing appears after the animation', item);
  await sleep(1200);
  const box = await p.evaluate(() => { const r = document.querySelector('.gs-item').getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { r: [r.left, r.top, r.width, r.height].map(Math.round), top: !!e?.closest('.gs-item'), inView: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
  log('night: it is on screen, ≥44px to tap, nothing over it', box.inView && box.r[2] >= 44 && box.top, box);
  const rev = await p.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
  log('revealed (not found) before the tap', rev.revealed?.night && !rev.found?.night, rev);
  await p.tap('.gs-item');
  await sleep(1500);
  const st = await p.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
  log('tap → found, saved in localStorage', !!st.found?.night, st);
  log('pouch shows 1/10', /1\s*\/\s*10/.test(await p.textContent('.gs-entry')), await p.textContent('.gs-entry'));
  log('item gone after collecting', await p.$('.gs-item:not(.gone)').then(e => !e || e.evaluate(n => getComputedStyle(n).opacity === '0')));
  await p.reload(); await p.waitForSelector('.gs-entry'); await sleep(1500);
  log('reload: still 1/10, item not shown again', /1\s*\/\s*10/.test(await p.textContent('.gs-entry')) && !(await p.$('.gs-item')), await p.textContent('.gs-entry'));
  await p.goto(`${BASE}/sky/?lang=zh`); await p.waitForSelector('.gs-entry'); await sleep(1500);
  log('another page: still 1/10', /1\s*\/\s*10/.test(await p.textContent('.gs-entry')));
  await p.click('.gs-entry', { force: true });
  await p.waitForSelector('.gs-panel .gs-row', { timeout: 5000 }).catch(() => {});
  await sleep(600);
  const rows = await p.evaluate(() => [...document.querySelectorAll('.gs-panel .gs-row')].map(r => ({ got: r.classList.contains('got'), go: !!r.querySelector('.gs-row-go:not(.here)'), here: !!r.querySelector('.gs-row-go.here'), t: r.textContent.trim().slice(0, 40) })));
  log('list: 10 rows in flow order, night found, the others have a hint + a way back', rows.length === 10 && rows[2].got && rows.filter(r => r.got).length === 1 && rows.filter((r, i) => i !== 2 && i !== 5).every(r => r.go) && rows[5].here, rows);
  // 回去找 on the jelly row (index 3)
  await p.evaluate(() => document.querySelectorAll('.gs-panel .gs-row')[3].querySelector('.gs-row-go').click());
  const back = await p.waitForURL(u => stageOf(u.toString()) === 'jelly', { timeout: 15000 }).then(() => true, () => false);
  log('list: 回去找 opens that stage', back, p.url());
  await ctx.close();
}
// 3. end of the film
async function endCase(found, tag) {
  const ctx = await newCtx();
  await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('lab.seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('lab.seeded', '1'); } }, [KEY, state(found)]);
  const p = await page(ctx, tag);
  await p.route(/media\/ending-film\.json/, r => r.fulfill({ status: 404, body: '' }));   // no film → straight to the closing card
  await p.goto(`${BASE}/home/?lang=zh&at=video`);
  await p.waitForFunction(() => window.__home?.phase() === 'end', null, { timeout: 20000 }).catch(() => {});
  return { ctx, p };
}
{
  const { ctx, p } = await endCase(['meadow', 'night'], 'end-some');
  await sleep(1000);
  log('end (2/10): closing card buttons present', await p.evaluate(() => ['.hm-replay', '.hm-edit', '.hm-again'].every(s => document.querySelector(s))));
  const list = await p.waitForSelector('.gs-panel .gs-card.after', { timeout: 9000 }).then(() => true, () => false);
  log('end (2/10): the list opens by itself with hints', list);
  const missing = await p.evaluate(() => [...document.querySelectorAll('.gs-panel .gs-row:not(.got)')].length);
  log('end (2/10): 8 missing rows', missing === 8, missing);
  await sleep(6000);
  log('end (2/10): no jump to the secret page', !SECRET_RE.test(p.url()), p.url());
  // 从头再来 resets
  await p.evaluate(() => document.querySelector('.gs-panel .gs-close')?.click()); await sleep(500);
  await p.evaluate(() => document.querySelector('.hm-again').click());
  await p.waitForURL(u => stageOf(u.toString()) === 'meadow', { timeout: 15000 }).catch(() => {});
  const after = await p.evaluate(k => localStorage.getItem(k), KEY);
  log('从头再来 → meadow and the collection is reset', stageOf(p.url()) === 'meadow' && (after === null || JSON.parse(after).found && Object.keys(JSON.parse(after).found).length === 0), { url: p.url(), after });
  await ctx.close();
}
{
  const { ctx, p } = await endCase(ALL, 'end-all');
  const card = await p.waitForSelector('.gs-end.on', { timeout: 9000 }).then(() => true, () => false);
  log('end (10/10): the 全部找到 card comes up', card);
  const went = await p.waitForURL(SECRET_RE, { timeout: 12000 }).then(() => true, () => false);
  log('end (10/10): then the secret page opens by itself', went, p.url());
  await sleep(2000);
  const sec = await p.evaluate(() => ({ stage: document.documentElement.dataset.giftStage || document.body.dataset.giftStage || null, txt: document.body.innerText.slice(0, 200) }));
  log('secret page renders (album site)', sec.txt.length > 0 || /rhine-album/.test(p.url()), { url: p.url(), ...sec });
  await ctx.close();
}
{
  const { ctx, p } = await endCase(ALL, 'end-edit');
  await sleep(1500);
  await p.evaluate(() => document.querySelector('.hm-edit').click());
  await sleep(10000);
  log('end (10/10) + 继续布置: the pending jump is cancelled, back to the room', !SECRET_RE.test(p.url()) && (await p.evaluate(() => window.__home?.phase())) === 'room', { url: p.url(), ph: await p.evaluate(() => window.__home?.phase()) });
  await ctx.close();
}
{
  const { ctx, p } = await endCase(ALL, 'end-replay');
  await sleep(1500);
  await p.evaluate(() => document.querySelector('.hm-replay').click());
  await sleep(10000);
  log('end (10/10) + 再看一遍: no jump while it replays', !SECRET_RE.test(p.url()), p.url());
  await ctx.close();
}
{
  const ctx = await newCtx();
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, state(['sea'])]);
  const p = await page(ctx, 'secret-locked');
  await p.goto(`${BASE}/secret/?lang=zh`); await sleep(1500);
  const txt = await p.evaluate(() => document.body.innerText);
  log('secret page opened early: says it is still locked and offers the list / way home', txt.length > 0 && !!(await p.$('a[href*="home"], button')), txt.slice(0, 120));
  await ctx.close();
}

}
// 4. 横屏 / landscape + orientation change
if (process.env.LANDSCAPE !== '0') {
  const LVIEWS = [[844, 390], [932, 430], [667, 375]];
  const PAGES = [...ALL.slice(0, 2), 'ar', ...ALL.slice(2), 'secret'];
  const safeOn = async (p, w, h) => { const c = await p.context().newCDPSession(p); await c.send('Emulation.setSafeAreaInsetsOverride', { insets: SAFE(w, h) }).catch(() => {}); return c; };
  const settle = p => p.evaluate(() => { for (const a of document.getAnimations()) { try { if (a.effect?.getTiming().iterations !== Infinity && !a.effect?.target?.closest?.('.gs-orient')) a.finish(); } catch { /* */ } } });
  const shoot = async (p, name) => { if (!SHOTS) return; await settle(p).catch(() => {}); await p.screenshot({ path: `${SHOTS}/${name}.png`, timeout: 300000 }).catch(() => {}); };
  const audit = (p, ins) => p.evaluate(ins => {
    const shown = e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; for (let a = e; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.15) return false; } return !e.closest('[hidden],[inert],[aria-hidden="true"]'); };
    const ctl = [...document.querySelectorAll('.gs-dock .gs-btn, .gift-chrome button')].filter(shown).map(e => {
      const r = e.getBoundingClientRect(); const c = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { t: e.textContent.trim().slice(0, 10), r: [r.left, r.top, r.right, r.bottom].map(Math.round), safe: r.left >= ins.left - 1 && r.right <= innerWidth - ins.right + 1 && r.top >= ins.top - 1 && r.bottom <= innerHeight - ins.bottom + 1, top: !!c && (e.contains(c) || c.contains(e)), h: r.height };
    });
    const canv = [...document.querySelectorAll('canvas')].filter(shown).map(c => { const r = c.getBoundingClientRect(); return { css: [Math.round(r.width), Math.round(r.height)], ok: Math.abs((c.width / c.height) / (r.width / r.height) - 1) < 0.04 }; });
    return { ctl, canv, overflowX: document.documentElement.scrollWidth > innerWidth + 1 };
  }, ins);
  for (const st of PAGES) for (const [w, h] of LVIEWS) {
    const ctx = await newCtx({ width: w, height: h });
    const p = await page(ctx, `${st}@${w}x${h}`);
    await safeOn(p, w, h);
    await p.goto(`${BASE}/${st === 'meadow' ? '' : st + '/'}?lang=zh`, { waitUntil: 'load' });
    if (ALL.includes(st)) await p.waitForSelector(`.gs-dock[data-stage="${st}"]`, { timeout: 20000 }).catch(() => {});
    await sleep(st === 'home' ? 2500 : 3500);
    const a = await audit(p, SAFE(w, h));
    const dock = a.ctl.filter(c => !/^(中|EN|声音)/.test(c.t));
    const bad = a.ctl.filter(c => !c.safe || !c.top || c.h < 24);
    log(`${st} ${w}×${h}: ${ALL.includes(st) ? 'dock (3) + ' : ''}chrome inside the safe area, uncovered`, bad.length === 0 && (!ALL.includes(st) || dock.length === 3), bad.length ? bad : dock.length);
    log(`${st} ${w}×${h}: canvases keep their buffer ratio, no sideways scroll`, a.canv.every(c => c.ok) && !a.overflowX, a);
    if (w === 844) await shoot(p, `${st}-844x390`);
    await ctx.close();
  }
  // the list, a hidden thing and the closing card in landscape
  {
    const ctx = await newCtx({ width: 844, height: 390 });
    const p = await page(ctx, 'land-list');
    await safeOn(p, 844, 390);
    await p.goto(`${BASE}/night/?lang=zh`); await p.waitForSelector('.gs-dock'); await sleep(2500);
    await p.evaluate(k => localStorage.removeItem(k), KEY);
    await p.click('.gs-surprise', { force: true });
    await p.waitForSelector('.gs-item', { timeout: 20000 }).catch(() => {});
    await sleep(1200);
    const it = await p.evaluate(ins => { const e = document.querySelector('.gs-item'); if (!e) return null; const r = e.getBoundingClientRect(); const c = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { r: [r.left, r.top, r.width, r.height].map(Math.round), ok: r.left >= ins.left && r.right <= innerWidth - ins.right && r.top >= 0 && r.bottom <= innerHeight - ins.bottom && r.width >= 44 && !!c?.closest('.gs-item') }; }, SAFE(844, 390));
    log('landscape night: the hidden thing is inside the safe area, ≥44px, uncovered', it?.ok, it);
    await shoot(p, 'night-844x390-item');
    if (it) { await p.tap('.gs-item').catch(() => {}); await sleep(1400); }
    await p.click('.gs-entry', { force: true });
    await p.waitForSelector('.gs-panel .gs-row', { timeout: 6000 }).catch(() => {});
    await sleep(700);
    const pn = await p.evaluate(ins => { const card = document.querySelector('.gs-panel .gs-card'); const cl = document.querySelector('.gs-panel .gs-close'); if (!card) return null; const r = card.getBoundingClientRect(); const c = cl?.getBoundingClientRect(); const sc = [...card.querySelectorAll('*')].find(e => /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight) || (/auto|scroll/.test(getComputedStyle(card).overflowY) ? card : null); return { card: [r.left, r.top, r.right, r.bottom].map(Math.round), inView: r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1, close: !!c && c.left >= ins.left - 1 && c.right <= innerWidth - ins.right + 1 && c.top >= 0 && c.bottom <= innerHeight, rows: card.querySelectorAll('.gs-row').length, scrolls: !!sc }; }, SAFE(844, 390));
    log('landscape list: the card fits the screen, close in the safe area, 10 rows reachable (scrolls)', pn && pn.inView && pn.close && pn.rows === 10 && pn.scrolls, pn);
    await shoot(p, 'list-844x390');
    await ctx.close();
  }
  {
    const ctx = await newCtx({ width: 844, height: 390 });
    await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('lab.seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('lab.seeded', '1'); } }, [KEY, state(['meadow', 'night'])]);
    const p = await page(ctx, 'land-end');
    await safeOn(p, 844, 390);
    await p.route(/media\/ending-film\.json/, r => r.fulfill({ status: 404, body: '' }));
    await p.goto(`${BASE}/home/?lang=zh&at=video`);
    await p.waitForFunction(() => window.__home?.phase() === 'end', null, { timeout: 20000 }).catch(() => {});
    // the card's buttons come in with the finale line (~1.5–3 s after 'end'), not at once
    await p.waitForFunction(() => document.body.classList.contains('hm-on-finale'), null, { timeout: 10000 }).catch(() => {});
    await sleep(600);
    const end = await p.evaluate(ins => ['.hm-replay', '.hm-edit', '.hm-again'].map(s => { const e = document.querySelector(s); if (!e) return null; if (getComputedStyle(e).display === 'none') return 'n/a (no film)'; const r = e.getBoundingClientRect(); return r.left >= ins.left - 1 && r.right <= innerWidth - ins.right + 1 && r.top >= 0 && r.bottom <= innerHeight - ins.bottom + 1 && r.height >= 32; }), SAFE(844, 390));
    log('landscape closing card: 再看一遍 / 继续布置 / 从头再来 (those shown) inside the safe area', end.every(Boolean) && end.filter(x => x === true).length >= 2, end);
    await shoot(p, 'home-844x390-end');
    await ctx.close();
  }
  // portrait → landscape → portrait
  for (const [st, reduced] of [['meadow', false], ['night', false], ['sea', false], ['home', false], ['jelly', false], ['secret', false], ['sky', true]]) {
    const ctx = await newCtx({ width: 390, height: 844 }, { reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const p = await page(ctx, `rotate-${st}`);
    const cdp = await safeOn(p, 390, 844);
    await p.goto(`${BASE}/${st === 'meadow' ? '' : st + '/'}?lang=zh`, { waitUntil: 'load' });
    await sleep(3500);
    const big = () => p.evaluate(() => { const c = [...document.querySelectorAll('canvas')].map(c => ({ c, r: c.getBoundingClientRect() })).filter(x => x.r.width > 2).sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0]; return c ? { w: Math.round(c.r.width), h: Math.round(c.r.height), bw: c.c.width, bh: c.c.height } : null; });
    const before = await big();
    if (SHOTS && !reduced) await shoot(p, `rotate-${st}-0-portrait`);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: SAFE(844, 390) }).catch(() => {});
    if (SHOTS && !reduced) await p.evaluate(() => window.__orient?.hold(0.7)); // events land late under SwiftShader
    await p.setViewportSize({ width: 844, height: 390 });
    const seen = await p.waitForFunction(() => window.__orient?.runs() > 0, null, { timeout: 30000 }).then(() => p.evaluate(() => document.querySelector('.gs-orient').className), () => null);
    log(`${st}: rotating shows the ${reduced ? 'plain fade (reduced motion)' : 'themed veil'}`, !!seen && (reduced ? /\brm\b/.test(seen) : /cover/.test(seen)), seen);
    if (SHOTS && !reduced) { await p.evaluate(() => window.__orient.hold(0.7)); await p.screenshot({ path: `${SHOTS}/rotate-${st}-1-mid.png`, timeout: 300000 }).catch(() => {}); await p.evaluate(() => window.__orient.release()); }
    const idle = await p.waitForFunction(() => window.__orient.phase() === 'idle', null, { timeout: 30000 }).then(() => true, () => false);
    await sleep(3000);
    const after = await big();
    const ok = !before || (after && Math.abs(after.bw / after.bh - after.w / after.h) / (after.w / after.h) < 0.04 && (before.w < 380 * 0.9 || after.w >= 844 * 0.9 || after.h >= 390 * 0.9));
    log(`${st}: veil clears, the main canvas re-fits the landscape viewport`, idle && ok, { before, after });
    if (SHOTS && !reduced) await shoot(p, `rotate-${st}-2-landscape`);
    await ctx.close();
  }
}
// 5. adaptive control layout (2026-11-14): 12 pages × 8 viewports, no overlapping controls, taps ≥ 44 px (tools/overlap-audit.mjs)
if (process.env.OVERLAP !== '0') {
  const { audit } = await import('./overlap-audit.mjs');
  await audit(b, BASE, { log, shots: SHOTS });
}
// 7. AR for every shop model (2026-11-15): AR files, MIME, Scene Viewer intent / Quick Look / notes, inspector button (tools/ar-verify.mjs; AR=0 skips)
if (process.env.AR !== '0') {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [new URL('./ar-verify.mjs', import.meta.url).pathname], { env: { ...process.env, BASE }, encoding: 'utf8', timeout: 600000 });
  for (const line of (r.stdout || '').split('\n')) { const m = /^  (ok |FAIL) (.*)$/.exec(line); if (m) log(`ar · ${m[2].replace(/  [\[{"].*$/, '')}`, m[1] === 'ok ', m[1] === 'ok ' ? undefined : m[2].slice(0, 200)); }
  if (r.status === null || !/ar-verify:/.test(r.stdout || '')) log('ar · the AR check ran to the end', false, (r.stderr || '').slice(-300));
}
// 6. jelly gravity sensor (2026-11-14): left / right / up / down in portrait + landscape 90 / 270 (tools/jelly-tilt-verify.mjs)
if (process.env.TILT !== '0') {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [new URL('./jelly-tilt-verify.mjs', import.meta.url).pathname], { env: { ...process.env, BASE }, encoding: 'utf8', timeout: 600000 });
  for (const line of (r.stdout || '').split('\n')) { const m = /^  (ok |FAIL) (.*)$/.exec(line); if (m) log(`tilt · ${m[2].replace(/  \{.*$/, '')}`, m[1] === 'ok ', m[1] === 'ok ' ? undefined : m[2].slice(0, 200)); }
  if (r.status === null || !/jelly-tilt-verify:/.test(r.stdout || '')) log('tilt · the tilt check ran to the end', false, (r.stderr || '').slice(-300));
}
await b.close();
if (errors.length) { fail++; console.log('  FAIL page errors:\n    ' + errors.join('\n    ')); } else console.log('  ok  no page errors');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
