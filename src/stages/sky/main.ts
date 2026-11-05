// /sky/ · the real sky over the city (config.ts: Changchun). Default view = LIVE: the sky right now, re-computed continuously
// (Earth rotation every frame, Sun / Moon / planets every 2 s), with a physically-motivated daylight / twilight sky and a
// "hide daylight" toggle. Secondary views: day 1 and day N at the configured clock time.
// Stars: HYG-derived catalogue (J2000, mag ≤ 6) rotated to the local horizon with astronomy-engine (precession + nutation +
// refraction); Moon / planets from the same ephemeris (topocentric). No date limits — everything is computed in the browser.
// "The same sky again" = astro.recur(), computed in-page for the selected moment, never hard-coded.
import * as A from 'astronomy-engine';
import { register, t, onLang, apply, lang } from '../../shared/i18n';
import { mountChrome } from '../../shared/chrome';
import { openCinema } from './cinema';
import { irisIn } from '../../shared/transition';
import { drawDawn, DAWN_LINES } from '../../shared/dawn';
import { go, from as cameFrom, markReached } from '../../shared/flow';
import { params } from '../../shared/flow';
import { SKY } from './config';
import { sky, skyAt, wall, recur, addDays, dayDiff, altDeg, azDeg, PLANETS, type Sky, type Recur, type V3, type M3 } from './astro';
import STARS from './data/stars.json';
import LINES from './data/lines.json';
import * as dict from './dict';
import './style.css';

register(dict); mountChrome({ sound: false, theme: 'dark' });
const host = document.getElementById('sky')!;
const cv = document.createElement('canvas'); host.appendChild(cv);
const g = cv.getContext('2d')!;
const still = params.has('still');
const D2R = Math.PI / 180;
const PLACE = SKY.place, placeN = SKY.placeN ?? SKY.place;
// ?at=2026-11-03T21:00 (local) pins the "live" clock (dev / screenshots)
const pinned = params.get('at'); const t0real = Date.now(), t0 = pinned ? (() => { const [d, tm] = pinned.split('T'); return zonedMs(d, tm || '21:00'); })() : t0real;
function zonedMs(d: string, tm: string) { return sky(d, tm, PLACE).t.getTime(); }
const nowT = () => new Date(t0 + (Date.now() - t0real));

// ---------- the three moments: 0 = live, 1 = day 1, 2 = day N ----------
interface Moment { s: Sky; mags: Record<string, number>; sunAlt: number }
const moment = (s: Sky): Moment => ({ s, mags: Object.fromEntries(PLANETS.map(p => [p, A.Illumination(p as A.Body, s.t).mag])), sunAlt: altDeg(s.sun) });
const fixed = [moment(sky(SKY.start, SKY.time, PLACE)), moment(sky(addDays(SKY.start, SKY.dayN - 1), SKY.time, placeN))];
let live = moment(skyAt(nowT(), PLACE)), liveAt = performance.now();
const M_of = (i: number) => (i === 0 ? live : fixed[i - 1]);
const recs: (Recur | null)[] = [null, null, null];

// ---------- catalogue -> unit vectors (J2000) ----------
const N = STARS.length / 4, SV = new Float32Array(N * 3), SM = new Float32Array(N), SC: string[] = [], PH = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const ra = STARS[i * 4] / 100 * D2R, de = STARS[i * 4 + 1] / 100 * D2R, c = Math.cos(de);
  SV[i * 3] = c * Math.cos(ra); SV[i * 3 + 1] = c * Math.sin(ra); SV[i * 3 + 2] = Math.sin(de);
  SM[i] = STARS[i * 4 + 2] / 100; SC.push(bvColour(STARS[i * 4 + 3] / 100)); PH[i] = Math.random() * 100;
}
const LV: Float32Array[] = (LINES as { id: string; l: number[][] }[]).flatMap(c => c.l.map(seg => {
  const out = new Float32Array(seg.length / 2 * 3);
  for (let k = 0; k < seg.length / 2; k++) { const ra = seg[k * 2] / 100 * D2R, de = seg[k * 2 + 1] / 100 * D2R, cc = Math.cos(de); out.set([cc * Math.cos(ra), cc * Math.sin(ra), Math.sin(de)], k * 3); }
  return out;
}));
function bvColour(bv: number) {
  const T = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
  const stops: [number, number[]][] = [[3000, [255, 196, 150]], [4000, [255, 216, 178]], [5000, [255, 233, 210]], [6000, [255, 245, 236]], [7500, [236, 240, 255]], [10000, [212, 224, 255]], [20000, [190, 208, 255]]];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) if (T >= stops[i][0] && T <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; }
  const k = Math.max(0, Math.min(1, (T - a[0]) / (b[0] - a[0] || 1)));
  return `${Math.round(a[1][0] + (b[1][0] - a[1][0]) * k)},${Math.round(a[1][1] + (b[1][1] - a[1][1]) * k)},${Math.round(a[1][2] + (b[1][2] - a[1][2]) * k)}`;
}

// ---------- rotation interpolation (quaternions) ----------
type Q = [number, number, number, number];
const std = (m: M3): number[][] => [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]];
function quat(M: number[][]): Q {
  const tr = M[0][0] + M[1][1] + M[2][2]; let w, x, y, z;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (M[2][1] - M[1][2]) / s; y = (M[0][2] - M[2][0]) / s; z = (M[1][0] - M[0][1]) / s; }
  else if (M[0][0] > M[1][1] && M[0][0] > M[2][2]) { const s = Math.sqrt(1 + M[0][0] - M[1][1] - M[2][2]) * 2; w = (M[2][1] - M[1][2]) / s; x = s / 4; y = (M[0][1] + M[1][0]) / s; z = (M[0][2] + M[2][0]) / s; }
  else if (M[1][1] > M[2][2]) { const s = Math.sqrt(1 + M[1][1] - M[0][0] - M[2][2]) * 2; w = (M[0][2] - M[2][0]) / s; x = (M[0][1] + M[1][0]) / s; y = s / 4; z = (M[1][2] + M[2][1]) / s; }
  else { const s = Math.sqrt(1 + M[2][2] - M[0][0] - M[1][1]) * 2; w = (M[1][0] - M[0][1]) / s; x = (M[0][2] + M[2][0]) / s; y = (M[1][2] + M[2][1]) / s; z = s / 4; }
  return [w, x, y, z];
}
function slerpQ(a: Q, b: Q, k: number): Q {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = [-b[0], -b[1], -b[2], -b[3]]; d = -d; }
  if (d > 0.9995) { const r = a.map((v, i) => v + (b[i] - v) * k) as Q; const l = Math.hypot(...r); return r.map(v => v / l) as Q; }
  const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - k) * th) / s, wb = Math.sin(k * th) / s;
  return a.map((v, i) => v * wa + b[i] * wb) as Q;
}
function mat([w, x, y, z]: Q): number[][] {
  return [[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)], [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)], [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]];
}
function slerpV(a: V3, b: V3, k: number): V3 {
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), th = Math.acos(d);
  if (th < 1e-5) return a; const s = Math.sin(th), wa = Math.sin((1 - k) * th) / s, wb = Math.sin(k * th) / s;
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
}

// ---------- displayed state (blends from a frozen snapshot to the selected moment) ----------
interface State { q: Q; moon: V3; sun: V3; frac: number; planets: Record<string, V3>; pm: Record<string, number> }
function stateOf(i: number): State {
  const m = M_of(i), s = m.s;
  // live: rotate the frame to *this instant* every frame (cheap), bodies come from the last 2 s ephemeris update
  const q = i === 0 && !still ? quat(std(A.Rotation_EQJ_HOR(nowT(), new A.Observer(PLACE.lat, PLACE.lon, PLACE.height)).rot)) : quat(std(s.m));
  return { q, moon: s.moon, sun: s.sun, frac: s.moonFrac, planets: s.planets as Record<string, V3>, pm: m.mags };
}
function blend(a: State, b: State, e: number): State {
  return { q: slerpQ(a.q, b.q, e), moon: slerpV(a.moon, b.moon, e), sun: slerpV(a.sun, b.sun, e), frac: a.frac + (b.frac - a.frac) * e,
    planets: Object.fromEntries(PLANETS.map(p => [p, slerpV(a.planets[p], b.planets[p], e)])), pm: Object.fromEntries(PLANETS.map(p => [p, a.pm[p] + (b.pm[p] - a.pm[p]) * e])) };
}
const v0 = params.get('day') === '1' ? 1 : params.get('day') === 'n' ? 2 : 0;
let cur = v0, from: State = stateOf(v0), kT = 1, shown: State = from;
let hideDay = false, hideK = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let intro = still || reduced ? 99 : 0; // seconds since entry: stars fade in brightest-first

// ---------- view ----------
const view = { az: 180, alt: 32, fov: 78 };
function aim(i: number) { // open looking at the brightest thing that is up (moon, else the brightest planet, else south)
  const m = M_of(i), s = m.s, up: [number, V3][] = [];
  if (altDeg(s.moon) > 5) up.push([-12, s.moon]);
  for (const p of PLANETS) if (altDeg(s.planets[p]) > 8) up.push([m.mags[p], s.planets[p]]);
  up.sort((a, b) => a[0] - b[0]);
  if (up[0]) { view.az = azDeg(up[0][1]); view.alt = Math.min(48, Math.max(14, altDeg(up[0][1]) - 6)); }
}
aim(v0);
// journey arrival from the jelly egg ("抬头"): open on the dark horizon and raise the eyes into the sky (3.6 s, cubic in-out)
let lastHy = 0;
// leaving for the co-op meadow (see leaveTick): eyes lower to the horizon, the sky pixelates into the shared dawn frame
let leave: { t: number; alt0: number; fov0: number; tgt: number } | null = null;
let raise = (cameFrom === 'jelly' || cameFrom === 'sea') && !still && !reduced ? { t: cameFrom === 'sea' ? -0.6 : 0, a0: cameFrom === 'sea' ? 16 : -6, a1: view.alt } : null;
// arrival from /sea/: the shark has just surfaced. Hold the horizon exactly where the pixel water line was (?hz, settled
// by feedback during the first 0.6 s while the page is still fading in), let the water drain below it, then raise the eyes.
const seaHz = cameFrom === 'sea' ? Math.max(0.3, Math.min(0.8, +(new URLSearchParams(location.search).get('hz') || 0.62))) : 0;
if (cameFrom === 'sea') {
  const w = document.createElement('div'); w.className = 'sk-water'; w.style.top = `${seaHz * 100}%`; w.innerHTML = '<i></i>'; document.body.appendChild(w);
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => w.classList.add('off'), reduced ? 0 : 900)));
  setTimeout(() => w.remove(), 4500);
}
if (raise) view.alt = raise.a0;
markReached();
let W = 0, H = 0, dpr = 1;
function resize() { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.width = Math.round(innerWidth * dpr); H = cv.height = Math.round(innerHeight * dpr); cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; }
window.addEventListener('resize', resize);
const CY = 0.42;
let F: V3 = [1, 0, 0], R: V3 = [0, -1, 0], U: V3 = [0, 0, 1], K = 1;
function camera() {
  const az = view.az * D2R, al = view.alt * D2R;
  F = [Math.cos(al) * Math.cos(az), -Math.cos(al) * Math.sin(az), Math.sin(al)];
  R = [-Math.sin(az), -Math.cos(az), 0];
  U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
  K = (Math.min(W, H) / 2) / Math.tan(view.fov * D2R / 4);
}
const P = { x: 0, y: 0 };
function proj(x: number, y: number, z: number): boolean {
  const f = x * F[0] + y * F[1] + z * F[2]; if (f < -0.6) return false;
  const d = 1 + f; P.x = W / 2 + K * (x * R[0] + y * R[1] + z * R[2]) / d; P.y = H * CY - K * (x * U[0] + y * U[1] + z * U[2]) / d; return true;
}

// ---------- daylight model ----------
// sky colours (zenith, horizon) keyed by the Sun's altitude: day · golden hour · sunset · civil · nautical · astronomical · night
const SKYK: [number, string, string][] = [[20, '#3d74b0', '#a7c6e2'], [6, '#3a6aa6', '#c9c3b8'], [0, '#2d4a78', '#9a96a2'], [-6, '#18223f', '#4b4560'], [-12, '#0a1126', '#242a42'], [-18, '#03050a', '#141722']];
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: string, b: string, k: number) => { const A1 = hex(a), B1 = hex(b); return `rgb(${A1.map((v, i) => Math.round(v + (B1[i] - v) * k)).join(',')})`; };
function skyCols(sunAlt: number): [string, string] {
  if (sunAlt >= SKYK[0][0]) return [SKYK[0][1], SKYK[0][2]];
  for (let i = 0; i < SKYK.length - 1; i++) { const [a0, z0, h0] = SKYK[i], [a1, z1, h1] = SKYK[i + 1]; if (sunAlt <= a0 && sunAlt >= a1) { const k = (a0 - sunAlt) / (a0 - a1); return [mix(z0, z1, k), mix(h0, h1, k)]; } }
  return ['#03050a', '#141722'];
}
/** naked-eye limiting magnitude vs Sun altitude (dark site ≈ 6; daytime only the brightest planets / Moon) */
const limMag = (sunAlt: number) => sunAlt >= 0 ? -3.5 : sunAlt <= -18 ? 6 : sunAlt > -6 ? -3.5 + (-sunAlt / 6) * 5 : 1.5 + ((-sunAlt - 6) / 12) * 4.5;

// ---------- drawing ----------
const PCOL: Record<string, string> = { Mercury: '214,206,196', Venus: '255,248,226', Mars: '255,178,140', Jupiter: '255,236,206', Saturn: '240,222,170' };
const moonCv = document.createElement('canvas');
const serif = () => getComputedStyle(document.body).getPropertyValue('--serif');
function frame(now: number) {
  camera(); const tw = still ? 0 : now / 1000;
  const target = stateOf(cur), e = kT >= 1 ? 1 : (kT < .5 ? 4 * kT ** 3 : 1 - (-2 * kT + 2) ** 3 / 2);
  const s = shown = kT >= 1 ? target : blend(from, target, e), M = mat(s.q);
  const realAlt = altDeg(s.sun), sunAlt = realAlt + (Math.min(realAlt, -30) - realAlt) * (hideK * hideK * (3 - 2 * hideK)), day = Math.max(0, Math.min(1, (sunAlt + 12) / 18)), lim = limMag(sunAlt);
  // sky gradient by sun altitude, plus the glow on the Sun's side
  const hd = Math.hypot(F[0], F[1]) || 1; proj(F[0] / hd, F[1] / hd, 0); const hy = P.y; lastHy = hy;
  const [zc, hc] = skyCols(sunAlt);
  const gr = g.createLinearGradient(0, hy - H * 1.1, 0, hy); gr.addColorStop(0, zc); gr.addColorStop(1, hc);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (sunAlt > -14 && proj(s.sun[0], s.sun[1], Math.max(-0.05, s.sun[2]))) {
    const glow = Math.max(0, 1 - Math.abs(sunAlt + 2) / 16), rr = Math.max(W, H) * 0.7, h2 = g.createRadialGradient(P.x, P.y, 0, P.x, P.y, rr);
    h2.addColorStop(0, `rgba(255,196,150,${(0.6 * glow).toFixed(3)})`); h2.addColorStop(0.45, `rgba(240,170,140,${(0.22 * glow).toFixed(3)})`); h2.addColorStop(1, 'rgba(255,214,170,0)'); g.fillStyle = h2; g.fillRect(0, 0, W, H);
  }
  // constellation lines fade out with daylight
  const la = 0.10 * (1 - day * 0.9) * Math.max(0, Math.min(1, (intro - 1.6) / 1.4));
  if (la > 0.01) {
    g.lineWidth = 0.8 * dpr; g.strokeStyle = `rgba(160,178,214,${la.toFixed(3)})`; g.beginPath();
    for (const seg of LV) {
      let pen = false;
      for (let i = 0; i < seg.length; i += 3) {
        const x = M[0][0] * seg[i] + M[0][1] * seg[i + 1] + M[0][2] * seg[i + 2], y = M[1][0] * seg[i] + M[1][1] * seg[i + 1] + M[1][2] * seg[i + 2], z = M[2][0] * seg[i] + M[2][1] * seg[i + 1] + M[2][2] * seg[i + 2];
        if (z < 0 || !proj(x, y, z)) { pen = false; continue; }
        if (pen) g.lineTo(P.x, P.y); else g.moveTo(P.x, P.y); pen = true;
      }
    }
    g.stroke();
  }
  // stars: extinction ~0.28 mag/airmass, scintillation near the horizon, cut at the daylight limiting magnitude
  const zoom = 78 / view.fov;
  for (let i = 0; i < N; i++) {
    if (SM[i] > lim + 0.3) continue;
    const vx = SV[i * 3], vy = SV[i * 3 + 1], vz = SV[i * 3 + 2];
    const z = M[2][0] * vx + M[2][1] * vy + M[2][2] * vz; if (z < -0.01) continue;
    const x = M[0][0] * vx + M[0][1] * vy + M[0][2] * vz, y = M[1][0] * vx + M[1][1] * vy + M[1][2] * vz;
    if (!proj(x, y, z)) continue; if (P.x < -4 || P.y < -4 || P.x > W + 4 || P.y > H + 4) continue;
    const alt = Math.max(0.5, Math.asin(z) / D2R), air = 1 / (Math.sin((alt + 244 / (165 + 47 * alt ** 1.1)) * D2R));
    const m = SM[i] + 0.28 * (air - 1); if (m > Math.min(6.2, lim + 0.3)) continue;
    const scint = still ? 1 : 1 + Math.min(0.5, 0.06 * air) * Math.sin(tw * (2.1 + (i % 7) * .37) + PH[i]) * Math.sin(tw * 0.73 + PH[i] * 1.7);
    const fl = Math.pow(10, -0.4 * m) * scint, r = Math.max(0.7, Math.min(4.6, 2.3 * Math.pow(fl, 0.3))) * dpr * Math.sqrt(zoom);
    const a = Math.min(1, 0.5 + Math.pow(fl, 0.4) * 1.6) * Math.min(1, (Math.min(6.3, lim + 0.3) - m) / 1.4);
    const ia = intro >= 99 ? 1 : Math.max(0, Math.min(1, (intro * 3.2 - (SM[i] + 1.5)) / 1.6)); // mag -1.5 at 0 s … mag 6 at ~2.8 s
    if (a * ia <= 0.02) continue;
    const aa = a * ia; g.fillStyle = `rgba(${SC[i]},${aa.toFixed(3)})`;
    if (m < 2) { const hr = r * (m < 0.5 ? 5 : 3.6), h = g.createRadialGradient(P.x, P.y, 0, P.x, P.y, hr); h.addColorStop(0, `rgba(${SC[i]},${(aa * .22).toFixed(3)})`); h.addColorStop(1, `rgba(${SC[i]},0)`); g.fillStyle = h; g.fillRect(P.x - hr, P.y - hr, hr * 2, hr * 2); g.fillStyle = `rgba(${SC[i]},${aa.toFixed(3)})`; }
    g.beginPath(); g.arc(P.x, P.y, r, 0, 6.2832); g.fill();
  }
  // planets (visible down to the same daylight limit)
  g.font = `${10.5 * dpr}px ${serif()}`; g.textAlign = 'center'; g.textBaseline = 'top';
  for (const p of PLANETS) {
    const v = s.planets[p]; if (v[2] < -0.01 || s.pm[p] > lim + 0.5 || !proj(v[0], v[1], v[2])) continue;
    const fl = Math.pow(10, -0.4 * s.pm[p]), r = Math.max(1.1, Math.min(4.6, 1.3 * Math.pow(fl, 0.3) * 1.6)) * dpr;
    const h = g.createRadialGradient(P.x, P.y, 0, P.x, P.y, r * 5); h.addColorStop(0, `rgba(${PCOL[p]},.25)`); h.addColorStop(1, `rgba(${PCOL[p]},0)`); g.fillStyle = h; g.fillRect(P.x - r * 5, P.y - r * 5, r * 10, r * 10);
    g.fillStyle = `rgb(${PCOL[p]})`; g.beginPath(); g.arc(P.x, P.y, r, 0, 6.2832); g.fill();
    g.fillStyle = day > 0.6 ? 'rgba(250,248,242,.75)' : 'rgba(226,222,212,.5)'; g.fillText(t(`sky.p.${p}`), P.x, P.y + r + 6 * dpr);
  }
  drawMoon(s.moon, s.sun, s.frac, day);
  if (hideK < 1) { g.globalAlpha = 1 - hideK; drawSun(s.sun); g.globalAlpha = 1; }
  // ground (true horizon), slightly see-through so a set moon / planet still reads
  g.beginPath(); let first = true, lx = 0, fx = 0;
  for (let d = -178; d <= 178; d += 2) {
    const a = (view.az + d) * D2R; if (!proj(Math.cos(a), -Math.sin(a), 0)) continue;
    if (first) { g.moveTo(P.x, P.y); fx = P.x; first = false; } else g.lineTo(P.x, P.y); lx = P.x;
  }
  if (!first) { g.lineTo(lx, H * 6); g.lineTo(fx, H * 6); g.closePath(); }
  const gl = Math.round(day * 26), gg = g.createLinearGradient(0, hy, 0, hy + H * .25);
  gg.addColorStop(0, `rgba(${6 + gl},${7 + gl},${10 + gl},.88)`); gg.addColorStop(1, `rgba(${3 + gl / 2},${4 + gl / 2},${6 + gl / 2},.96)`);
  g.fillStyle = gg; g.fill();
  g.strokeStyle = 'rgba(200,196,186,.16)'; g.lineWidth = dpr; g.beginPath(); first = true;
  for (let d = -178; d <= 178; d += 2) { const a = (view.az + d) * D2R; if (!proj(Math.cos(a), -Math.sin(a), 0)) { first = true; continue; } if (first) g.moveTo(P.x, P.y); else g.lineTo(P.x, P.y); first = false; }
  g.stroke();
  g.font = `${11 * dpr}px ${serif()}`; g.fillStyle = 'rgba(226,222,212,.55)'; g.textBaseline = 'top';
  (['N', 'E', 'S', 'W'] as const).forEach((c, i) => { const a = i * 90 * D2R; if (proj(Math.cos(a), -Math.sin(a), 0) && P.x > 0 && P.x < W) { g.fillRect(P.x - 0.5 * dpr, P.y - 4 * dpr, dpr, 8 * dpr); g.fillText(t(`sky.${c}`), P.x, P.y + 9 * dpr); } });
  document.body.dataset.daylight = day > 0.55 ? '1' : '0';
  sunBtn.style.visibility = hideDay || altDeg(s.sun) > -14 ? 'visible' : 'hidden'; // the toggle only exists while there is daylight to hide
}
function drawSun(v: V3) {
  if (v[2] < -0.02 || !proj(v[0], v[1], v[2])) return;
  const r = Math.max(8 * dpr, K * Math.tan(0.27 * 4 * D2R / 2)), h = g.createRadialGradient(P.x, P.y, r * 0.6, P.x, P.y, r * 9);
  h.addColorStop(0, 'rgba(255,246,228,.55)'); h.addColorStop(1, 'rgba(255,246,228,0)'); g.fillStyle = h; g.fillRect(P.x - r * 9, P.y - r * 9, r * 18, r * 18);
  g.fillStyle = '#fff8ec'; g.beginPath(); g.arc(P.x, P.y, r, 0, 6.2832); g.fill();
}
function drawMoon(v: V3, sun: V3, frac: number, day: number) {
  if (!proj(v[0], v[1], v[2])) return; const cx = P.x, cy = P.y;
  const d = v[0] * sun[0] + v[1] * sun[1] + v[2] * sun[2], tx = sun[0] - d * v[0], ty = sun[1] - d * v[1], tz = sun[2] - d * v[2], tl = Math.hypot(tx, ty, tz) || 1, e = 0.01;
  if (!proj(v[0] + tx / tl * e, v[1] + ty / tl * e, v[2] + tz / tl * e)) return; const ang = Math.atan2(P.y - cy, P.x - cx);
  const r = Math.max(7 * dpr, K * Math.tan(0.26 * D2R * 4 / 2) * 2 / 2);
  const S = Math.ceil(r * 2 + 4); moonCv.width = moonCv.height = S; const m = moonCv.getContext('2d')!; m.translate(S / 2, S / 2); m.rotate(ang);
  m.fillStyle = `rgba(40,44,56,${(0.55 * (1 - day)).toFixed(3)})`; m.beginPath(); m.arc(0, 0, r, 0, 6.2832); m.fill();
  m.fillStyle = day > 0.5 ? 'rgba(246,244,240,.9)' : '#efe9dc'; m.beginPath();
  m.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
  const ex = r * Math.abs(1 - 2 * frac); m.ellipse(0, 0, ex, r, 0, Math.PI / 2, -Math.PI / 2, frac < 0.5); m.fill();
  g.globalAlpha = v[2] < 0 ? 0.35 : 1;
  const h = g.createRadialGradient(cx, cy, r * .8, cx, cy, r * (3 + frac * 4)); h.addColorStop(0, `rgba(239,233,220,${((0.05 + frac * .16) * (1 - day * .7)).toFixed(3)})`); h.addColorStop(1, 'rgba(239,233,220,0)');
  g.fillStyle = h; g.fillRect(cx - r * 8, cy - r * 8, r * 16, r * 16); g.drawImage(moonCv, cx - S / 2, cy - S / 2); g.globalAlpha = 1;
}

// ---------- UI ----------
const ui = document.createElement('div'); ui.className = 'sk-ui';
ui.innerHTML = `<header class="sk-head"><p class="sk-date"></p><p class="sk-place"></p><p class="sk-moon"></p></header>
<footer class="sk-foot"><button type="button" class="sk-film" data-i18n="sky.film">Our film</button><button type="button" class="sk-next"><span data-i18n="sky.next"></span><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M10 7l5 5-5 5"/></svg></button><div class="sk-seg" role="group"><button type="button" data-k="0"></button><button type="button" data-k="1"></button><button type="button" data-k="2"></button></div>
<dl class="sk-rec"><dt data-i18n="sky.again" class="sk-rec-h"></dt><div><dt data-i18n="sky.r.stars"></dt><dd data-r="stars"></dd></div><div><dt data-i18n="sky.r.moon"></dt><dd data-r="moon"></dd></div><div><dt data-i18n="sky.r.planets"></dt><dd data-r="planets"></dd></div></dl></footer>
<div class="sk-tools"><button type="button" class="sk-sun" data-i18n-aria="sky.hideDay" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><circle cx="12" cy="12" r="3.6"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6"/><path class="sk-slash" d="M4 20L20 4"/></svg></button>
<button type="button" class="sk-gyro" data-i18n-aria="sky.gyro" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="8.5"/><path d="M12 5.5l2.2 6.5L12 18.5 9.8 12z"/></svg></button></div>`;
document.body.appendChild(ui);
const $ = <T extends HTMLElement>(s: string) => ui.querySelector<T>(s)!;
const fmtDate = (d: string) => d.replace(/-/g, '.');
const todayLocal = () => wall(nowT(), PLACE.tz).date;
const phaseName = (deg: number) => t(`sky.ph.${Math.round(((deg % 360) + 360) % 360 / 45) % 8}`);
const nfmt = (n: number) => n.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en');
function rel(date: string) { const n = dayDiff(todayLocal(), date); return n === 0 ? t('sky.today') : n > 0 ? t('sky.in', { n: nfmt(n) }) : t('sky.ago', { n: nfmt(-n) }); }
function render() {
  const i = cur, m = M_of(i), s = m.s, pl = i === 2 ? placeN : PLACE;
  if (i === 0) { const w = wall(nowT(), PLACE.tz), dn = dayDiff(SKY.start, w.date) + 1; $('.sk-date').textContent = `${fmtDate(w.date)}  ${w.time}:${String(w.sec).padStart(2, '0')}`; $('.sk-date').dataset.day = SKY.startIsReal && dn >= 1 ? t('sky.day', { n: dn }) : ''; }
  else { $('.sk-date').textContent = `${fmtDate(s.date)}  ${s.time}`; $('.sk-date').dataset.day = ''; }
  $('.sk-place').textContent = `${lang === 'zh' ? pl.zh : pl.en}  ${Math.abs(pl.lat).toFixed(2)}°${pl.lat >= 0 ? 'N' : 'S'} ${Math.abs(pl.lon).toFixed(2)}°${pl.lon >= 0 ? 'E' : 'W'}`;
  $('.sk-moon').textContent = `${t('sky.moon')} · ${phaseName(s.moonPhase)} ${Math.round(s.moonFrac * 100)}%${altDeg(s.moon) < 0 ? ' · ' + t('sky.below') : ''}`;
  ui.querySelectorAll<HTMLButtonElement>('.sk-seg button').forEach(b => { const j = +b.dataset.k!; b.textContent = j === 0 ? t('sky.now') : t('sky.day', { n: j === 2 ? SKY.dayN : 1 }); b.setAttribute('aria-pressed', String(j === i)); });
  const r = recs[i], set = (key: string, txt: string) => { const el = $(`[data-r="${key}"]`); if (el.textContent === txt) return; el.textContent = txt; el.classList.remove('roll'); void el.offsetWidth; el.classList.add('roll'); };
  if (!r) { ['stars', 'moon', 'planets'].forEach(x => set(x, t('sky.computing'))); return; }
  set('stars', r.stars ? `${fmtDate(r.stars.date)} · ${rel(r.stars.date)}` : t('sky.none', { y: r.years }));
  set('moon', r.moon ? `${fmtDate(r.moon.date)} · ${rel(r.moon.date)}` : t('sky.none', { y: r.years }));
  set('planets', r.planets ? `${fmtDate(r.planets.date)} · ${rel(r.planets.date)}` : `${t('sky.never', { y: r.years })}${r.best ? ' · ' + t('sky.closest', { d: fmtDate(r.best.date), e: Math.round(r.best.planets!) }) : ''}`);
}
ui.querySelector('.sk-seg')!.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button'); if (!b) return; const j = +b.dataset.k!; if (j === cur) return;
  from = shown; cur = j; kT = still || reduced ? 1 : 0; render(); ensureRec(j);
});
const sunBtn = $<HTMLButtonElement>('.sk-sun');
sunBtn.addEventListener('click', () => { hideDay = !hideDay; sunBtn.setAttribute('aria-pressed', String(hideDay)); });
onLang(() => { apply(); render(); });
apply(); render();

// ---------- "the same sky again": computed for the selected moment (cached per moment) ----------
const ck = (i: number) => `sky.recur.v2:${JSON.stringify([i, M_of(i).s.date, i === 0 ? '' : M_of(i).s.time, i === 2 ? placeN : PLACE, SKY.search])}`;
const pending = new Set<number>();
function ensureRec(i: number) {
  if (recs[i] || pending.has(i)) return;
  try { const c = JSON.parse(localStorage.getItem(ck(i)) || 'null'); if (c) { recs[i] = c; render(); return; } } catch { /* */ }
  pending.add(i);
  setTimeout(() => { recs[i] = recur(M_of(i).s, SKY.search); pending.delete(i); try { localStorage.setItem(ck(i), JSON.stringify(recs[i])); } catch { /* */ } render(); }, 80);
}
ensureRec(cur);
(window as unknown as { __sky: unknown }).__sky = { fixed, get live() { return live; }, recs };

// ---------- live clock: bodies every 2 s, labels every second, recurrence again when the minute changes ----------
let lastDate = live.s.date, lastSec = -1;
setInterval(() => {
  const w = wall(nowT(), PLACE.tz);
  if (performance.now() - liveAt > 2000 && !still) { live = moment(skyAt(nowT(), PLACE)); liveAt = performance.now(); }
  if (w.sec !== lastSec && cur === 0) { lastSec = w.sec; render(); }
  if (w.date !== lastDate && !still) { lastDate = w.date; live = moment(skyAt(nowT(), PLACE)); liveAt = performance.now(); recs[0] = null; ensureRec(0); } // a new local day
}, 250);

// ---------- look around: drag, pinch, wheel, optional gyro ----------
const pts = new Map<number, { x: number; y: number }>(); let pinch0 = 0, fov0 = 0;
const clampV = () => { view.alt = Math.max(-8, Math.min(89, view.alt)); view.fov = Math.max(30, Math.min(120, view.fov)); view.az = (view.az % 360 + 360) % 360; };
cv.addEventListener('pointerdown', e => { raise = null; cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); fov0 = view.fov; } gyro = false; gbtn.classList.remove('on'); });
cv.addEventListener('pointermove', e => {
  const p = pts.get(e.pointerId); if (!p) return;
  if (pts.size === 1) { const s = view.fov / Math.min(innerWidth, innerHeight); view.az -= (e.clientX - p.x) * s; view.alt += (e.clientY - p.y) * s; }
  p.x = e.clientX; p.y = e.clientY;
  if (pts.size === 2) { const [a, b] = [...pts.values()]; view.fov = fov0 * pinch0 / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)); }
  clampV();
});
const up = (e: PointerEvent) => pts.delete(e.pointerId); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => { view.fov *= Math.exp(e.deltaY * 0.001); clampV(); e.preventDefault(); }, { passive: false });
let gyro = false;
const gbtn = $<HTMLButtonElement>('.sk-gyro');
type DOE = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
if ('DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches) gbtn.hidden = false;
gbtn.addEventListener('click', async () => {
  const D = DeviceOrientationEvent as DOE;
  if (D.requestPermission) { try { if (await D.requestPermission() !== 'granted') return; } catch { return; } }
  gyro = !gyro; gbtn.classList.toggle('on', gyro);
});
window.addEventListener('deviceorientation', e => {
  if (!gyro || e.beta == null) return;
  const head = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading ?? (e.absolute && e.alpha != null ? 360 - e.alpha : null);
  if (head != null) view.az += (((head - view.az + 540) % 360) - 180) * 0.25;
  view.alt += ((e.beta - 90) - view.alt) * 0.25; clampV();
});

// ---------- loop ----------
resize();
let last = performance.now();
function loop(now: number) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (kT < 1) kT = Math.min(1, kT + dt / 1.8);
  leaveTick(dt);
  if (raise && raise.t < 0) { raise.t += dt; if (lastHy) raise.a0 = Math.max(-10, Math.min(60, raise.a0 + (seaHz - lastHy / H) * 90 * dt)); view.alt = raise.a0; if (raise.t >= 0) raise.t = 0; }
  else if (raise) { raise.t = Math.min(1, raise.t + dt / 3.6); const k = raise.t < .5 ? 4 * raise.t ** 3 : 1 - (-2 * raise.t + 2) ** 3 / 2; view.alt = raise.a0 + (raise.a1 - raise.a0) * k; if (raise.t >= 1) raise = null; }
  intro += dt; hideK = reduced ? (hideDay ? 1 : 0) : Math.max(0, Math.min(1, hideK + (hideDay ? dt : -dt) / 0.8));
  frame(now); leavePost();
}
requestAnimationFrame(loop);
if (!still && !reduced && cameFrom !== 'jelly') void irisIn(innerWidth / 2, innerHeight / 2, 900, '#04060b'); // from the egg: already black, the stars rise out of it
// onward -> the co-op finale: a slow fade through black, then the pixel iris opens there
const next = $<HTMLButtonElement>('.sk-next');
const film = $<HTMLButtonElement>('.sk-film');
film.addEventListener('click', () => openCinema());
setTimeout(() => { next.classList.add('on'); film.classList.add('on'); }, still ? 0 : cameFrom === 'jelly' ? 9000 : 4000);
next.addEventListener('click', () => {
  if (leave) return; raise = null; gyro = false;
  if (reduced) { void go('coop', undefined, { hz: '0.66' }); return; }
  leave = { t: 0, alt0: view.alt, fov0: view.fov, tgt: 13 }; document.body.classList.add('sk-leaving');
});
// one continuous motion (3.4 s): 0–1.6 s the view sinks to the horizon (cubic in-out) and widens a little; from 0.8 s the
// picture pixelates in steps (the meadow's resolution); from 1.7 s it settles, band by band, into the shared dawn frame;
// then /coop/ opens on that same frame (?hz = where the horizon sits) and lets the morning finish there.
const pix = document.createElement('canvas'), pg = pix.getContext('2d')!;
const dawnCv = document.createElement('canvas'), dg = dawnCv.getContext('2d')!;
function leaveTick(dt: number) {
  if (!leave) return;
  const T = 3.4; leave.t = Math.min(T, leave.t + dt); const t = leave.t;
  const ease = (x: number) => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
  const k1 = ease(t / 1.6);
  if (lastHy) leave.tgt = Math.max(0, Math.min(60, leave.tgt + (0.64 - lastHy / H) * 50 * dt)); // settle the horizon near 64 % height
  view.alt = leave.alt0 + (leave.tgt - leave.alt0) * k1; view.fov = leave.fov0 + (Math.max(leave.fov0, 84) - leave.fov0) * k1;
  if (t >= T) { const hz = Math.max(0.45, Math.min(0.85, lastHy / H)); leave = null; void go('coop', undefined, { hz: hz.toFixed(3) }); }
}
function leavePost() {
  if (!leave) return;
  const t = leave.t; if (t < 0.8) return;
  // pixelate: block size grows in whole steps up to the dawn frame's resolution
  const finalBlk = H / DAWN_LINES, pk = Math.min(1, (t - 0.8) / 1.0), blk = Math.max(1, Math.round(1 + (finalBlk - 1) * pk * pk));
  const lw = Math.max(1, Math.round(W / blk)), lh = Math.max(1, Math.round(H / blk));
  if (pix.width !== lw || pix.height !== lh) { pix.width = lw; pix.height = lh; }
  pg.imageSmoothingEnabled = true; pg.drawImage(cv, 0, 0, lw, lh);
  // the dawn frame, at the same low resolution, rises over it with an ordered dither
  const dk = Math.max(0, Math.min(1, (t - 1.7) / 1.4));
  if (dk > 0) {
    const dw = Math.round(W / finalBlk), dh = DAWN_LINES; if (dawnCv.width !== dw || dawnCv.height !== dh) { dawnCv.width = dw; dawnCv.height = dh; }
    drawDawn(dg, dw, dh, Math.max(0.45, Math.min(0.85, lastHy / H)), 0.35 * dk, t);
    pg.save(); pg.globalAlpha = dk < 1 ? Math.round(dk * 6) / 6 : 1; pg.imageSmoothingEnabled = false; pg.drawImage(dawnCv, 0, 0, lw, lh); pg.restore();
  }
  g.imageSmoothingEnabled = false; g.drawImage(pix, 0, 0, W, H);
}
