// t26 review arbitration: real-time recordings with per-frame telemetry sampled inside the page (rAF),
// so a reviewer's claim at a video timestamp can be checked against what the engine actually did.
// No test seek / teleport hooks are used during these recordings.
//   ONLY=woods|home  OUT=review/v03r/arbitration  node tools/v03r-arbitrate.mjs
import { chromium } from 'file:///workspace/jelly/pw/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync, readdirSync, rmSync } from 'fs';
import { spawnSync } from 'child_process';
import os from 'os';
import path from 'path';

const BASE = (process.env.BASE || 'http://127.0.0.1:8833').replace(/\/$/, '');
const OUT = path.resolve(process.env.OUT || 'review/v03r/arbitration');
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const dirty = spawnSync('git', ['status', '--porcelain', 'src'], { encoding: 'utf8' }).stdout.trim() ? '+uncommitted-src' : '';

async function waitCurtain(page, ms = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const gone = await page.evaluate(() => { const c = document.getElementById('gift-curtain'); return !c || c.classList.contains('gcc-gone') || c.classList.contains('gcc-out'); }).catch(() => false);
    if (gone) return;
    await sleep(80);
  }
}

/** record a clip; `sampler` is a page function run every animation frame that returns a telemetry object */
async function recordWithTelemetry(browser, name, size, ctxExtra, sampler, drive) {
  const dir = path.join(os.tmpdir(), `gift-arb-${name}`);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: size, recordVideo: { dir, size }, ...ctxExtra });
  const page = await ctx.newPage();
  const t0 = Date.now();                       // the video starts with the page
  await page.addInitScript(([src, t0]) => {
    window.__tel = [];
    const fn = new Function(`return (${src})`)();
    // debug-only sync stamp burned into the recording (this test only, never in the app): the same clock as the
    // telemetry, so a video frame can be matched to its telemetry sample exactly
    let tag = null;
    const tick = () => {
      const now = Date.now();
      try { const s = fn(); if (s) window.__tel.push({ wall: now, ...s }); } catch { /* not ready */ }
      if (!tag && document.body) { tag = document.createElement('div'); tag.style.cssText = 'position:fixed;left:2px;bottom:2px;z-index:99999;font:bold 13px monospace;color:#fff;background:#000c;padding:1px 4px;pointer-events:none'; document.body.appendChild(tag); }
      if (tag) tag.textContent = `T=${((now - t0) / 1000).toFixed(2)}`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [sampler.toString(), t0]);
  await drive(page);
  const tel = await page.evaluate(() => window.__tel);
  await ctx.close();
  const webm = readdirSync(dir).find(f => f.endsWith('.webm'));
  const mp4 = `${OUT}/${name}.mp4`;
  spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(dir, webm), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-preset', 'slow', '-movflags', '+faststart', '-an', mp4]);
  const dur = +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { encoding: 'utf8' }).stdout.trim();
  for (const s of tel) s.t = +((s.wall - t0) / 1000).toFixed(3);   // seconds into the video
  return { mp4, dur, tel };
}

function strip(mp4, from, to, out, crop, cols = 5) {
  const n = Math.round((to - from) * 10);
  spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(from), '-t', String(to - from), '-i', mp4, '-vf',
    `fps=10,${crop ? `crop=${crop},` : ''}drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='%{pts\\:flt\\:${from}}s':x=4:y=4:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.6,tile=${cols}x${Math.ceil(n / cols)}`,
    '-frames:v', '1', '-q:v', '3', out]);
}

// ---------------------------------------------------------------- woods
async function woods(browser) {
  const sampler = () => { const w = window.__wander; if (!w || !(w.worldW > 100)) return null; return { cat: +w.x.toFixed(2), face: w.face, vx: +w.vx.toFixed(1), pig: +w.pigX.toFixed(2), pigFace: w.pigFace, pigVx: +w.pigVx.toFixed(1), lane: +w.pigLane.toFixed(2), cam: +w.camX.toFixed(2), vw: w.viewW }; };
  const report = {};
  for (const theme of ['flower', 'mushroom']) {
    const name = `woods-${theme}-desktop`;
    const r = await recordWithTelemetry(browser, name, { width: 960, height: 540 }, {}, sampler, async page => {
      await page.goto(`${BASE}/${theme}/?lang=zh`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitCurtain(page);
      await page.waitForFunction(() => window.__wander?.worldW > 100 && window.__wander.plates > 0, { timeout: 20000 });
      await sleep(600);
      // walk in from the entrance (no seek), turn back, turn again
      await page.keyboard.down('ArrowRight'); await sleep(4000); await page.keyboard.up('ArrowRight');
      await page.keyboard.down('ArrowLeft'); await sleep(3000); await page.keyboard.up('ArrowLeft');
      await page.keyboard.down('ArrowRight'); await sleep(3000); await page.keyboard.up('ArrowRight');
      await sleep(700);
    });
    const T = r.tel;
    let maxCat = { d: 0 }, maxPig = { d: 0 }, maxCam = { d: 0 }, maxDt = 0;
    const wrongPig = [], wrongCat = [];
    for (let i = 1; i < T.length; i++) {
      const a = T[i - 1], b = T[i], dt = (b.wall - a.wall) / 1000;
      maxDt = Math.max(maxDt, dt);
      const chk = (k, m) => { const d = Math.abs(b[k] - a[k]); if (d > m.d) Object.assign(m, { d: +d.toFixed(2), t: b.t, dt: +dt.toFixed(3), perSec: +(d / Math.max(dt, 1e-3)).toFixed(1) }); };
      chk('cat', maxCat); chk('pig', maxPig); chk('cam', maxCam);
      if (Math.abs(b.pigVx) > 8 && Math.sign(b.pigVx) !== Math.sign(b.pigFace)) wrongPig.push(b.t);
      if (Math.abs(b.vx) > 20 && Math.sign(b.vx) !== Math.sign(b.face)) wrongCat.push(b.t);
    }
    // when the cat walks left steadily, what does the pig face?
    const catLeft = T.filter(s => s.vx < -20);
    const pigLeftWhileCatLeft = catLeft.filter(s => s.pigFace < 0).length;
    const pigRightWhileCatLeft = catLeft.filter(s => s.pigFace > 0);
    report[theme] = {
      clip: path.relative(process.cwd(), r.mp4), duration: r.dur, frames: T.length, maxFrameGapSec: +maxDt.toFixed(3),
      maxStep: { cat: maxCat, pig: maxPig, cam: maxCam },
      pigFacingAgainstItsMotion: wrongPig.length, catFacingAgainstMotion: wrongCat.length,
      catWalkingLeftFrames: catLeft.length, pigFacingLeftThen: pigLeftWhileCatLeft,
      pigFacingRightWhileCatLeft: { n: pigRightWhileCatLeft.length, first: pigRightWhileCatLeft[0]?.t, last: pigRightWhileCatLeft.at(-1)?.t, sample: pigRightWhileCatLeft.slice(0, 3) },
    };
    writeFileSync(`${OUT}/${name}-telemetry.json`, JSON.stringify(T));
    for (const [a, b] of [[3.5, 5.5], [6.5, 8.5], [9.5, 11.5]]) if (b < r.dur) strip(r.mp4, a, b, `${OUT}/${name}-strip-${a}-${b}s.jpg`, '960:170:0:330', 5);
  }
  return report;
}

// ---------------------------------------------------------------- home
async function home(browser) {
  const sampler = () => {
    const R = window.__homeRoom; if (!R?.bounds) return null;
    return { items: R.bounds().map(b => ({ kind: b.kind, x: +b.x.toFixed(3), z: +b.z.toFixed(3), yaw: b.yaw, min: b.min, max: b.max })), ps: R.previewState() };
  };
  const r = await recordWithTelemetry(browser, 'home-blocked-drop-bed', { width: 1280, height: 720 }, {}, sampler, async page => {
    await page.goto(`${BASE}/home/?lang=zh&at=room&fresh=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitCurtain(page);
    await page.waitForFunction(() => !!window.__homeRoom?.project, { timeout: 20000 });
    await sleep(700);
    const at = (x, z) => page.evaluate(([x, z]) => window.__homeRoom.project(x, z), [x, z]);
    const click = async (x, z) => { const p = await at(x, z); await page.mouse.move(p.x, p.y, { steps: 10 }); await sleep(200); await page.mouse.click(p.x, p.y); await sleep(400); };
    await page.click('.hm-chip[data-kind="sofa"]'); await sleep(200); await click(-0.4, -0.6);
    await page.click('.hm-chip[data-kind="table"]'); await sleep(250);
    let a = await at(-2.6, 0.3), b = await at(1.6, -0.6);
    await page.mouse.move(a.x, a.y); await page.mouse.move(b.x, b.y, { steps: 40 }); await sleep(200);
    const s = await at(-0.4, -0.6); await page.mouse.move(s.x, s.y, { steps: 20 }); await sleep(300); await page.mouse.click(s.x, s.y); await sleep(500);
    await click(1.8, 1.9);
    a = await at(1.8, 1.9); b = await at(1.8, -1.6);
    await page.mouse.move(a.x, a.y - 4); await page.mouse.down(); await page.mouse.move(b.x, b.y - 4, { steps: 40 }); await page.mouse.up(); await sleep(400);
    a = await at(1.8, -1.6); b = await at(-0.6, -0.6);
    await page.mouse.move(a.x, a.y - 4); await page.mouse.down(); await page.mouse.move(b.x, b.y - 4, { steps: 50 }); await sleep(500); await page.mouse.up(); await sleep(500);
    await page.click('.hm-chip[data-kind="bed"]'); await sleep(200); await click(-2.6, 1.6);
    await page.mouse.click(8, 140); await sleep(200);
    const e = await at(3.9, 2.9);
    await page.mouse.move(e.x, e.y); await page.mouse.down(); await page.mouse.move(e.x - 260, e.y - 30, { steps: 40 }); await page.mouse.up(); await sleep(300);
    await page.mouse.move(640, 360);
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -60); await sleep(120); }
    await sleep(1200);
  });
  const T = r.tel;
  // table half-size from its own measured mesh (used for the ghost, which is the same mesh)
  const gap = (A, B) => Math.max(B.min[0] - A.max[0], A.min[0] - B.max[0], B.min[2] - A.max[2], A.min[2] - B.max[2]);
  let minPlaced = { g: 9 }, minGhost = { g: 9 };
  let tableHalf = null;
  for (const s of T) {
    const S = s.items.find(i => i.kind === 'sofa'), Tb = s.items.find(i => i.kind === 'table');
    if (Tb && !tableHalf) tableHalf = { hx: (Tb.max[0] - Tb.min[0]) / 2, hz: (Tb.max[2] - Tb.min[2]) / 2 };
    if (S && Tb) { const g = gap(S, Tb); s.gapTableSofa = +g.toFixed(3); if (g < minPlaced.g) minPlaced = { g: +g.toFixed(3), t: s.t }; }
    if (S && s.ps.ghost && s.ps.ghostKind === 'table') {
      const h = tableHalf || { hx: 0.75, hz: 0.485 };
      const G = { min: [s.ps.ghostAt.x - h.hx, 0, s.ps.ghostAt.z - h.hz], max: [s.ps.ghostAt.x + h.hx, 0, s.ps.ghostAt.z + h.hz] };
      const g = gap(S, G); s.gapGhostSofa = +g.toFixed(3); if (g < minGhost.g) minGhost = { g: +g.toFixed(3), t: s.t };
    }
  }
  const dims = {};
  const last = T.at(-1);
  for (const i of last.items) { const sx = i.max[0] - i.min[0], sy = i.max[1] - i.min[1], sz = i.max[2] - i.min[2]; dims[i.kind] = { x: +sx.toFixed(2), y: +sy.toFixed(2), z: +sz.toFixed(2) }; }
  const blockedFrames = T.filter(s => s.ps.blocked);
  const ghostWhileBlocked = blockedFrames.filter(s => s.ps.ghost).length;
  writeFileSync(`${OUT}/home-telemetry.json`, JSON.stringify(T));
  return {
    clip: path.relative(process.cwd(), r.mp4), duration: r.dur, frames: T.length,
    minGapPlacedTableToSofa_m: minPlaced, minGapPreviewTableToSofa_m: minGhost,
    blockedFootprintFrames: blockedFrames.length, solidPreviewDrawnWhileBlocked: ghostWhileBlocked,
    maxPiecesTable: Math.max(...T.map(s => s.items.filter(i => i.kind === 'table').length)),
    dimsMetres: dims,
    timeline: summarize(T),
  };
}

/** compact phase timeline: when the preview / blocked footprint / pieces change */
function summarize(T) {
  const out = []; let prev = '';
  for (const s of T) {
    const key = `${s.items.map(i => i.kind).join('+')}|ghost:${s.ps.ghost ? s.ps.ghostKind : '-'}|blocked:${s.ps.blocked ? 'yes' : '-'}`;
    if (key !== prev) { out.push({ t: s.t, state: key, gapTableSofa: s.gapTableSofa, gapGhostSofa: s.gapGhostSofa }); prev = key; }
  }
  return out;
}

(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const rep = { commit: commit + dirty, ranAt: new Date().toISOString(), base: BASE };
  try {
    if (want('home')) rep.home = await home(b);
    if (want('woods')) rep.woods = await woods(b);
  } finally { await b.close(); }
  const prevPath = `${OUT}/report.json`;
  let prev = {}; try { prev = JSON.parse((await import('fs')).readFileSync(prevPath, 'utf8')); } catch { /* first run */ }
  writeFileSync(prevPath, JSON.stringify({ ...prev, ...rep }, null, 2));
  console.log(JSON.stringify(rep, null, 2));
})().catch(e => { console.error(e); process.exit(2); });
