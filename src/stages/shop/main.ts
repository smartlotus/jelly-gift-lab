// Stage 2 · Shop (workstream B) - the pixel cat walks through a warm pixel shop of lotus's 3D-printed objects -> the dark rear door to /night/.
// Layers (back to front): pixel shop canvas · inspect backdrop · three.js canvas (live models) · pixel front canvas (the cat)
// · card / inspect UI · touch pad · chrome. See docs/GIFT_PLAN.md §5.2 and docs/status/B.md.
// Dev: ?skip (no title card) · ?viewer (open the 3D viewer at once; browse all 4) · ?at=pig|cat|fridge|counter|door
import { markReached, go, prefetchNext, warm, params, from } from '../../shared/flow';
import { stashCanvas, peekCarry, clearCarry } from '../../shared/curtain';
import { register, t, onLang } from '../../shared/i18n';
import { mountChrome } from '../../shared/chrome';
import { mountSurprise } from '../../shared/surprise/kit';
import { irisIn, irisOut, dissolve } from '../../shared/transition';
import { hold, progress as curtainProgress } from '../../shared/curtain';
import { blip } from '../../shared/audio';
import { PixelScreen } from '../../shared/pixel/screen';
import { startLoop } from '../../shared/pixel/loop';
import { input } from '../../shared/pixel/input';
import { mountTouch } from '../../shared/pixel/touch';
import { makeMap, body, moveBody, overlap, TILE } from '../../shared/pixel/tiles';
import { Camera } from '../../shared/pixel/camera';
import { catSprites, catFrame } from '../../shared/pixel/cat';
import { draw, frameAt } from '../../shared/pixel/sprite';
import { buildShop, drawDynamic, WORLD_W, WORLD_H, FLOOR_Y, BACKDOOR, ENTRY } from './world';
import { EXHIBITS, type Exhibit, type ExhibitId } from './exhibits';
import { Card, Inspect } from './ui';
import type { Viewer, Rect, Slot } from './viewer';
import * as dict from './dict';
import { tell } from '../../shared/story';
import './style.css';

register(dict); mountChrome(); markReached();
const dev = params.has('dev'), viewerOnly = params.has('viewer');

// ---- layers ----
const game = document.getElementById('game')!;
const backHost = document.createElement('div'); backHost.className = 'shop-layer shop-back'; game.appendChild(backHost);
const scr = new PixelScreen({ host: backHost, minW: 224, minH: 168, maxH: WORLD_H });
scr.canvas.setAttribute('role', 'img'); const label = () => scr.canvas.setAttribute('aria-label', t('shop.canvas')); label(); onLang(label);
const glHost = document.createElement('div'); glHost.className = 'shop-layer shop-glhost'; game.appendChild(glHost);
const frontHost = document.createElement('div'); frontHost.className = 'shop-layer shop-front pixel-host'; game.appendChild(frontHost);
const front = document.createElement('canvas'); frontHost.appendChild(front);
const fg = front.getContext('2d')!;
const syncFront = () => { front.width = scr.w; front.height = scr.h; front.style.width = scr.canvas.style.width; front.style.height = scr.canvas.style.height; fg.imageSmoothingEnabled = false; };
scr.onResize(syncFront); syncFront();
// fill the letterbox above/below the pixel stage with the ceiling / floor colours
const syncBg = () => { const r = scr.canvas.getBoundingClientRect(); document.body.style.setProperty('--ct', `${r.top + 1}px`); document.body.style.setProperty('--cb', `${r.bottom - 1}px`); };
scr.onResize(syncBg); window.addEventListener('resize', syncBg); requestAnimationFrame(syncBg);

// ---- world ----
const bg = buildShop();
const cols = WORLD_W / TILE, rows = WORLD_H / TILE;
const map = makeMap(Array.from({ length: rows }, (_, y) => (y * TILE >= FLOOR_Y ? '#' : ' ').repeat(cols)), c => c === '#');
const cam = new Camera(WORLD_W, WORLD_H);
const AT: Record<string, number> = { pig: 230, cat: 392, fridge: 600, pair: 760, counter: 806, door: 1412, night: 1412 };
// back from /ar/ (?from=ar&ex=figure-cat): stand at that exhibit again and reopen it, no start card
const backEx = from === 'ar' ? EXHIBITS.find(e => e.id === params.get('ex')) : undefined;
const startX = viewerOnly ? 250 : backEx ? Math.max(26, backEx.x - 40) : AT[params.get('at') ?? ''] ?? 26;
const cat = body(startX, FLOOR_Y - 13);
const sp = catSprites();
const pad = mountTouch({ act: true });
const card = new Card();
const doorBox = { x: BACKDOOR.x + 10, y: BACKDOOR.y, w: 12, h: BACKDOOR.h };
cam.snap(cat.x, cat.y, scr.w, scr.h);

let viewer: Viewer | null = null, inspect: Inspect | null = null;
// the exhibit nearest to where the cat starts loads first (and is what the curtain waits for)
const firstEx = (backEx ?? EXHIBITS.reduce((a, e) => (Math.abs(e.x - startX) < Math.abs(a.x - startX) ? e : a))).id;
const viewerP = import('./viewer').then(m => {
  viewer = new m.Viewer(glHost); inspect = new Inspect(viewer); (window as unknown as { __shopViewer: unknown }).__shopViewer = viewer;
  // test hook (tools/ar-verify.mjs): show the inspector's panel for an exhibit (UI only, the 3D view is not moved)
  (window as unknown as { __shop: unknown }).__shop = { inspect: (id: ExhibitId) => inspect?.show(id) };
  inspect.onClose = closeInspect;
  viewer.onJoin = () => { blip(1318, 0.08, 'sine', 0.08); setTimeout(() => blip(1760, 0.16, 'sine', 0.06), 70); }; viewer.onClosed = () => { input.enabled = started && !leaving; actLock = true; };
  viewer.setFocus(startX); viewer.onLoadState = loadUi;
  // then the rest in the background, nearest the cat first, two at a time (the queue re-sorts as she walks)
  viewer.load(firstEx).then(() => setTimeout(() => { for (const e of EXHIBITS) void viewer!.load(e.id); }, 400), () => { /* error state + retry button; the curtain still opens after its timeout */ });
  return viewer;
});
viewerP.catch(e => { console.warn('[shop] 3D viewer unavailable', e); noGl = true; loadUi(); });

// 2026-11-14 · the 3D loading status chip: progress when an on-screen piece takes a while, a retry button when one failed,
// a note when WebGL is missing or the context was lost. Lives in the free band above the touch pad (see style.css).
let noGl = false, slowSince = 0;
const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'shop-load'; chip.hidden = true; document.body.appendChild(chip);
chip.addEventListener('click', () => { if (viewer && viewer.retry()) { blip(988, 0.08, 'sine', 0.06); loadUi(); } });
function loadUi() {
  let txt = '', kind = '';
  if (noGl) { txt = t('shop.load.nogl'); kind = 'note'; }
  else if (viewer?.lost) { txt = t('shop.load.lost'); kind = 'note'; }
  else if (viewer && EXHIBITS.some(e => viewer!.failed(e.id))) { txt = t('shop.load.err'); kind = 'err'; }
  else if (viewer && started && !leaving) {
    const vis = EXHIBITS.filter(e => viewer!.pending(e.id) && onScreen(clientRect(e)));
    if (!vis.length) slowSince = 0; else if (!slowSince) slowSince = performance.now();
    if (vis.length && performance.now() - slowSince > 3500) { const p = Math.round(100 * Math.min(...vis.map(e => viewer!.progress(e.id)))); txt = t('shop.load.slow').replace('{p}', String(p)); kind = 'slow'; }
  }
  if (leaving || (viewer && viewer.mode !== 'display')) txt = '';
  chip.hidden = !txt; if (txt && chip.textContent !== txt) chip.textContent = txt; chip.dataset.kind = kind; chip.disabled = kind !== 'err';
}
setInterval(loadUi, 500); onLang(loadUi);
window.addEventListener('online', () => viewer?.retry());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') viewer?.retry(); });

// v03e: the loading curtain waits (with a progress bar) for three.js + the first figure, at most ~8 s, then the iris opens
{
  const release = hold(), since = performance.now();
  const poll = () => {
    const p = viewer ? viewer.progress(firstEx) : 0; curtainProgress(0.15 + 0.85 * p);
    if ((viewer && (viewer.ready(firstEx) || viewer.failed(firstEx))) || performance.now() - since > 8000) { curtainProgress(1); release(); } else setTimeout(poll, 80);
  };
  curtainProgress(0.08); poll(); viewerP.catch(() => release());
}

let landT = 1, t0 = 0, started = false, leaving = false, actLock = false, near: Exhibit | null = null, bang = 0, flicker = 0, flickered = false, prefetched = false, walkIn = 0;
input.enabled = false;

// exhibit -> its square 3D viewport in world px, then css px
function worldBox(e: Exhibit) {
  const B = e.kind === 'magnet' && innerHeight > innerWidth ? Math.round(e.box * 1.3) : e.box;   // M7: magnets read bigger on portrait phones
  if (e.kind === 'magnet') return { x: e.x - B / 2, y: e.y - B / 2, w: B, h: B };
  if (e.kind === 'pair') { const off = viewer ? viewer.baseOffset(e.id) : 0.3, W = B * 1.5; return { x: e.x - W / 2, y: e.y - B / 2 - (off * B) / 2 + 1, w: W, h: B }; }
  const off = viewer ? viewer.baseOffset(e.id) : 0.55;
  return { x: e.x - B / 2, y: e.y - B / 2 - (off * B) / 2 + 1, w: B, h: B };
}
function clientRect(e: Exhibit): Rect {
  const b = worldBox(e), a = scr.toClient(b.x - cam.ix, b.y - cam.iy), z = scr.toClient(b.x + b.w - cam.ix, b.y + b.h - cam.iy);
  return { x: a.x, y: a.y, w: z.x - a.x, h: z.y - a.y };
}
const onScreen = (r: Rect) => r.x + r.w > -20 && r.x < innerWidth + 20 && r.y + r.h > -20 && r.y < innerHeight + 20;

function openInspect(id: ExhibitId) {
  if (!viewer || !inspect || viewer.mode !== 'display' || leaving) return;
  const e = EXHIBITS.find(x => x.id === id)!;
  input.enabled = false; card.show(null); pad.showAct(false);
  void viewer.open(id, () => clientRect(e)); inspect.show(id); blip(880, 0.12, 'sine', 0.12); blip(1320, 0.18, 'sine', 0.08);
  backHost.classList.add('dim'); frontHost.classList.add('dim');
}
function closeInspect() {
  if (!viewer || !inspect) return;
  const e = EXHIBITS.find(x => x.id === inspect!.current)!;
  // browsed to an exhibit that is off-screen? shrink it away in the middle instead of flying off the edge
  const home = onScreen(clientRect(e)) ? () => clientRect(e) : () => ({ x: innerWidth / 2 - 24, y: innerHeight / 2 - 24, w: 48, h: 48 });
  inspect.hide(); viewer.close(home); blip(660, 0.1, 'sine', 0.08);
  backHost.classList.remove('dim'); frontHost.classList.remove('dim');
}

// tap / click a model in the shop to look closer
let begunAt = 0;
window.addEventListener('pointerup', e => {
  if (performance.now() - begunAt < 400) return;
  if (!started || !viewer || viewer.mode !== 'display' || leaving) return;
  if ((e.target as HTMLElement).closest('.touchpad, .gift-chrome, .shop-card, .shop-inspect, .gift-card')) return;
  for (const ex of EXHIBITS) { const r = clientRect(ex); if (viewer.ready(ex.id) && e.clientX > r.x && e.clientX < r.x + r.w && e.clientY > r.y && e.clientY < r.y + r.h) { openInspect(ex.id); return; } }
});
window.addEventListener('pointermove', e => {
  if (!viewer || viewer.mode !== 'display' || e.pointerType !== 'mouse') return;
  const hit = EXHIBITS.some(ex => { const r = clientRect(ex); return viewer!.ready(ex.id) && e.clientX > r.x && e.clientX < r.x + r.w && e.clientY > r.y && e.clientY < r.y + r.h; });
  document.body.style.cursor = hit ? 'pointer' : '';
});
card.onLook = id => openInspect(id);

startLoop(dt => {
  input.update(); t0 += dt;
  const inspecting = !!viewer && viewer.mode !== 'display';
  let ax = input.axis();
  if (walkIn > 0) { walkIn -= dt; ax = 1; }
  if (leaving) ax = 1;
  const wasGround = cat.ground;
  if (!inspecting || leaving) moveBody(cat, map, dt, ax, input.hit('jump') || input.hit('up'), input.pressed('jump') || input.pressed('up'));
  landT = cat.ground && !wasGround ? 0 : landT + dt;
  if (cat.ground && Math.abs(cat.vx) > 5 && Math.floor(t0 * 4) !== Math.floor((t0 - dt) * 4) && Math.floor(t0 * 4) % 2 === 0) blip(180 + Math.random() * 30, 0.03, 'triangle', 0.04);
  cam.follow(cat.x + cat.w / 2, cat.y, cat.face, scr.w, scr.h, dt);
  // nearest exhibit
  const cx = cat.x + cat.w / 2;
  let best: Exhibit | null = null, bd = 1e9;
  for (const e of EXHIBITS) { const d = Math.abs(cx - e.x); if (d < (e.kind === 'magnet' ? 18 : e.kind === 'pair' ? 40 : 30) && d < bd) { bd = d; best = e; } }
  if (inspecting || leaving || !started) best = null;
  if (best !== near) { near = best; card.show(best); pad.showAct(!!best); if (best) { bang = 0.9; blip(1046, 0.07, 'sine', 0.07); } }
  bang = Math.max(0, bang - dt);
  if (!input.pressed('act')) actLock = false;
  if (near && input.hit('act') && !actLock) openInspect(near.id);
  viewer?.setPairJoined(!!near && near.id === 'pair' || cx > 860);
  // lazy-load models as the cat approaches
  if (viewer) { viewer.setFocus(cx); for (const e of EXHIBITS) if (Math.abs(cx - e.x) < 380) void viewer.load(e.id); }
  // the back door: lights flicker twice, then the dark
  if (!flickered && cx > BACKDOOR.x - 110) { flickered = true; flicker = 1.4; blip(110, 0.25, 'sawtooth', 0.05, -40); }
  if (!prefetched && cx > BACKDOOR.x - 240) { prefetched = true; warm('night'); prefetchNext(); }
  if (flicker > 0) flicker = Math.max(0, flicker - dt);
  if (!leaving && started && cx > BACKDOOR.x - 90) tell('shop.door', 2800);
  if (!leaving && started && overlap(cat, doorBox)) {
    leaving = true; input.enabled = false; card.show(null);
    const snap = stashCanvas(scr.canvas);
    const c = scr.toClient(BACKDOOR.x + BACKDOOR.w / 2 - cam.ix, BACKDOOR.y + 30 - cam.iy);
    void go('night', () => irisOut(c.x, c.y, 900, snap?.color || '#0b0b0c', snap?.img));
  }
}, () => {
  const g = scr.ctx, ox = -cam.ix, oy = -cam.iy;
  g.drawImage(bg, ox, oy);
  // flicker pattern: two quick dips
  const f = flicker, dark = f > 1.15 ? 0.55 : f > 0.95 ? 0 : f > 0.75 ? 0.62 : f > 0.55 ? 0.1 : 0;
  const loading = viewer ? EXHIBITS.filter(e => viewer!.pending(e.id)).map(e => ({ x: e.x, y: e.kind === 'magnet' ? e.y : e.y - 3, w: e.kind === 'magnet' ? 16 : 24, p: viewer!.progress(e.id) })) : [];
  // soft floor shadow under the cat
  g.fillStyle = 'rgba(110,70,40,0.18)'; g.fillRect(Math.round(cat.x - 1 + ox), FLOOR_Y + oy, cat.w + 2, 1);
  drawDynamic(g, ox, oy, t0, { flicker: dark, loading });
  // front layer: the cat (+ its '!!') above the 3D models
  fg.clearRect(0, 0, front.width, front.height);
  if (!leaving || cat.x < doorBox.x + 2) {
    let img = catFrame(sp, cat, t0, landT);
    if (leaving) img = frameAt(sp.back, t0);
    else if (near && cat.ground && Math.abs(cat.vx) < 8) img = bang > 0.4 ? frameAt(sp.happy, t0) : sp.look;
    draw(fg, img, cat.x + cat.w / 2 - 8 + ox, cat.y + cat.h - 16 + oy, cat.face < 0);
    if (bang > 0) draw(fg, sp.bang, Math.round(cat.x + cat.w / 2 - sp.bang.width / 2 + ox), cat.y - sp.bang.height - 4 - (bang > 0.75 ? 1 : 0) + oy);
  }
  if (dark) { fg.fillStyle = `rgba(14,10,18,${dark})`; fg.fillRect(0, 0, front.width, front.height); }
  // 3D
  if (viewer) {
    const slots: Slot[] = [];
    for (const e of EXHIBITS) { const r = clientRect(e); if (onScreen(r) && viewer.ready(e.id)) slots.push({ id: e.id, rect: r }); }
    viewer.canvas.style.opacity = dark ? String(1 - dark) : '';
    viewer.render(slots);
    if (near && viewer.mode === 'display') card.place(clientRect(near), scr.canvas.getBoundingClientRect());
  }
});

// continuity: the meadow closed its iris onto a door; the shop opens it from the entry door the cat just came through
if (backEx) void dissolve(0, 700, '#eeece8'); // the paper of /ar/ dissolves back into the shop
else {
  const carry = peekCarry();
  const d = scr.toClient(ENTRY.x + ENTRY.w / 2 - cam.ix, ENTRY.y + 30 - cam.iy);
  void irisIn(d.x, d.y, 750, carry?.color, carry?.img).then(() => clearCarry());
}
const begin = () => {
  started = true; input.enabled = true; begunAt = performance.now(); walkIn = startX < 60 ? 0.55 : 0;
  blip(1568, 0.25, 'sine', 0.1); setTimeout(() => blip(2093, 0.4, 'sine', 0.07), 90);   // shop door bell
  if (viewerOnly) void viewerP.then(() => openInspect('figure-pig'));
  if (backEx) viewerP.then(() => viewer!.load(backEx.id)).then(() => openInspect(backEx.id)).catch(() => { /* model unavailable: stay in the shop */ });
};
// lab: 跳过 = the dark back door (same iris, same colour hand-off)
mountSurprise({ stage: 'shop', skip: at => {
  if (leaving) return; leaving = true; input.enabled = false; card.show(null);
  const snap = stashCanvas(scr.canvas);
  void go('night', () => irisOut(at.x, at.y, 900, snap?.color || '#0b0b0c', snap?.img));
} });
begin(); // v03g: no title card — the door bell rings as the cat walks in
setTimeout(() => tell('story.shop.in'), 1400);
