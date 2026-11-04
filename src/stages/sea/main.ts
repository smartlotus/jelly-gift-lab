// /sea/ · stage 5 — the hammerhead swims left → right through nine film homages (scenes.ts), then rises to the surface
// at night and looks up; the pixel night hands over to the real sky (/sky/?from=sea&hz=<water line>).
// v03b: a living sea (env.ts: far / mid / near layers, caustics, plankton, schools, jellyfish, seabed), a bigger shark
// that changes FORM per film with a pixel-dissolve + sparkles (shark.ts), and one short NPC beat per film (scenes.ts).
// Controls: hold / drag anywhere = swim towards the finger; let go = it drifts on by itself (never stuck, no failing).
// Keyboard: arrows / WASD. Dev: ?at=<1..15> start in a scene · ?end = the ending · ?auto = swims fast by itself ·
// ?beat=<seconds> (with ?at) = freeze that scene's beat at that time, for screenshots.
import { register, lang, onLang } from '../../shared/i18n';
import { mountChrome } from '../../shared/chrome';
import { params, go, markReached, reducedMotion } from '../../shared/flow';
import { PixelScreen } from '../../shared/pixel/screen';
import { startLoop } from '../../shared/pixel/loop';
import { frameAt, draw, silhouette } from '../../shared/pixel/sprite';
import { bayer } from '../../shared/dawn';
import { sharkForm, SW, SH, type Form } from './shark';
import { FILMS, L, R, fish, type Ctx, type Scene, type Pose } from './scenes';
import { TRAVEL } from './travel';
// the run (v03c): films interleaved with the places we've been — west to east across Liaoning, then Jilin, home last
const byId = (id: string) => [...FILMS, ...TRAVEL].find(s => s.id === id)!;
const SCENES: Scene[] = ['cat', 'jinzhou', 'thief', 'yixian', 'endgame', 'shenyang', 'busan', 'raccoon', 'jilin', 'bill', 'changbai', 'mad', 'drama', 'still', 'changchun'].map(byId);
const IDX = (id: string) => SCENES.findIndex(s => s.id === id), I_STILL = IDX('still'), I_MAD = IDX('mad');
import { far, giants, rays, motes, life, near, type Pal } from './env';
import * as dict from './dict';
import './style.css';

register(dict); markReached('sea'); mountChrome({ sound: false, theme: 'dark' });
const host = document.getElementById('sea')!;
const screen = new PixelScreen({ host, minW: 210, minH: 180, maxH: 640 });
let hostBg = '';
const paintHost = (top: string, sand: string) => { const v = `linear-gradient(${top} 50%, ${sand} 50%)`; if (v !== hostBg) { hostBg = v; host.style.background = v; } };
const g = screen.ctx;
const reduced = reducedMotion();
const INTRO = 170, END0 = INTRO + SCENES.length * L;
const INTRO_SC: Pal & { id: string } = { id: 'intro', top: '#0d2c3b', bot: '#164a5a', sand: '#2a5a5a', reef: 1, kelp: 1, life: 1 };
const END_SC: Pal & { id: string } = { id: 'end', top: '#1a2430', bot: '#3a4858', sand: '#5d6874', reef: 0.6, kelp: 0.6, life: 0.6 };
const palOf = (s: Scene): Pal => ({ top: s.top, bot: s.bot, sand: s.sand, ...s.env });
const palAt = (wx: number): Pal => { const i = Math.floor((wx - INTRO) / L); return i < 0 ? INTRO_SC : i >= SCENES.length ? END_SC : palOf(SCENES[i]); };
const floorOf = (h: number) => h - Math.max(16, Math.round(h * 0.07));
const GHOST = ['#e05a5a', '#4a9ad9', '#e8d04a'].map(c => silhouette(sharkForm('mad').frames[0], c));

// ---------- state ----------
const at = Math.max(0, Math.min(SCENES.length, +(params.get('at') || 0)));
const auto = params.has('auto'), freezeBeat = params.has('beat') ? +(params.get('beat') || 0) : null;
const P0 = +(params.get('p') || 0);
const S = { x: at ? INTRO + (at - 1) * L + 10 + P0 * L : 30, y: at ? screen.h * 0.45 : -SH, vx: 0, vy: 0, t: 0 };
let cam = Math.max(0, S.x - 80), touched = false, held: { x: number; y: number } | null = null; const keys = new Set<string>();
let scene = -1, wipe: { k: number; s: Scene } | null = null, ending: { t: number } | null = null, left = false;
const beatAt: number[] = SCENES.map(() => -1); // S.t when each scene's beat began
const trail: { x: number; y: number }[] = [];
let followers = 0, poseDy = 0;
// the shark's form + the morph between forms (ordered-dither dissolve + sparkles)
let form: Form = 'plain', prevForm: Form = 'plain', morph = 1;
const setForm = (f: Form) => { if (f === form) return; prevForm = form; form = f; morph = reduced ? 1 : 0; };
const MASKS = Array.from({ length: 17 }, (_, n) => { const c = document.createElement('canvas'); c.width = SW; c.height = SH; const m = c.getContext('2d')!; m.fillStyle = '#000'; for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (bayer(x, y) * 16 < n) m.fillRect(x, y, 1, 1); return c; });
const tmp = document.createElement('canvas'); tmp.width = SW; tmp.height = SH; const tg = tmp.getContext('2d')!;
function drawShark(x: number, y: number, t: number) {
  if (Math.abs(tilt) > 0.01) { g.save(); g.translate(x + SW / 2, y + SH / 2); g.rotate(tilt); drawSharkRaw(-SW / 2, -SH / 2, t); g.restore(); return; }
  drawSharkRaw(x, y, t);
}
function drawSharkRaw(x: number, y: number, t: number) {
  const fr = frameAt(sharkForm(form), t);
  if (morph >= 1) { draw(g, fr, x, y); return; }
  const n = Math.round(morph * 16), old = frameAt(sharkForm(prevForm), t);
  tg.clearRect(0, 0, SW, SH); tg.globalCompositeOperation = 'source-over'; tg.drawImage(old, 0, 0); tg.globalCompositeOperation = 'destination-out'; tg.drawImage(MASKS[n], 0, 0); draw(g, tmp, x, y);
  tg.clearRect(0, 0, SW, SH); tg.globalCompositeOperation = 'source-over'; tg.drawImage(fr, 0, 0); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(MASKS[n], 0, 0); tg.globalCompositeOperation = 'source-over'; draw(g, tmp, x, y);
  for (let k = 0; k < 7; k++) { const a = k * 0.9 + morph * 5, r = 8 + morph * 26; const sx = x + SW / 2 + Math.cos(a) * r, sy = y + SH / 2 + Math.sin(a) * r * 0.6; g.globalAlpha = 1 - morph; R(g, sx, sy - 1, 1, 3, '#fffbe8'); R(g, sx - 1, sy, 3, 1, '#fffbe8'); } g.globalAlpha = 1;
}
const veil = document.createElement('div'); veil.className = 'sea-veil'; document.body.appendChild(veil);
requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('off')));
setTimeout(() => veil.remove(), 2200);
const title = document.createElement('div'); title.className = 'sea-title'; title.innerHTML = '<b></b><i></i>'; document.body.appendChild(title);
let titleT = 0;
function showTitle(s: Scene) {
  title.querySelector('b')!.textContent = lang === 'zh' ? s.zh : s.en; title.querySelector('i')!.textContent = s.year ? String(s.year) : '';
  title.classList.add('on'); clearTimeout(titleT); titleT = window.setTimeout(() => title.classList.remove('on'), 3400);
}
onLang(() => { if (scene >= 0 && scene < SCENES.length) title.querySelector('b')!.textContent = lang === 'zh' ? SCENES[scene].zh : SCENES[scene].en; });
if (freezeBeat !== null && at - 1 === I_STILL) followers = 6;
if (params.has('end')) { S.x = END0 + 4; S.y = screen.h * 0.5; S.vx = 40; cam = S.x - 80; followers = 14; }

// ---------- input ----------
const toWorld = (e: PointerEvent) => { const p = screen.toLogical(e.clientX, e.clientY); return { x: p.x + cam, y: p.y }; };
screen.canvas.addEventListener('pointerdown', e => { touched = true; held = toWorld(e); screen.canvas.setPointerCapture(e.pointerId); });
screen.canvas.addEventListener('pointermove', e => { if (held) held = toWorld(e); });
const up = () => { held = null; };
screen.canvas.addEventListener('pointerup', up); screen.canvas.addEventListener('pointercancel', up);
window.addEventListener('keydown', (e: KeyboardEvent) => { keys.add(e.key.toLowerCase()); touched = true; });
window.addEventListener('keyup', (e: KeyboardEvent) => keys.delete(e.key.toLowerCase()));

// ---------- update ----------
const ctxOf = (i: number): Ctx => {
  const w = screen.w, h = screen.h, floor = floorOf(h);
  const bt = freezeBeat !== null && i === at - 1 ? freezeBeat : beatAt[i] < 0 ? -1 : S.t - beatAt[i];
  return { g, t: S.t, w, h, x0: INTRO + i * L - cam, L, p: Math.max(0, Math.min(1, (S.x + SW / 2 - INTRO - i * L) / L)), sx: Math.round(S.x - cam), sy: Math.round(S.y + poseDy), floor, bt };
};
function update(dt: number) {
  S.t += dt; if (morph < 1) morph = Math.min(1, morph + dt / 0.9);
  const floor = floorOf(screen.h), intro = S.t < 2.2 && !at && !params.has('end');
  if (ending) return updateEnding(dt);
  const i = Math.floor((S.x + SW / 2 - INTRO) / L);
  const pose: Pose = i >= 0 && i < SCENES.length ? SCENES[i].pose?.(ctxOf(i)) ?? {} : {};
  poseDy += ((pose.dy ?? 0) - poseDy) * Math.min(1, dt * 8);
  const inBeat = pose.slow !== undefined || pose.boost !== undefined, slow = (i === I_STILL ? 0.7 : 1) * (pose.slow ?? 1), drift = (auto ? 140 : 30) * slow + (pose.boost ?? 0) * 0.7;
  let ax = 0, ay = 0; const lane = screen.h * (screen.w < screen.h ? 0.55 : 0.46);
  if (intro) { S.y += (lane - S.y) * Math.min(1, dt * 1.6); S.vx += (18 - S.vx) * dt; }
  else if (held) { const dx = held.x - (S.x + SW / 2), dy = held.y - (S.y + SH / 2); ax = Math.max(-1, Math.min(1, dx / 40)) * 130; ay = Math.max(-1, Math.min(1, dy / 30)) * 150; }
  else if (keys.size) { ax = ((keys.has('arrowright') || keys.has('d')) ? 1 : 0) - ((keys.has('arrowleft') || keys.has('a')) ? 1 : 0); ay = ((keys.has('arrowdown') || keys.has('s')) ? 1 : 0) - ((keys.has('arrowup') || keys.has('w')) ? 1 : 0); ax *= 170; ay *= 170; if (!ax) ax = (drift - S.vx) * 2; }
  else { ax = (drift - S.vx) * 1.5; ay = ((lane + Math.sin(S.t * 0.7) * 10) - S.y) * 0.8 - S.vy * 1.2; } // drift on
  if (!intro) { S.vx += ax * dt; S.vy += ay * dt; }
  // v03c: ~30% slower than v03b (84 → 58); while a beat plays even a held finger is eased down (never below 45 %), so the
  // moment is seen; it stays responsive (vertical moves and steering are untouched)
  const max = (auto ? 160 : 58) * (i === I_STILL ? 0.8 : 1) * (inBeat ? Math.max(0.45, pose.slow ?? 1) : 1) + (pose.boost ?? 0) * 0.7; S.vx = Math.max(-50, Math.min(max, S.vx)) * (1 - dt * 0.8); S.vy = Math.max(-70, Math.min(70, S.vy)) * (1 - dt * 1.6);
  S.x += S.vx * dt; if (!intro) S.y += S.vy * dt;
  S.x = Math.max(cam + 2, S.x); S.y = Math.min(floor - SH + 6, Math.max(intro ? -SH : 4, S.y));
  const lead = screen.w < screen.h ? 0.26 : 0.34; // portrait: keep the shark further left, the film ahead in view
  cam += (Math.max(cam, S.x - screen.w * lead) - cam) * Math.min(1, dt * 4); // the camera only follows forward
  trail.unshift({ x: S.x, y: S.y }); if (trail.length > 220) trail.pop();
  const ni = Math.max(-1, Math.min(SCENES.length, i));
  if (ni !== scene) { const prev = scene; scene = ni; if (ni >= 0 && ni < SCENES.length && ni > prev) { wipe = { k: reduced ? 2 : 0, s: SCENES[ni] }; showTitle(SCENES[ni]); setForm(SCENES[ni].form); } if (ni >= SCENES.length) setForm('plain'); }
  if (i >= 0 && i < SCENES.length && beatAt[i] < 0 && ctxOf(i).p >= SCENES[i].beat.at) beatAt[i] = S.t;
  if (wipe) { wipe.k += dt / 1.1; if (wipe.k > 1.45) wipe = null; }
  if (beatAt[I_STILL] >= 0) followers = Math.max(followers, Math.min(16, Math.floor(1 + (S.t - beatAt[I_STILL] - 3) * 2.2)));
  if (S.x > END0 + 10) startEnding();
}
// the ending (v03c, smoother): one eased curve from wherever the shark is up to just under the surface — it keeps its
// forward momentum at first (Hermite start speed = its speed), bends upward, tilts its body gradually along the path,
// slows to a stop with its eyes above the water and its nose a little raised; the camera follows on a soft spring,
// the light rays brighten towards the surface; then a held moment with the stars before the hand-off to /sky/.
let camY = 0, tilt = 0;
let path: { p: number[][]; c: number; D: number } | null = null;
function startEnding() {
  ending = { t: 0 }; title.classList.remove('on'); setForm('plain');
  const h = screen.h, w = screen.w, surf = -h * 0.06, tx = cam + w * 0.62 - SW / 2, ty = surf - 13, v0 = Math.max(10, S.vx);
  const P = [[S.x, S.y], [S.x + Math.max(50, v0 * 1.4), S.y + 6], [tx, ty + h * 0.45], [tx, ty]];
  const len = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]) + Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]) + Math.hypot(P[3][0] - P[2][0], P[3][1] - P[2][1]);
  const D = 8.5; path = { p: P, c: Math.min(1.4, (v0 * D) / Math.max(1, len * 0.75)), D };
}
const bez = (P: number[][], s: number, k: 0 | 1) => { const u = 1 - s; return u * u * u * P[0][k] + 3 * u * u * s * P[1][k] + 3 * u * s * s * P[2][k] + s * s * s * P[3][k]; };
function updateEnding(dt: number) {
  const e = ending!, pth = path!; e.t += dt; const h = screen.h, w = screen.w; poseDy *= 0.9;
  const u = Math.min(1, e.t / pth.D), c = pth.c, s = (c - 2) * u ** 3 + (3 - 2 * c) * u ** 2 + c * u; // Hermite: matched start speed, zero end speed
  const nx = bez(pth.p, s, 0), ny = bez(pth.p, s, 1), dx = nx - S.x, dy = ny - S.y; S.x = nx; S.y = ny;
  const along = dx * dx + dy * dy > 0.0004 ? Math.max(-1.0, Math.min(0.25, Math.atan2(dy, Math.max(0.4, dx)))) : 0;
  const want = u < 0.9 ? along * 0.85 : -0.22 * Math.min(1, (u - 0.9) / 0.1 + (e.t - pth.D > 0 ? 1 : 0)); // nose up to look at the sky
  tilt += (want - tilt) * Math.min(1, dt * 2.4);
  const camYt = Math.min(0, S.y + 13 - h * 0.56); camY += (camYt - camY) * Math.min(1, dt * 2.2);
  cam += ((S.x + SW / 2 - w * 0.5) - cam) * Math.min(1, dt * 1.1);
  trail.unshift({ x: S.x, y: S.y }); if (trail.length > 220) trail.pop();
  if (e.t > pth.D + 2.2 && !left) { left = true; const hz = Math.max(0.3, Math.min(0.8, screen.toClient(0, -h * 0.06 - camY).y / innerHeight)); /* window terms: the canvas may be letterboxed */ void go('sky', () => new Promise(r => setTimeout(r, 60)), { hz: hz.toFixed(3) }); }
}

// ---------- render ----------
const lerpHex = (a: string, b: string, k: number) => { const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16); return `rgb(${[0, 1, 2].map(i => Math.round(p(a, i) + (p(b, i) - p(a, i)) * k)).join(',')})`; };
function water(x0: number, x1: number, p: Pal, floor: number, oy = 0) {
  const bands = 14;
  for (let b = 0; b < bands; b++) { const y0 = Math.round(oy + (floor * b) / bands), y1 = Math.round(oy + (floor * (b + 1)) / bands); R(g, x0, y0, x1 - x0, y1 - y0, lerpHex(p.top, p.bot, (b / (bands - 1)) ** 1.15)); }
  R(g, x0, oy + floor, x1 - x0, screen.h - floor + 2, p.sand);
}
function render() {
  const w = screen.w, h = screen.h, floor = floorOf(h), t = S.t, oy = -camY;
  R(g, 0, 0, w, h, '#05070d');
  const strips: { id: string; x0: number; p: Pal; i: number }[] = [];
  const ix = INTRO - cam; if (ix > 0) strips.push({ id: 'intro', x0: ix - INTRO, p: INTRO_SC, i: -1 });
  for (let i = 0; i < SCENES.length; i++) { const x0 = INTRO + i * L - cam; if (x0 < w && x0 + L > 0) strips.push({ id: SCENES[i].id, x0, p: palOf(SCENES[i]), i }); }
  const ex = END0 - cam; if (ex < w) strips.push({ id: 'end', x0: ex, p: END_SC, i: 99 });
  for (const s of strips) { const wd = s.i === -1 ? INTRO : s.i === 99 ? w + 400 : L; water(Math.max(0, s.x0), Math.min(w, s.x0 + wd), s.p, floor, oy); }
  for (let i = 0; i <= SCENES.length; i++) { // seams: 16 px of ordered dither so one sea bleeds into the next
    const x0 = Math.round(INTRO + i * L - cam); if (x0 < -16 || x0 > w + 16) continue;
    const prev = i === 0 ? INTRO_SC : palOf(SCENES[i - 1]);
    for (let y = 0; y < floor; y += 2) for (let dx = 0; dx < 16; dx += 2) if (bayer(dx >> 1, y >> 1) > dx / 16) R(g, x0 + dx, y + oy, 2, 2, lerpHex(prev.top, prev.bot, Math.min(1, y / floor)));
  }
  g.save(); g.translate(0, oy);
  giants(g, w, h, t, cam, palAt); far(g, w, h, floor, cam, palAt);
  rays(g, w, h, t, cam, ending && path ? 1 + 0.9 * Math.min(1, ending.t / path.D) : 1);
  const clip = (x0: number, wd: number, f: () => void) => { g.save(); g.beginPath(); g.rect(Math.round(x0), -h, wd, h * 3); g.clip(); f(); g.restore(); };
  for (const s of strips) { const wd = s.i === -1 ? INTRO : s.i === 99 ? w + 400 : L; clip(s.x0, wd, () => life({ g, t, w, h, x0: s.x0, L: wd, floor, cam }, s.id, s.p)); }
  g.restore();
  for (const s of strips) if (s.i >= 0 && s.i < SCENES.length) { const c = ctxOf(s.i); c.sy = Math.round(S.y + oy + poseDy); c.floor = floor + oy; clip(s.x0, L, () => SCENES[s.i].back(c)); }
  const sx = Math.round(S.x - cam), sy = Math.round(S.y + oy + poseDy);
  // Mad Detective: three of his own selves trail behind the detective
  if (scene === I_MAD) for (let k = 0; k < 3; k++) { const q = trail[Math.min(trail.length - 1, 14 + k * 12)]; if (!q) continue; g.globalAlpha = 0.32; draw(g, GHOST[k], q.x - cam - 10 - k * 4, q.y + oy + Math.sin(t * 2 + k) * 3); g.globalAlpha = 1; }
  // Still Life (and after): the little fish that came to keep it company (the first one is the lonely one, now gold)
  for (let k = 0; k < Math.min(16, followers); k++) { const q = trail[Math.min(trail.length - 1, 16 + k * 9)]; if (!q) continue; fish(g, q.x - cam - 4 + Math.sin(t * 1.3 + k) * 6, q.y + oy + SH / 2 + ((k * 7) % 17) - 8 + Math.cos(t + k) * 3, k === 0 || k % 4 === 0 ? '#e9c46a' : '#c9d2da', 1); }
  drawShark(sx, sy, t * (held ? 1.5 : 1));
  for (const s of strips) if (s.i >= 0 && s.i < SCENES.length && SCENES[s.i].front) { const c = ctxOf(s.i); c.sy = sy; c.floor = floor + oy; clip(s.x0, L, () => SCENES[s.i].front!(c)); }
  g.save(); g.translate(0, oy); motes(g, w, h, floor, t, cam); g.restore();
  if (!ending) near(g, w, h, t, cam, palAt);
  const cur = scene >= 0 && scene < SCENES.length ? SCENES[scene] : scene < 0 ? INTRO_SC : END_SC;
  paintHost(ending ? '#05070d' : cur.top, ending ? '#123446' : cur.sand);
  if (!touched && S.t > 2.6 && !ending) for (let k = 0; k < 3; k++) { const a = 0.25 + 0.5 * Math.max(0, Math.sin(t * 3 - k * 0.8)); g.globalAlpha = a; const x = sx + SW + 6 + k * 6, y = sy + SH / 2; for (let j = -3; j <= 3; j++) R(g, x + 3 - Math.abs(j), y + j, 1, 1, '#e8f2f4'); g.globalAlpha = 1; }
  if (wipe) drawWipe(wipe.s, wipe.k, sx + SW / 2, sy + SH / 2);
  if (ending || camY) renderSurface(oy);
}
// above the water: the night sky, the water line; whatever of the shark is under water is tinted by it
function renderSurface(oy: number) {
  const w = screen.w, h = screen.h, surf = Math.round(-h * 0.06 + oy); if (surf <= 0) return;
  const top = ['#05070d', '#080b14', '#0b1020', '#0e1626'];
  for (let b = 0; b < top.length; b++) R(g, 0, Math.round(surf * b / top.length), w, Math.ceil(surf / top.length) + 1, top[b]);
  for (let i = 0; i < 110; i++) { const x = (cellHash(i, 1) * w) | 0, y = (cellHash(7, i * 1.37) * surf * 0.92) | 0, tw = 0.55 + 0.45 * Math.sin(S.t * 2 + i); g.globalAlpha = (i % 6 === 0 ? 1 : 0.5) * tw; R(g, x, y, 1, 1, '#ece8df'); } g.globalAlpha = 1;
  const sx = Math.round(S.x - cam), sy = Math.round(S.y + oy);
  drawShark(sx, sy, S.t * 0.6);
  g.globalAlpha = 0.55; R(g, 0, surf, w, h - surf, '#123446'); g.globalAlpha = 1;
  for (let x = 0; x < w; x += 2) R(g, x, surf + Math.round(Math.sin(x * 0.15 + S.t * 2) * 0.8), 2, 1, '#5d8a9a');
  for (let i = 0; i < 14; i++) { const x = ((i * 41 + S.t * 6) % w), y = surf + 2 + (i % 3); R(g, x, y, 3, 1, 'rgba(200,225,235,.35)'); }
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
