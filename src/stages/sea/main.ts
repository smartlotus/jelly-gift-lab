// /sea/ · stage 5 — the hammerhead swims left → right through nine film homages (scenes.ts), then rises to the surface
// at night and looks up; the pixel night hands over to the real sky (/sky/?from=sea&hz=<water line>).
// v03b: a living sea (env.ts: far / mid / near layers, caustics, plankton, schools, jellyfish, seabed), a bigger shark
// that changes FORM per film with a pixel-dissolve + sparkles (shark.ts), and one short NPC beat per film (scenes.ts).
// Controls: hold / drag anywhere = swim towards the finger; let go = it drifts on by itself (never stuck, no failing).
// Keyboard: arrows / WASD. Dev: ?at=<1..9> start in a scene · ?end = the ending · ?auto = swims fast by itself ·
// ?beat=<seconds> (with ?at) = freeze that scene's beat at that time, for screenshots.
import { register, lang, onLang } from '../../shared/i18n';
import { mountChrome } from '../../shared/chrome';
import { params, go, markReached, reducedMotion } from '../../shared/flow';
import { PixelScreen } from '../../shared/pixel/screen';
import { startLoop } from '../../shared/pixel/loop';
import { frameAt, draw, silhouette } from '../../shared/pixel/sprite';
import { bayer } from '../../shared/dawn';
import { sharkForm, SW, SH, type Form } from './shark';
import { SCENES, L, R, fish, type Ctx, type Scene, type Pose } from './scenes';
import { far, rays, motes, life, near, type Pal } from './env';
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
const at = Math.max(0, Math.min(9, +(params.get('at') || 0)));
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
  title.querySelector('b')!.textContent = lang === 'zh' ? s.zh : s.en; title.querySelector('i')!.textContent = String(s.year);
  title.classList.add('on'); clearTimeout(titleT); titleT = window.setTimeout(() => title.classList.remove('on'), 3400);
}
onLang(() => { if (scene >= 0 && scene < SCENES.length) title.querySelector('b')!.textContent = lang === 'zh' ? SCENES[scene].zh : SCENES[scene].en; });
if (freezeBeat !== null && at === 9) followers = 6;
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
  const slow = (i === 8 ? 0.55 : 1) * (pose.slow ?? 1), drift = (auto ? 140 : 22) * slow + (pose.boost ?? 0);
  let ax = 0, ay = 0; const lane = screen.h * (screen.w < screen.h ? 0.55 : 0.46);
  if (intro) { S.y += (lane - S.y) * Math.min(1, dt * 1.6); S.vx += (18 - S.vx) * dt; }
  else if (held) { const dx = held.x - (S.x + SW / 2), dy = held.y - (S.y + SH / 2); ax = Math.max(-1, Math.min(1, dx / 40)) * 170; ay = Math.max(-1, Math.min(1, dy / 30)) * 170; }
  else if (keys.size) { ax = ((keys.has('arrowright') || keys.has('d')) ? 1 : 0) - ((keys.has('arrowleft') || keys.has('a')) ? 1 : 0); ay = ((keys.has('arrowdown') || keys.has('s')) ? 1 : 0) - ((keys.has('arrowup') || keys.has('w')) ? 1 : 0); ax *= 170; ay *= 170; if (!ax) ax = (drift - S.vx) * 2; }
  else { ax = (drift - S.vx) * 1.5; ay = ((lane + Math.sin(S.t * 0.7) * 10) - S.y) * 0.8 - S.vy * 1.2; } // drift on
  if (!intro) { S.vx += ax * dt; S.vy += ay * dt; }
  const max = (auto ? 160 : 84) * (i === 8 ? 0.6 : 1) + (pose.boost ?? 0); S.vx = Math.max(-50, Math.min(max, S.vx)) * (1 - dt * 0.8); S.vy = Math.max(-70, Math.min(70, S.vy)) * (1 - dt * 1.6);
  S.x += S.vx * dt; if (!intro) S.y += S.vy * dt;
  S.x = Math.max(cam + 2, S.x); S.y = Math.min(floor - SH + 6, Math.max(intro ? -SH : 4, S.y));
  const lead = screen.w < screen.h ? 0.26 : 0.34; // portrait: keep the shark further left, the film ahead in view
  cam += (Math.max(cam, S.x - screen.w * lead) - cam) * Math.min(1, dt * 4); // the camera only follows forward
  trail.unshift({ x: S.x, y: S.y }); if (trail.length > 220) trail.pop();
  const ni = Math.max(-1, Math.min(SCENES.length, i));
  if (ni !== scene) { const prev = scene; scene = ni; if (ni >= 0 && ni < SCENES.length && ni > prev) { wipe = { k: reduced ? 2 : 0, s: SCENES[ni] }; showTitle(SCENES[ni]); setForm(SCENES[ni].form); } if (ni >= SCENES.length) setForm('plain'); }
  if (i >= 0 && i < SCENES.length && beatAt[i] < 0 && ctxOf(i).p >= SCENES[i].beat.at) beatAt[i] = S.t;
  if (wipe) { wipe.k += dt / 1.1; if (wipe.k > 1.45) wipe = null; }
  if (beatAt[8] >= 0) followers = Math.max(followers, Math.min(16, Math.floor(1 + (S.t - beatAt[8] - 3) * 2.2)));
  if (S.x > END0 + 10) { ending = { t: 0 }; title.classList.remove('on'); setForm('plain'); }
}
// the ending: the shark (back to its plain self, and the little fish that found it) rises to the surface and looks up
let camY = 0;
function updateEnding(dt: number) {
  const e = ending!; e.t += dt; const h = screen.h, T = e.t; poseDy *= 0.9;
  const k = Math.min(1, T / 6), ease = k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
  camY = -h * 0.62 * ease;
  const surf = -h * 0.06, ty = surf - 13, tx = cam + screen.w * 0.5 - SW / 2;
  S.x += (tx - S.x) * Math.min(1, dt * 0.8); S.y += (ty - S.y) * Math.min(1, dt * (0.35 + 0.5 * k));
  trail.unshift({ x: S.x, y: S.y }); if (trail.length > 220) trail.pop();
  if (T > 8.6 && !left) { left = true; const hz = Math.max(0.3, Math.min(0.8, screen.toClient(0, surf - camY).y / innerHeight)); /* window terms: the canvas may be letterboxed */ void go('sky', () => new Promise(r => setTimeout(r, 60)), { hz: hz.toFixed(3) }); }
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
  far(g, w, h, floor, cam, palAt);
  rays(g, w, h, t, cam, ending ? 1 - Math.min(1, ending.t / 3) : 1);
  const clip = (x0: number, wd: number, f: () => void) => { g.save(); g.beginPath(); g.rect(Math.round(x0), -h, wd, h * 3); g.clip(); f(); g.restore(); };
  for (const s of strips) { const wd = s.i === -1 ? INTRO : s.i === 99 ? w + 400 : L; clip(s.x0, wd, () => life({ g, t, w, h, x0: s.x0, L: wd, floor, cam }, s.id, s.p)); }
  g.restore();
  for (const s of strips) if (s.i >= 0 && s.i < SCENES.length) { const c = ctxOf(s.i); c.sy = Math.round(S.y + oy + poseDy); c.floor = floor + oy; clip(s.x0, L, () => SCENES[s.i].back(c)); }
  const sx = Math.round(S.x - cam), sy = Math.round(S.y + oy + poseDy);
  // Mad Detective: three of his own selves trail behind the detective
  if (scene === 6) for (let k = 0; k < 3; k++) { const q = trail[Math.min(trail.length - 1, 14 + k * 12)]; if (!q) continue; g.globalAlpha = 0.32; draw(g, GHOST[k], q.x - cam - 10 - k * 4, q.y + oy + Math.sin(t * 2 + k) * 3); g.globalAlpha = 1; }
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
