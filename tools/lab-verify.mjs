// Lab e2e for the 惊喜 / 跳过 / 收集 layer (Chromium, phone viewport). Complements tools/v03r-verify.mjs (journey regression)
// and tools/collect-test.ts (pure state).
//   npm run build && node tools/serve.mjs dist 8833 &
//   BASE=http://127.0.0.1:8833 node tools/lab-verify.mjs
// Checks: every stage has the dock (惊喜 / 跳过 / pouch, touch-sized) and 跳过 reaches the next stage; 惊喜 reveals the
// hidden thing, a tap collects it, it survives a reload and shows in the list; the list's 回去找 goes back; after the
// ending film: something missing → list, everything found → the secret page; 再看一遍/继续布置 cancel it; 从头再来 resets.
import { chromium } from 'file:///workspace/jelly/pw/node_modules/playwright/index.mjs';
const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const KEY = 'gift.collect.v1';
const ALL = ['meadow', 'shop', 'night', 'jelly', 'sea', 'sky', 'coop', 'flower', 'mushroom', 'home'];
const PATH = id => (id === 'meadow' ? '' : `${id}/`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const errors = [];
const log = (name, ok, x) => { ok ? pass++ : fail++; console.log(`${ok ? '  ok ' : '  FAIL'} ${name}${ok || x === undefined ? '' : '  ' + JSON.stringify(x)}`); };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const newCtx = () => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const state = found => JSON.stringify({ v: 1, found: Object.fromEntries(found.map(id => [id, 1])), revealed: Object.fromEntries(found.map(id => [id, 1])) });
async function page(ctx, tag) { const p = await ctx.newPage(); p.on('pageerror', e => errors.push(`${tag}: ${e.message}`)); return p; }
const stageOf = url => { const m = new URL(url).pathname.replace(/\/index\.html$/, '/').match(/\/([a-z]+)\/$/); return m ? m[1] : 'meadow'; };

console.log('lab-verify', BASE);
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
  log('end (2/10): no jump to the secret page', !/\/secret\//.test(p.url()), p.url());
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
  const went = await p.waitForURL(/\/secret\//, { timeout: 12000 }).then(() => true, () => false);
  log('end (10/10): then the secret page opens by itself', went, p.url());
  await sleep(2000);
  const sec = await p.evaluate(() => ({ stage: document.documentElement.dataset.giftStage || document.body.dataset.giftStage || null, txt: document.body.innerText.slice(0, 200) }));
  log('secret page renders (placeholder)', sec.txt.length > 0, sec);
  await ctx.close();
}
{
  const { ctx, p } = await endCase(ALL, 'end-edit');
  await sleep(1500);
  await p.evaluate(() => document.querySelector('.hm-edit').click());
  await sleep(10000);
  log('end (10/10) + 继续布置: the pending jump is cancelled, back to the room', !/\/secret\//.test(p.url()) && (await p.evaluate(() => window.__home?.phase())) === 'room', { url: p.url(), ph: await p.evaluate(() => window.__home?.phase()) });
  await ctx.close();
}
{
  const { ctx, p } = await endCase(ALL, 'end-replay');
  await sleep(1500);
  await p.evaluate(() => document.querySelector('.hm-replay').click());
  await sleep(10000);
  log('end (10/10) + 再看一遍: no jump while it replays', !/\/secret\//.test(p.url()), p.url());
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
await b.close();
if (errors.length) { fail++; console.log('  FAIL page errors:\n    ' + errors.join('\n    ')); } else console.log('  ok  no page errors');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
