// /sea/ · stage 5 — the hammerhead swims left → right through nine film homages (scenes.ts), then rises to the surface
// at night and looks up; the pixel night hands over to the real sky (/sky/?from=sea&hz=<water line>).
// Controls: hold / drag anywhere = swim towards the finger; let go = it drifts on by itself (never stuck, no failing).
// Keyboard: arrows / WASD. Dev: ?at=<1..9> start in a scene · ?end = the ending · ?auto = swims fast by itself.
import { register, lang, onLang } from '../../shared/i18n';
import { mountChrome } from '../../shared/chrome';
import { params, from, go, markReached, reducedMotion } from '../../shared/flow';
import { PixelScreen } from '../../shared/pixel/screen';
import { startLoop } from '../../shared/pixel/loop';
import { frameAt, draw, silhouette } from '../../shared/pixel/sprite';
import { bayer } from '../../shared/dawn';
import { sharkSwim, SW, SH } from './shark';
import { SCENES, L, R, fish, type Ctx, type Scene } from './scenes';
import * as dict from './dict';
import './style.css';

register(dict); markReached('sea'); mountChrome({ sound: false, theme: 'dark' });
const host = document.getElementById('sea')!;
const screen = new PixelScreen({ host, minW: 200, minH: 170, maxH: 300 });
// tall phones: the picture is capped at 300 logical px high; above/below it the host continues the water and the sand
let hostBg = '';
const paintHost = (top: string, sand: string) => { const v = `linear-gradient(${top} 50%, ${sand} 50%)`; if (v !== hostBg) { hostBg = v; host.style.background = v; } };
const g = screen.ctx;
const reduced = reducedMotion();
const INTRO = 150, END0 = INTRO + SCENES.length * L;
const swim = sharkSwim();
const GHOST = ['#e05a5a', '#f2a33a', '#e8d04a', '#5ab86a', '#4a9ad9', '#8a6ad9', '#d96ab8'].map(c => silhouette(swim.frames[0], c));

// ---------- state ----------
const at = Math.max(0, Math.min(9, +(params.get('at') || 0)));
const auto = params.has('auto');
const S = { x: at ? INTRO + (at - 1) * L + 10 : 30, y: -SH, vx: 0, vy: 0, t: 0 };
let cam = Math.max(0, S.x - 80), touched = false, held: { x: number; y: number } | null = null, keys = new Set<string>();
let scene = -1, wipe: { k: number; s: Scene } | null = null, ending: { t: number; y0: number; x0: number } | null = null, left = false;
const trail: { x: number; y: number }[] = [];
let followers = 0;
const veil = document.createElement('div'); veil.className = 'sea-veil'; document.body.appendChild(veil);
requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('off')));
setTimeout(() => veil.remove(), 2200);
const title = document.createElement('div'); title.className = 'sea-title'; title.innerHTML = '<b></b><i></i>'; document.body.appendChild(title);
let titleT = 0;
function showTitle(s: Scene) {
  title.querySelector('b')!.textContent = lang === 'zh' ? s.zh : s.en; title.querySelector('i')!.textContent = String(s.year);
  title.classList.add('on'); clearTimeout(titleT); titleT = window.setTimeout(() => title.classList.remove('on'), 3400);
}
onLang(() => { if (scene >= 0 && scene < SCENES.length) { title.querySelector('b')!.textContent = lang === 'zh' ? SCENES[scene].zh : SCENES[scene].en; } });
if (params.has('end')) { S.x = END0 + 4; cam = S.x - 80; followers = 14; }

// ---------- input ----------
const toWorld = (e: PointerEvent) => { const p = screen.toLogical(e.clientX, e.clientY); return { x: p.x + cam, y: p.y }; };
screen.canvas.addEventListener('pointerdown', e => { touched = true; held = toWorld(e); screen.canvas.setPointerCapture(e.pointerId); });
screen.canvas.addEventListener('pointermove', e => { if (held) held = toWorld(e); });
const up = () => { held = null; };
screen.canvas.addEventListener('pointerup', up); screen.canvas.addEventListener('pointercancel', up);
window.addEventListener('keydown', (e: KeyboardEvent) => { keys.add(e.key.toLowerCase()); touched = true; });
window.addEventListener('keyup', (e: KeyboardEvent) => keys.delete(e.key.toLowerCase()));

// ---------- update ----------
function update(dt: number) {
  S.t += dt;
  const floor = screen.h - 12, intro = S.t < 2.2 && !at && !params.has('end');
  if (ending) return updateEnding(dt);
  const i = Math.floor((S.x + SW / 2 - INTRO) / L), slow = i === 8 ? 0.55 : 1;
  let ax = 0, ay = 0;
  if (intro) { S.y += ((screen.h * 0.42) - S.y) * Math.min(1, dt * 1.6); S.vx += (18 - S.vx) * dt; }
  else if (held) { const dx = held.x - (S.x + SW / 2), dy = held.y - (S.y + SH / 2); ax = Math.max(-1, Math.min(1, dx / 40)) * 160; ay = Math.max(-1, Math.min(1, dy / 30)) * 160; }
  else if (keys.size) { ax = ((keys.has('arrowright') || keys.has('d')) ? 1 : 0) - ((keys.has('arrowleft') || keys.has('a')) ? 1 : 0); ay = ((keys.has('arrowdown') || keys.has('s')) ? 1 : 0) - ((keys.has('arrowup') || keys.has('w')) ? 1 : 0); ax *= 160; ay *= 160; if (!ax) ax = (20 - S.vx) * 2; }
  else { ax = ((auto ? 140 : 20) * slow - S.vx) * 1.5; ay = ((screen.h * 0.45 + Math.sin(S.t * 0.7) * 10) - S.y) * 0.8 - S.vy * 1.2; } // drift on
  if (!intro) { S.vx += ax * dt; S.vy += ay * dt; }
  const max = (auto ? 160 : 78) * slow; S.vx = Math.max(-50, Math.min(max, S.vx)) * (1 - dt * 0.8); S.vy = Math.max(-60, Math.min(60, S.vy)) * (1 - dt * 1.6);
  S.x += S.vx * dt; if (!intro) S.y += S.vy * dt;
  S.x = Math.max(cam + 2, S.x); S.y = Math.min(floor - SH + 2, Math.max(intro ? -SH : 8, S.y));
  cam += (Math.max(cam, S.x - screen.w * 0.36) - cam) * Math.min(1, dt * 4); // the camera only follows forward
  trail.unshift({ x: S.x, y: S.y }); if (trail.length > 200) trail.pop();
  // scene changes → the incoming film's wipe + its title
  const ni = Math.max(-1, Math.min(SCENES.length, i));
  if (ni !== scene) { const prev = scene; scene = ni; if (ni >= 0 && ni < SCENES.length && ni > prev) { wipe = { k: reduced ? 2 : 0, s: SCENES[ni] }; showTitle(SCENES[ni]); } }
  if (wipe) { wipe.k += dt / 1.1; if (wipe.k > 1.45) wipe = null; }
  if (scene === 8) followers = Math.max(followers, Math.floor(((S.x - INTRO - 8 * L) / L) * 16));
  if (S.x > END0 + 10) { ending = { t: 0, y0: S.y, x0: S.x - cam }; title.classList.remove('on'); }
}
// the ending: the shark (and the little fish that found it) rises from the seabed to the surface and looks up
let camY = 0;
function updateEnding(dt: number) {
  const e = ending!; e.t += dt; const h = screen.h, T = e.t;
  const k = Math.min(1, T / 6), ease = k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
  camY = -h * 0.62 * ease; // the view climbs towards the surface
  const surf = -h * 0.06; // the water line in world y
  const ty = surf - 7; // eyes just above the water
  const tx = cam + screen.w * 0.5 - SW / 2;
  S.x += (tx - S.x) * Math.min(1, dt * 0.8); S.y += (ty - S.y) * Math.min(1, dt * (0.35 + 0.5 * k));
  trail.unshift({ x: S.x, y: S.y }); if (trail.length > 200) trail.pop();
  if (T > 8.6 && !left) { left = true; const hz = Math.max(0.3, Math.min(0.8, screen.toClient(0, surf - camY).y / innerHeight)); /* window terms: the canvas may be letterboxed */ void go('sky', () => new Promise(r => setTimeout(r, 60)), { hz: hz.toFixed(3) }); }
}

// ---------- render ----------
const lerpHex = (a: string, b: string, k: number) => { const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16); return `rgb(${[0, 1, 2].map(i => Math.round(p(a, i) + (p(b, i) - p(a, i)) * k)).join(',')})`; };
const INTRO_SC = { top: '#0d2c3b', bot: '#164a5a', sand: '#2a5a5a' };
function water(x0: number, x1: number, top: string, bot: string, sand: string, floor: number, oy = 0) {
  const bands = 10;
  for (let b = 0; b < bands; b++) { const y0 = Math.round(oy + (floor * b) / bands), y1 = Math.round(oy + (floor * (b + 1)) / bands); R(g, x0, y0, x1 - x0, y1 - y0, lerpHex(top, bot, b / (bands - 1))); }
  R(g, x0, oy + floor, x1 - x0, screen.h - floor + 2, sand);
  for (let x = Math.floor(x0 / 3) * 3; x < x1; x += 3) if (((x + Math.floor(cam)) * 7) % 11 < 3) R(g, x, oy + floor + 2 + ((x * 3) % 5), 1, 1, 'rgba(0,0,0,.18)');
}
function render() {
  const w = screen.w, h = screen.h, floor = h - 12, t = S.t, oy = -camY;
  R(g, 0, 0, w, h, '#05070d');
  // intro water (the colour the egg's tide ended on), then each scene's strip; a dithered seam between neighbours
  const ix = INTRO - cam; if (ix > 0) water(0, Math.min(w, ix), INTRO_SC.top, INTRO_SC.bot, INTRO_SC.sand, floor, oy);
  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i], x0 = INTRO + i * L - cam; if (x0 > w || x0 + L < 0) continue;
    water(Math.max(0, x0), Math.min(w, x0 + L), s.top, s.bot, s.sand, floor, oy);
  }
  const ex = END0 - cam; if (ex < w) water(Math.max(0, ex), w, '#1a2430', '#3a4858', '#5d6874', floor, oy);
  for (let i = 0; i <= SCENES.length; i++) { // seams: 16 px of ordered dither so one sea bleeds into the next
    const x0 = Math.round(INTRO + i * L - cam); if (x0 < -16 || x0 > w + 16) continue;
    const prev = i === 0 ? INTRO_SC : SCENES[i - 1];
    for (let y = 0; y < floor; y += 2) for (let dx = 0; dx < 16; dx += 2) if (bayer(dx >> 1, y >> 1) > dx / 16) R(g, x0 + dx, y + oy, 2, 2, lerpHex(prev.top, prev.bot, Math.min(1, y / floor)));
  }
  // drifting bubbles everywhere (quiet life in the water)
  const cur = scene >= 0 && scene < SCENES.length ? SCENES[scene] : scene < 0 ? INTRO_SC : { top: '#05070d', sand: '#123446' };
  paintHost(ending ? '#05070d' : cur.top, ending ? '#123446' : cur.sand);
  for (let i = 0; i < 18; i++) { const x = ((i * 53.3 - cam * 0.6) % (w + 20) + w + 20) % (w + 20) - 10, y = floor - ((t * (8 + (i % 5) * 3) + i * 40) % (floor + 20)); R(g, x + Math.sin(t + i) * 2, y + oy, 1, 1, 'rgba(220,240,245,.55)'); }
  // scene props behind the shark
  const sx = Math.round(S.x - cam), sy = Math.round(S.y + oy);
  const ctx = (i: number): Ctx => ({ g, t, w, h, x0: INTRO + i * L - cam, L, p: Math.max(0, Math.min(1, (S.x - INTRO - i * L) / L)), sx, sy, floor: floor + oy, seed: i });
  const clipTo = (i: number, f: () => void) => { const x0 = INTRO + i * L - cam; g.save(); g.beginPath(); g.rect(Math.round(x0), 0, L, h); g.clip(); f(); g.restore(); };
  for (let i = 0; i < SCENES.length; i++) { const x0 = INTRO + i * L - cam; if (x0 > w || x0 + L < 0) continue; clipTo(i, () => SCENES[i].back(ctx(i))); }
  // Mad Detective: the seven selves trail behind
  if (scene === 6) { const p = ctx(6).p; for (let k = 0; k < 7; k++) { const q = trail[Math.min(trail.length - 1, 10 + k * 9)]; if (!q || p < k * 0.05) continue; g.globalAlpha = 0.5; draw(g, GHOST[k], q.x - cam - 4 - k * 2, q.y + oy + Math.sin(t * 2 + k) * 3); g.globalAlpha = 1; } }
  // Still Life (and after): the little fish that came to keep it company
  for (let k = 0; k < Math.min(16, followers); k++) { const q = trail[Math.min(trail.length - 1, 14 + k * 8)]; if (!q) continue; fish(g, q.x - cam - 6 + Math.sin(t * 1.3 + k) * 5, q.y + oy + 8 + ((k * 7) % 13) - 6 + Math.cos(t + k) * 3, k % 3 ? '#c9d2da' : '#e9c46a', 1); }
  // the shark + its costume for the scene it is in
  draw(g, frameAt(swim, t * (held ? 1.6 : 1)), sx, sy);
  if (scene >= 0 && scene < SCENES.length && !ending) SCENES[scene].dress(ctx(scene));
  for (let i = 0; i < SCENES.length; i++) { const s = SCENES[i]; if (!s.front) continue; const x0 = INTRO + i * L - cam; if (x0 > w || x0 + L < 0) continue; clipTo(i, () => s.front!(ctx(i))); }
  // gentle hint until the first touch: three chevrons breathing ahead of the shark
  if (!touched && S.t > 2.6 && !ending) for (let k = 0; k < 3; k++) { const a = 0.25 + 0.5 * Math.max(0, Math.sin(t * 3 - k * 0.8)); g.globalAlpha = a; const x = sx + SW + 8 + k * 5, y = sy + SH / 2; R(g, x, y - 2, 1, 1, '#e8f2f4'); R(g, x + 1, y - 1, 1, 1, '#e8f2f4'); R(g, x + 2, y, 1, 1, '#e8f2f4'); R(g, x + 1, y + 1, 1, 1, '#e8f2f4'); R(g, x, y + 2, 1, 1, '#e8f2f4'); g.globalAlpha = 1; }
  if (wipe) drawWipe(wipe.s, wipe.k, sx + SW / 2, sy + SH / 2);
  if (ending || camY) renderSurface(oy);
}
// above the water: the night sky, the water line; whatever of the shark is under water is tinted by it
function renderSurface(oy: number) {
  const w = screen.w, h = screen.h, surf = Math.round(-h * 0.06 + oy); if (surf <= 0) return;
  const top = ['#05070d', '#080b14', '#0b1020', '#0e1626'];
  for (let b = 0; b < top.length; b++) R(g, 0, Math.round(surf * b / top.length), w, Math.ceil(surf / top.length) + 1, top[b]);
  for (let i = 0; i < 90; i++) { const x = (cellHash(i, 1) * w) | 0, y = (cellHash(i, 7) * surf * 0.92) | 0, tw = 0.55 + 0.45 * Math.sin(S.t * 2 + i); g.globalAlpha = (i % 6 === 0 ? 1 : 0.5) * tw; R(g, x, y, 1, 1, '#ece8df'); } g.globalAlpha = 1;
  // the shark breaks the surface: redraw it over the sky, then the water (translucent) over its lower part
  const sx = Math.round(S.x - cam), sy = Math.round(S.y + oy);
  draw(g, frameAt(swim, S.t * 0.6), sx, sy);
  g.globalAlpha = 0.55; R(g, 0, surf, w, h - surf, '#123446'); g.globalAlpha = 1;
  for (let x = 0; x < w; x += 2) R(g, x, surf + Math.round(Math.sin(x * 0.15 + S.t * 2) * 0.8), 2, 1, '#5d8a9a');
  for (let i = 0; i < 12; i++) { const x = ((i * 41 + S.t * 6) % w), y = surf + 2 + (i % 3); R(g, x, y, 3, 1, 'rgba(200,225,235,.35)'); }
}
// the scene wipes: a band sweeping through a shape-specific field f(x,y) ∈ [0,1]
const cellHash = (x: number, y: number) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
function drawWipe(s: Scene, k: number, cx: number, cy: number) {
  const w = screen.w, h = screen.h, B = 4, band = 0.42, D = Math.hypot(w, h);
  g.fillStyle = s.wipeCol;
  for (let y = 0; y < h; y += B) for (let x = 0; x < w; x += B) {
    let f: number; const dx = x - cx, dy = y - cy;
    switch (s.wipe) {
      case 'iris': f = Math.hypot(dx, dy) / D; break;
      case 'blinds': f = ((y % 24) / 24) * 0.5 + (x / w) * 0.5; break;
      case 'portal': f = (Math.hypot(dx, dy) / D) * 0.85 + 0.15 * (0.5 + 0.5 * Math.sin(Math.atan2(dy, dx) * 6)); break;
      case 'train': f = x / w; break;
      case 'glitch': f = cellHash(Math.floor(x / 12), Math.floor(y / 4)); break;
      case 'slash': f = (x + (h - y) * 0.6) / (w + h * 0.6); break;
      case 'shards': f = cellHash(Math.floor((x + y * 0.5) / 18), Math.floor((y - x * 0.3) / 18)); break;
      case 'heart': { const X = dx / (D * 0.5), Y = -dy / (D * 0.5) + 0.1; const q = X * X + Y * Y - 0.3; f = Math.max(0, Math.min(1, (q * q * q - X * X * Y * Y * Y) * 4 + 0.35 + Math.hypot(X, Y) * 0.5)); break; }
      default: f = bayer(x / B, y / B);
    }
    if (f < k && f > k - band) g.fillRect(x, y, B, B);
  }
}
startLoop(update, render);
