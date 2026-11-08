// /coop/ · two phones side by side = one wide meadow level; pig (host, left phone) + cat (guest, right phone).
// Or one phone, two players (split pads). Serverless: WebRTC DataChannel, signalling by QR (net.ts, qr.ts).
// Host-authoritative: the host steps the Sim at 60 Hz and sends snapshots at 30 Hz; the guest sends its pad.
// Dev: ?solo (straight into one-phone play) · ?preview (both phones drawn side by side on one screen) · ?at=wall|end · ?auto
import { register, apply, onLang } from '../../shared/i18n';
import { mountChrome } from '../../shared/chrome';
import { irisIn, irisOut } from '../../shared/transition';
import { stashCanvas } from '../../shared/curtain';
import { params, from, go, markReached, prefetchNext } from '../../shared/flow';
import { PixelScreen } from '../../shared/pixel/screen';
import { drawDawn, bayer, DAWN_LINES } from '../../shared/dawn';
import { startLoop } from '../../shared/pixel/loop';
import { TILE } from '../../shared/pixel/tiles';
import { catSprites } from '../../shared/pixel/cat';
import { pigSprites } from '../../shared/pixel/pig';
import { Sim, Art, WH, type PIn } from './game';
import { Pad, mountPads } from './controls';
import { Link } from './net';
import { qrCanvas, scan } from './qr';
import * as dict from './dict';
import { tell } from '../../shared/story';
import * as Sfx from '../../shared/sfx';
import './style.css';

/** v03i: listen to the shared sim (host/solo step or guest snapshot) and play the edges — jumps, landings, plates, gate, steps, finale */
function coopEars() {
  let prev: { g: boolean[]; vy: number[]; pl: boolean[]; gate: boolean; steps: boolean; end: boolean } | null = null;
  return (sim: Sim) => {
    const now = { g: sim.b.map(b => b.ground), vy: sim.b.map(b => b.vy), pl: sim.plates.slice(), gate: sim.gate > 0.5, steps: sim.steps, end: sim.end >= 0 };
    if (prev) {
      now.g.forEach((g, i) => { if (prev!.g[i] && !g && now.vy[i] < -40) Sfx.jump(now.vy[i] < -360); else if (!prev!.g[i] && g && prev!.vy[i] > 120) Sfx.land(); });
      now.pl.forEach((p, i) => { if (p !== prev!.pl[i] && sim.L.plates[i]?.kind !== 'heart') Sfx.plate(p); else if (p && !prev!.pl[i]) Sfx.softChime(); });
      if (now.gate !== prev.gate) Sfx.gate(now.gate);
      if (now.steps && !prev.steps) Sfx.stepsUp();
      if (now.end && !prev.end) Sfx.coopWin();
    }
    prev = now;
  };
}

register(dict);
const ICON = {
  duo: '<svg viewBox="0 0 48 32" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="4" y="4" width="19" height="24" rx="3"/><rect x="25" y="4" width="19" height="24" rx="3"/><path d="M11 24h5M32 24h5"/></svg>',
  solo: '<svg viewBox="0 0 48 32" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="8" y="6" width="32" height="20" rx="3"/><circle cx="14" cy="16" r="2.2"/><circle cx="34" cy="16" r="2.2"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  again: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4v3.5H8"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M10 14l4-4M8.5 11.5l-2 2a3 3 0 0 0 4.2 4.2l2-2M15.5 12.5l2-2a3 3 0 0 0-4.2-4.2l-2 2"/><path d="M4 4l16 16"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 11.5L12 5l7.5 6.5"/><path d="M7 10v8.5h10V10"/></svg>',
  rotate: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="17" y="8" width="14" height="24" rx="2.5"/><path d="M10 34a16 16 0 0 0 26 4"/><path d="M36 33v5h-5"/></svg>',
};
const head = (who: 'pig' | 'cat', k = 6) => { const s = who === 'pig' ? pigSprites().idle.frames[0] : catSprites().idle.frames[0]; const c = document.createElement('canvas'); c.width = 16 * k; c.height = 16 * k; const g = c.getContext('2d')!; g.imageSmoothingEnabled = false; g.drawImage(s, 0, 0, 16 * k, 16 * k); c.className = `cp-head cp-${who}`; return c; };

// ---------- answer relay: a tab opened from the guest's answer QR (system camera) hands the code to the waiting tab ----------
const bc = 'BroadcastChannel' in window ? new BroadcastChannel('jelly-coop') : null;
const hashCode = location.hash.slice(1);
if (/^a[zr]/.test(hashCode)) {
  mountChrome(); // v03i: sound switch on
  bc?.postMessage({ a: hashCode }); try { localStorage.setItem('jelly.coop.answer', JSON.stringify({ a: hashCode, t: Date.now() })); } catch { /* */ }
  const d = document.createElement('div'); d.className = 'cp-relay'; d.append(head('cat'), head('pig'));
  const p = document.createElement('p'); p.dataset.i18n = 'coop.linked'; d.append(p); document.body.append(d); apply(); onLang(() => apply());
  setTimeout(() => window.close(), 600);
} else boot();

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let tapX = innerWidth / 2, tapY = innerHeight / 2; // the iris closes onto the last tap, like the meadow's doors
window.addEventListener('pointerdown', (e: PointerEvent) => { tapX = e.clientX; tapY = e.clientY; }, true);
/** the meadow's pixel iris: close onto the tap, swap, open again (reduced motion -> instant) */
async function iris(swap: () => void, colour = '#2E2A2B') {
  if (reduced) { swap(); return; }
  await irisOut(tapX, tapY, 480, colour); swap(); await new Promise(r => requestAnimationFrame(() => r(0))); void irisIn(innerWidth / 2, innerHeight / 2, 620, colour);
}

/** arrival from /sky/: open on the exact pixel frame the sky ended on, let the morning finish (night → dawn → the level's
 *  own day colours, 1.6 s), then dissolve into the running level with an ordered dither (1.3 s). One continuous picture. */
function dawnArrive() {
  document.documentElement.classList.remove('cp-from-sky');
  const hz = Math.max(0.45, Math.min(0.85, +(params.get('hz') || 0.66)));
  const cv = document.createElement('canvas'); cv.className = 'cp-dawn'; document.body.appendChild(cv);
  const g = cv.getContext('2d')!, lh = DAWN_LINES, lw = Math.max(1, Math.round(lh * innerWidth / innerHeight));
  cv.width = lw; cv.height = lh; const frame = document.createElement('canvas'); frame.width = lw; frame.height = lh; const fg = frame.getContext('2d')!;
  const img = g.createImageData(lw, lh); let mask: Uint8ClampedArray | null = null;
  if (reduced) { cv.remove(); return; }
  const t0 = performance.now();
  const tick = (now: number) => {
    const t = (now - t0) / 1000, k = 0.35 + 0.65 * Math.min(1, t / 1.6) ** 1.4, d = Math.max(0, (t - 1.5) / 1.3);
    drawDawn(fg, lw, lh, hz, k, t + 3.4);
    if (d <= 0) { g.clearRect(0, 0, lw, lh); g.drawImage(frame, 0, 0); }
    else { // dither the frame away, top-down bias so the meadow seems to come up out of the dawn
      const src = fg.getImageData(0, 0, lw, lh).data; mask ??= img.data;
      for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) { const i = (y * lw + x) * 4, th = bayer(x, y) * 0.8 + (1 - y / lh) * 0.2; const keep = d < th; mask[i] = src[i]; mask[i + 1] = src[i + 1]; mask[i + 2] = src[i + 2]; mask[i + 3] = keep ? 255 : 0; }
      g.putImageData(img, 0, 0);
    }
    if (d < 1) requestAnimationFrame(tick); else cv.remove();
  };
  requestAnimationFrame(tick);
}

function boot() {
  mountChrome(); // v03i: sound switch on
  const gameEl = document.getElementById('coop')!;
  const ui = document.createElement('div'); ui.className = 'cp-ui'; document.body.appendChild(ui);
  const preview = params.has('preview');

  // ================= play =================
  function play(role: 'solo' | 'host' | 'guest', link?: Link, remoteW = 0) {
    const ears = coopEars(); if (role !== 'solo') Sfx.coopJoin();
    ui.innerHTML = ''; document.body.classList.add('cp-playing');
    try { void (navigator as Navigator & { wakeLock?: { request(t: string): Promise<unknown> } }).wakeLock?.request('screen'); } catch { /* */ }
    // minH > world height: smaller pixels, a wider view, and room under the picture for the thumbs
    const scr = new PixelScreen({ host: gameEl, minW: 200, minH: matchMedia('(pointer: coarse)').matches ? 236 : WH, maxH: WH });
    let otherW = remoteW;
    const view = () => role === 'solo' ? { tw: scr.w, seam: scr.w / 2 } : role === 'host' ? { tw: scr.w + otherW, seam: scr.w } : { tw: otherW + scr.w, seam: otherW };
    let sim = new Sim(view, params.get('at')); const art = new Art(sim);
    const pads = role === 'solo' ? [new Pad(), new Pad()] : [new Pad()];
    mountPads(pads, role === 'solo' ? 'solo' : 'duo');
    const rot = document.createElement('div'); rot.className = 'cp-rotate'; rot.innerHTML = ICON.rotate; document.body.appendChild(rot);
    const again = document.createElement('button'); again.type = 'button'; again.className = 'cp-again'; again.innerHTML = ICON.again; again.dataset.i18nAria = 'coop.again'; again.hidden = true; document.body.appendChild(again);
    const lost = document.createElement('div'); lost.className = 'cp-lost'; lost.innerHTML = ICON.link; lost.hidden = true; document.body.appendChild(lost);
    // the finale: hearts across the screens, then two quiet choices — again, or the whole journey from the start
    const home = document.createElement('button'); home.type = 'button'; home.className = 'cp-home'; home.innerHTML = ICON.home; home.dataset.i18nAria = 'coop.home'; home.hidden = true; document.body.appendChild(home);
    let departing = false;
    const onward = () => { if (departing) return; departing = true; Sfx.tap(); link?.close(); prefetchNext(); const snap = stashCanvas(scr.canvas); void go('flower', () => reduced ? Promise.resolve() : irisOut(tapX, tapY, 800, snap?.color || '#f3d4e0', snap?.img)); };
    home.addEventListener('click', onward);
    // one phone (the default in the journey) can still become two: a small two-phones button, top left
    if (role === 'solo') { const lk = document.createElement('button'); lk.type = 'button'; lk.className = 'cp-tolink'; lk.innerHTML = ICON.duo; lk.dataset.i18nAria = 'coop.duo'; document.body.appendChild(lk);
      lk.addEventListener('click', () => void (reduced ? Promise.resolve() : irisOut(tapX, tapY, 480, '#f6efe4')).then(() => location.assign(`${location.pathname}?${new URLSearchParams({ ...(params.get('lang') ? { lang: params.get('lang')! } : {}), duo: '1' })}`))); }
    apply();
    again.addEventListener('click', () => { Sfx.tap(); if (role !== 'guest') void iris(() => { sim = new Sim(view); again.hidden = true; }, '#FFF8EE'); });
    // network
    const remote = { ax: 0, held: false, seq: 0, last: 0 };
    let snapA: number[] | null = null, snapB: number[] | null = null, tB = 0;
    if (link) {
      link.onMsg = (m: unknown) => {
        const o = m as { k: string; i?: number[]; s?: number[]; w?: number };
        if (o.k === 'i' && o.i) { remote.ax = o.i[0]; remote.held = !!o.i[1]; remote.seq = o.i[2]; }
        else if (o.k === 's' && o.s) { snapA = snapB; snapB = o.s; tB = performance.now(); }
        else if (o.k === 'w' && o.w) otherW = o.w;
      };
      link.onClose = () => { Sfx.coopFail(); lost.hidden = false; remote.ax = 0; remote.held = false; };
      scr.onResize(() => link.send({ k: 'w', w: scr.w })); link.send({ k: 'w', w: scr.w });
    }
    const auto = params.has('auto');
    const autoIn = (i: number): PIn => { const goal = sim.L.plates.filter(p => p.kind === 'heart')[i].tx * TILE + 3, d = goal - sim.b[i].x; return { ax: Math.abs(d) < 2 ? 0 : Math.sign(d), held: false, hit: false }; };
    const padIn = (p: Pad): PIn => ({ ax: p.ax, held: p.held, hit: p.hit() });
    let n = 0, sentAt = 0, lastSent = '';
    startLoop(dt => {
      n++;
      if (role === 'guest') {
        const p = pads[0], msg = JSON.stringify([p.ax, p.held ? 1 : 0, p.seq]);
        if (msg !== lastSent || n - sentAt > 6) { link?.send({ k: 'i', i: JSON.parse(msg) }); lastSent = msg; sentAt = n; }
        return;
      }
      const a: PIn = auto ? autoIn(0) : padIn(pads[0]);
      const b: PIn = auto ? autoIn(1) : role === 'solo' ? padIn(pads[1]) : { ax: remote.ax, held: remote.held, hit: remote.seq !== remote.last };
      remote.last = remote.seq;
      sim.step([a, b], dt); ears(sim);
      if (role === 'host' && n % 2 === 0) link?.send({ k: 's', s: sim.snapshot() });
      again.hidden = !(sim.end > 7);
      if (home.hidden !== !(sim.end > 7)) home.hidden = !(sim.end > 7);
      if (sim.end > 2) prefetchNext();
      if (sim.end > 11.5 && !departing) onward();
    }, () => {
      if (role === 'guest') {
        if (!snapB) { scr.ctx.fillStyle = '#5EC4FF'; scr.ctx.fillRect(0, 0, scr.w, scr.h); return; }
        // render ~one snapshot behind, interpolating positions + camera (30 Hz -> smooth 60 Hz)
        const k = snapA ? Math.min(1, (performance.now() - tB) / 33) : 1, s = snapB.slice();
        if (snapA) for (const i of [0, 1, 6, 7, 12]) s[i] = snapA[i] + (snapB[i] - snapA[i]) * k;
        sim.load(snapB); ears(sim); sim.load(s); art.render(scr.ctx, sim, sim.camX + otherW, scr.w, scr.h); if (home.hidden !== !(sim.end > 7)) home.hidden = !(sim.end > 7);
      } else art.render(scr.ctx, sim, sim.camX + (role === 'host' ? 0 : 0), scr.w, scr.h);
    });
    (window as unknown as { __coop: unknown }).__coop = { get sim() { return sim; }, role, scr };
  }

  // ================= preview: both phones drawn side by side (review / screenshots) =================
  if (preview) {
    document.body.classList.add('cp-playing', 'cp-preview');
    const wA = 360, wB = 360, mk = () => { const c = document.createElement('canvas'); c.width = 360; c.height = WH; c.className = 'cp-phone'; gameEl.appendChild(c); return c; };
    const ca = mk(), cb = mk(); const ga = ca.getContext('2d')!, gb = cb.getContext('2d')!; ga.imageSmoothingEnabled = gb.imageSmoothingEnabled = false;
    const sim = new Sim(() => ({ tw: wA + wB, seam: wA }), params.get('at')), art = new Art(sim);
    const pads = [new Pad(), new Pad()]; mountPads(pads, 'solo');
    const autoIn = (i: number): PIn => { const goal = sim.L.plates.filter(p => p.kind === 'heart')[i].tx * TILE + 3, d = goal - sim.b[i].x; return { ax: Math.abs(d) < 2 ? 0 : Math.sign(d), held: false, hit: false }; };
    startLoop(dt => sim.step(params.has('auto') ? [autoIn(0), autoIn(1)] : [{ ax: pads[0].ax, held: pads[0].held, hit: pads[0].hit() }, { ax: pads[1].ax, held: pads[1].held, hit: pads[1].hit() }], dt),
      () => { art.render(ga, sim, sim.camX, wA, WH); art.render(gb, sim, sim.camX + wA, wB, WH); });
    (window as unknown as { __coop: unknown }).__coop = { sim };
    return;
  }
  markReached();
  // journey arrival from the sky: straight into the level on this one phone (always works); the pixel iris opens from black
  if (params.has('solo') || from === 'sky') { play('solo'); if (from === 'sky') dawnArrive(); return; }

  // ================= lobby =================
  const lobby = () => {
    ui.innerHTML = `<section class="cp-lobby"><div class="cp-heads"></div><nav class="cp-choose">
      <button type="button" data-m="duo">${ICON.duo}<span data-i18n="coop.duo"></span></button>
      <button type="button" data-m="solo">${ICON.solo}<span data-i18n="coop.solo"></span></button></nav>
      <button type="button" class="cp-join" data-m="join">${ICON.cam}<span data-i18n="coop.join"></span></button></section>`;
    ui.querySelector('.cp-heads')!.append(head('pig', 7), head('cat', 7)); apply();
  };
  // pairing panel: my head + a QR + (host) a camera button
  const panel = (me: 'pig' | 'cat') => {
    ui.innerHTML = `<section class="cp-pair"><button type="button" class="cp-x" data-m="back" data-i18n-aria="coop.back">${ICON.x}</button>
      <div class="cp-qr"><i class="cp-dots"><b></b><b></b><b></b></i></div><div class="cp-cam" hidden></div>
      ${me === 'pig' ? `<button type="button" class="cp-scan" data-m="scan">${ICON.cam}<span data-i18n="coop.scanHer"></span></button>` : ''}</section>`;
    ui.querySelector('.cp-pair')!.prepend(head(me, 5)); apply();
  };
  const showQR = (text: string) => { const q = ui.querySelector('.cp-qr')!; q.innerHTML = ''; const c = qrCanvas(text, 8); c.className = 'cp-qrc'; q.appendChild(c); (window as unknown as { __code: string }).__code = text; };
  let link: Link | null = null, scanning: { stop(): void } | null = null;
  const toGame = (role: 'host' | 'guest') => { scanning?.stop(); const l = link!; l.onOpen = () => {}; tapX = innerWidth / 2; tapY = innerHeight / 2; void iris(() => play(role, l)); };
  async function host() {
    link?.close(); link = new Link(); panel('pig');
    const l = link; l.onOpen = () => toGame('host'); (window as unknown as { __link: Link }).__link = l;
    const code = await l.offer(); if (link !== l) return;
    showQR(`${location.origin}${location.pathname}#${code}`);
    const take = (a: string) => { if (link === l && !l.open) void l.accept(a).catch(e => console.warn(e)); };
    bc && (bc.onmessage = e => { if (e.data?.a) take(e.data.a); });
    window.addEventListener('storage', e => { if (e.key === 'jelly.coop.answer' && e.newValue) take(JSON.parse(e.newValue).a); });
    (window as unknown as { __accept: (a: string) => void }).__accept = take;
  }
  async function guest(offer: string) {
    link?.close(); link = new Link(); panel('cat');
    const l = link; l.onOpen = () => toGame('guest'); (window as unknown as { __link: Link }).__link = l;
    try { const code = await l.answer(offer); if (link === l) showQR(`${location.origin}${location.pathname}#${code}`); }
    catch (e) { console.warn(e); lobby(); }
  }
  function camera(want: 'o' | 'a', then: (s: string) => void) {
    const box = ui.querySelector<HTMLElement>('.cp-cam'); if (!box) return; box.hidden = false; ui.querySelector('.cp-qr')?.setAttribute('hidden', '');
    scanning?.stop(); const s = scan(box, t => new RegExp(`(^|[#&?])${want}[zr][\\w-]{20,}`).test(t)); scanning = s;
    s.done.then(then).catch(e => { console.warn(e); box.hidden = true; ui.querySelector('.cp-qr')?.removeAttribute('hidden'); });
  }
  ui.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-m]'); if (!b) return; Sfx.tap();
    const m = b.dataset.m;
    if (m === 'duo') void host();
    else if (m === 'solo') { link?.close(); void iris(() => play('solo')); }
    else if (m === 'join') { panel('cat'); camera('o', s => void guest(s)); }
    else if (m === 'scan') camera('a', s => { if (link && !link.open) void link.accept(s); });
    else if (m === 'back') { scanning?.stop(); link?.close(); link = null; history.replaceState(null, '', location.pathname + location.search); lobby(); }
  });
  onLang(() => apply());
  if (/^o[zr]/.test(hashCode)) void guest(hashCode); else if (params.has('duo')) void host(); else lobby();
  void irisIn(innerWidth / 2, innerHeight / 2, 650, '#f6efe4');
}
setTimeout(() => tell('story.coop.in'), 1400);
