// Stage 2 · Shop (workstream B) - the pixel cat walks through a warm pixel shop of lotus's 3D-printed objects -> /night/.
// Layers (back to front): pixel shop canvas · inspect backdrop · three.js canvas (live models) · pixel front canvas (the cat)
// · card / inspect UI · touch pad · chrome. See docs/GIFT_PLAN.md §5.2 and docs/status/B.md.
// Dev: ?skip (no title card) · ?viewer (open the 3D viewer at once; browse all 4) · ?at=pig|cat|fridge|counter|door
import { markReached, go, prefetchNext, params } from '../../shared/flow';
import { register, t, onLang } from '../../shared/i18n';
import { mountChrome, startCard } from '../../shared/chrome';
import { irisIn, irisOut } from '../../shared/transition';
import { blip } from '../../shared/audio';
import { PixelScreen } from '../../shared/pixel/screen';
import { startLoop } from '../../shared/pixel/loop';
import { input } from '../../shared/pixel/input';
import { mountTouch } from '../../shared/pixel/touch';
import { makeMap, body, moveBody, overlap, TILE } from '../../shared/pixel/tiles';
import { Camera } from '../../shared/pixel/camera';
import { catSprites } from '../../shared/pixel/cat';
import { draw, frameAt } from '../../shared/pixel/sprite';
import { buildShop, drawDynamic, WORLD_W, WORLD_H, FLOOR_Y, BACKDOOR } from './world';
import { EXHIBITS, type Exhibit, type ExhibitId } from './exhibits';
import { Card, Inspect } from './ui';
import type { Viewer, Rect, Slot } from './viewer';
import * as dict from './dict';
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
const whisper = document.createElement('p'); whisper.className = 'shop-whisper'; whisper.dataset.i18n = 'shop.door'; whisper.textContent = t('shop.door'); document.body.appendChild(whisper);
onLang(() => { whisper.textContent = t('shop.door'); });

// ---- world ----
const bg = buildShop();
const cols = WORLD_W / TILE, rows = WORLD_H / TILE;
const map = makeMap(Array.from({ length: rows }, (_, y) => (y * TILE >= FLOOR_Y ? '#' : ' ').repeat(cols)), c => c === '#');
const cam = new Camera(WORLD_W, WORLD_H);
const AT: Record<string, number> = { pig: 230, cat: 392, fridge: 600, counter: 820, door: 990 };
const startX = viewerOnly ? 250 : AT[params.get('at') ?? ''] ?? 26;
const cat = body(startX, FLOOR_Y - 13);
const sp = catSprites();
const pad = mountTouch({ act: true });
const card = new Card();
const doorBox = { x: BACKDOOR.x + 10, y: BACKDOOR.y, w: 12, h: BACKDOOR.h };
cam.snap(cat.x, cat.y, scr.w, scr.h);

let viewer: Viewer | null = null, inspect: Inspect | null = null;
const viewerP = import('./viewer').then(m => {
  viewer = new m.Viewer(glHost); inspect = new Inspect(viewer);
  inspect.onClose = closeInspect; viewer.onClosed = () => { input.enabled = started && !leaving; actLock = true; };
  void viewer.load('figure-pig');
  return viewer;
});

let t0 = 0, started = false, leaving = false, actLock = false, near: Exhibit | null = null, bang = 0, flicker = 0, flickered = false, prefetched = false, walkIn = 0;
input.enabled = false;

// exhibit -> its square 3D viewport in world px, then css px
function worldBox(e: Exhibit) {
  const B = e.box;
  if (e.kind === 'magnet') return { x: e.x - B / 2, y: e.y - B / 2, w: B, h: B };
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
  inspect.hide(); viewer.close(() => clientRect(e)); blip(660, 0.1, 'sine', 0.08);
  backHost.classList.remove('dim'); frontHost.classList.remove('dim');
}

// tap / click a model in the shop to look closer
window.addEventListener('pointerup', e => {
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
  if (!inspecting || leaving) moveBody(cat, map, dt, ax, input.hit('jump') || input.hit('up'), input.pressed('jump') || input.pressed('up'));
  if (cat.ground && Math.abs(cat.vx) > 5 && Math.floor(t0 * 4) !== Math.floor((t0 - dt) * 4) && Math.floor(t0 * 4) % 2 === 0) blip(180 + Math.random() * 30, 0.03, 'triangle', 0.04);
  cam.follow(cat.x + cat.w / 2, cat.y, cat.face, scr.w, scr.h, dt);
  // nearest exhibit
  const cx = cat.x + cat.w / 2;
  let best: Exhibit | null = null, bd = 1e9;
  for (const e of EXHIBITS) { const d = Math.abs(cx - e.x); if (d < (e.kind === 'magnet' ? 18 : 30) && d < bd) { bd = d; best = e; } }
  if (inspecting || leaving || !started) best = null;
  if (best !== near) { near = best; card.show(best); pad.showAct(!!best); if (best) { bang = 0.9; blip(1046, 0.07, 'sine', 0.07); } }
  bang = Math.max(0, bang - dt);
  if (!input.pressed('act')) actLock = false;
  if (near && input.hit('act') && !actLock) openInspect(near.id);
  // lazy-load models as the cat approaches
  if (viewer) for (const e of EXHIBITS) if (Math.abs(cx - e.x) < 380) void viewer.load(e.id);
  // the back door: lights flicker twice, then the dark
  if (!flickered && cx > BACKDOOR.x - 110) { flickered = true; flicker = 1.4; blip(110, 0.25, 'sawtooth', 0.05, -40); }
  if (!prefetched && cx > BACKDOOR.x - 200) { prefetched = true; prefetchNext(); }
  if (flicker > 0) flicker = Math.max(0, flicker - dt);
  whisper.classList.toggle('on', started && !leaving && cx > BACKDOOR.x - 90);
  if (!leaving && started && overlap(cat, doorBox)) {
    leaving = true; input.enabled = false; card.show(null); whisper.classList.remove('on');
    const c = scr.toClient(BACKDOOR.x + BACKDOOR.w / 2 - cam.ix, BACKDOOR.y + 30 - cam.iy);
    void go('night', () => irisOut(c.x, c.y, 900));
  }
}, () => {
  const g = scr.ctx, ox = -cam.ix, oy = -cam.iy;
  g.drawImage(bg, ox, oy);
  // flicker pattern: two quick dips
  const f = flicker, dark = f > 1.15 ? 0.55 : f > 0.95 ? 0 : f > 0.75 ? 0.62 : f > 0.55 ? 0.1 : 0;
  const loading = viewer ? EXHIBITS.filter(e => !viewer!.ready(e.id) && viewer!.progress(e.id) > 0).map(e => ({ x: e.x, y: e.kind === 'magnet' ? e.y : e.y - 3, w: e.kind === 'magnet' ? 16 : 24, p: viewer!.progress(e.id) })) : [];
  // soft floor shadow under the cat
  g.fillStyle = 'rgba(110,70,40,0.18)'; g.fillRect(Math.round(cat.x - 1 + ox), FLOOR_Y + oy, cat.w + 2, 1);
  drawDynamic(g, ox, oy, t0, { flicker: dark, loading });
  // front layer: the cat (+ its '!!') above the 3D models
  fg.clearRect(0, 0, front.width, front.height);
  if (!leaving || cat.x < doorBox.x + 2) {
    const img = cat.ground ? (Math.abs(cat.vx) > 5 ? frameAt(sp.walk, t0) : frameAt(sp.idle, t0)) : sp.jump;
    draw(fg, img, cat.x + cat.w / 2 - 7 + ox, cat.y + cat.h - 16 + oy, cat.face < 0);
    if (bang > 0) draw(fg, sp.bang, cat.x + cat.w / 2 - 2 + ox, cat.y - 10 - (bang > 0.75 ? 1 : 0) + oy);
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

void irisIn();
const begin = () => {
  started = true; input.enabled = true; walkIn = startX < 60 ? 0.55 : 0;
  blip(1568, 0.25, 'sine', 0.1); setTimeout(() => blip(2093, 0.4, 'sine', 0.07), 90);   // shop door bell
  if (viewerOnly) void viewerP.then(() => openInspect('figure-pig'));
};
if (params.has('skip') || viewerOnly || dev) begin();
else void startCard('shop.kicker', 'shop.title', 'shop.sub').then(begin);
