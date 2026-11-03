// /sky/ · the real sky over the city at the clock time of day 1 and of day N (config.ts). Stars: HYG-derived bright-star
// catalogue (J2000, mag ≤ 6) rotated to the local horizon with astronomy-engine (precession + nutation + refraction);
// Moon / planets from the same ephemeris (topocentric). Stereographic projection, drag / pinch / optional gyro.
// Below: "the same sky again" — computed in-page by astro.recur(), never hard-coded.
import * as A from 'astronomy-engine';
import { register, t, onLang, apply, lang } from '../../shared/i18n';
import { mountChrome } from '../../shared/chrome';
import { irisIn } from '../../shared/transition';
import { params } from '../../shared/flow';
import { SKY } from './config';
import { sky, recur, addDays, dayDiff, altDeg, azDeg, PLANETS, type Sky, type Recur, type V3, type M3 } from './astro';
import STARS from './data/stars.json';
import LINES from './data/lines.json';
import * as dict from './dict';
import './style.css';

register(dict); mountChrome({ sound: false, theme: 'dark' });
const host = document.getElementById('sky')!;
const cv = document.createElement('canvas'); host.appendChild(cv);
const g = cv.getContext('2d')!;
const still = params.has('still');

// ---------- the two nights ----------
const placeN = SKY.placeN ?? SKY.place;
const dates = [SKY.start, addDays(SKY.start, SKY.dayN - 1)];
const skies: Sky[] = [sky(dates[0], SKY.time, SKY.place), sky(dates[1], SKY.time, placeN)];
const mags = skies.map(s => Object.fromEntries(PLANETS.map(p => [p, A.Illumination(p as A.Body, s.t).mag]))) as Record<string, number>[];
const recs: (Recur | null)[] = [null, null];

// ---------- catalogue -> unit vectors (J2000) ----------
const N = STARS.length / 4, SV = new Float32Array(N * 3), SM = new Float32Array(N), SC: string[] = [], PH = new Float32Array(N);
const D2R = Math.PI / 180;
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
/** B–V colour index -> a restrained star tint (Ballesteros temperature, then a soft blackbody-ish ramp) */
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
const std = (m: M3): number[][] => [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]]; // astronomy-engine -> row-major M (v' = M v)
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
const QS = skies.map(s => quat(std(s.m)));

// ---------- view ----------
const view = { az: 180, alt: 32, fov: 78 };            // fov = across the shorter screen side
{ // open looking at the brightest thing that is up on day N (moon, else the brightest planet, else due south)
  const s = skies[1], up: [number, V3][] = [];
  if (altDeg(s.moon) > 5) up.push([-12, s.moon]);
  for (const p of PLANETS) if (altDeg(s.planets[p]) > 8) up.push([mags[1][p], s.planets[p]]);
  up.sort((a, b) => a[0] - b[0]);
  if (up[0]) { view.az = azDeg(up[0][1]); view.alt = Math.min(48, Math.max(14, altDeg(up[0][1]) - 6)); }
}
let W = 0, H = 0, dpr = 1;
function resize() { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.width = Math.round(innerWidth * dpr); H = cv.height = Math.round(innerHeight * dpr); cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; dirty = true; }
let dirty = true; window.addEventListener('resize', resize);

const CY = 0.42; // projection centre a little above the middle: the horizon sits above the footer
let F: V3 = [1, 0, 0], R: V3 = [0, -1, 0], U: V3 = [0, 0, 1], K = 1;
function camera() {
  const az = view.az * D2R, al = view.alt * D2R;
  F = [Math.cos(al) * Math.cos(az), -Math.cos(al) * Math.sin(az), Math.sin(al)];
  R = [-Math.sin(az), -Math.cos(az), 0];
  U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
  K = (Math.min(W, H) / 2) / Math.tan(view.fov * D2R / 4);
}
const P = { x: 0, y: 0 };
/** stereographic projection of a horizontal unit vector; false when behind */
function proj(x: number, y: number, z: number): boolean {
  const f = x * F[0] + y * F[1] + z * F[2]; if (f < -0.6) return false;
  const d = 1 + f; P.x = W / 2 + K * (x * R[0] + y * R[1] + z * R[2]) / d; P.y = H * CY - K * (x * U[0] + y * U[1] + z * U[2]) / d; return true;
}

// ---------- state: which night (k: 0 = day 1, 1 = day N), tweened ----------
let k = params.get('day') === '1' ? 0 : 1, kTo = k, kFrom = k, kT = 1;
function current() {
  const e = kT >= 1 ? kTo : kFrom + (kTo - kFrom) * (kT < .5 ? 4 * kT ** 3 : 1 - (-2 * kT + 2) ** 3 / 2);
  k = e; const a = skies[0], b = skies[1];
  return {
    M: mat(slerpQ(QS[0], QS[1], e)), moon: slerpV(a.moon, b.moon, e), sun: slerpV(a.sun, b.sun, e), frac: a.moonFrac + (b.moonFrac - a.moonFrac) * e,
    planets: Object.fromEntries(PLANETS.map(p => [p, slerpV(a.planets[p], b.planets[p], e)])) as Record<string, V3>,
    pm: Object.fromEntries(PLANETS.map(p => [p, mags[0][p] + (mags[1][p] - mags[0][p]) * e])) as Record<string, number>,
  };
}

// ---------- drawing ----------
const PCOL: Record<string, string> = { Mercury: '214,206,196', Venus: '255,248,226', Mars: '255,178,140', Jupiter: '255,236,206', Saturn: '240,222,170' };
const moonCv = document.createElement('canvas');
function frame(now: number) {
  camera(); const s = current(), M = s.M, tw = still ? 0 : now / 1000;
  // sky: dark gradient, a faint warm city-glow band at the horizon
  proj(F[0] / Math.hypot(F[0], F[1]) || 1, F[1] / Math.hypot(F[0], F[1]) || 0, 0); const hy = P.y;
  const gr = g.createLinearGradient(0, hy - H * 1.1, 0, hy);
  gr.addColorStop(0, '#03050a'); gr.addColorStop(0.62, '#070b15'); gr.addColorStop(0.9, '#0f1524'); gr.addColorStop(1, '#1a1c26');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // constellation lines
  g.lineWidth = 0.8 * dpr; g.strokeStyle = 'rgba(160,178,214,0.10)'; g.beginPath();
  for (const seg of LV) {
    let pen = false;
    for (let i = 0; i < seg.length; i += 3) {
      const x = M[0][0] * seg[i] + M[0][1] * seg[i + 1] + M[0][2] * seg[i + 2], y = M[1][0] * seg[i] + M[1][1] * seg[i + 1] + M[1][2] * seg[i + 2], z = M[2][0] * seg[i] + M[2][1] * seg[i + 1] + M[2][2] * seg[i + 2];
      if (z < 0 || !proj(x, y, z)) { pen = false; continue; }
      if (pen) g.lineTo(P.x, P.y); else g.moveTo(P.x, P.y); pen = true;
    }
  }
  g.stroke();
  // stars (atmospheric extinction ~0.28 mag/airmass, scintillation grows near the horizon)
  const zoom = 78 / view.fov;
  for (let i = 0; i < N; i++) {
    const vx = SV[i * 3], vy = SV[i * 3 + 1], vz = SV[i * 3 + 2];
    const z = M[2][0] * vx + M[2][1] * vy + M[2][2] * vz; if (z < -0.01) continue;
    const x = M[0][0] * vx + M[0][1] * vy + M[0][2] * vz, y = M[1][0] * vx + M[1][1] * vy + M[1][2] * vz;
    if (!proj(x, y, z)) continue; if (P.x < -4 || P.y < -4 || P.x > W + 4 || P.y > H + 4) continue;
    const alt = Math.max(0.5, Math.asin(z) / D2R), air = 1 / (Math.sin((alt + 244 / (165 + 47 * alt ** 1.1)) * D2R));
    const m = SM[i] + 0.28 * (air - 1); if (m > 6.2) continue;
    const scint = still ? 1 : 1 + Math.min(0.5, 0.06 * air) * Math.sin(tw * (2.1 + (i % 7) * .37) + PH[i]) * Math.sin(tw * 0.73 + PH[i] * 1.7);
    const fl = Math.pow(10, -0.4 * m) * scint, r = Math.max(0.7, Math.min(4.6, 2.3 * Math.pow(fl, 0.3))) * dpr * Math.sqrt(zoom);
    const a = Math.min(1, 0.5 + Math.pow(fl, 0.4) * 1.6) * Math.min(1, (6.3 - m) / 1.4);
    g.fillStyle = `rgba(${SC[i]},${a.toFixed(3)})`;
    if (m < 2) { const hr = r * (m < 0.5 ? 5 : 3.6), h = g.createRadialGradient(P.x, P.y, 0, P.x, P.y, hr); h.addColorStop(0, `rgba(${SC[i]},${(a * .22).toFixed(3)})`); h.addColorStop(1, `rgba(${SC[i]},0)`); g.fillStyle = h; g.fillRect(P.x - hr, P.y - hr, hr * 2, hr * 2); g.fillStyle = `rgba(${SC[i]},${a.toFixed(3)})`; }
    g.beginPath(); g.arc(P.x, P.y, r, 0, 6.2832); g.fill();
  }
  // planets: a steady (non-twinkling) point + a hairline label
  g.font = `${10.5 * dpr}px ${getComputedStyle(document.body).getPropertyValue('--serif')}`; g.textAlign = 'center'; g.textBaseline = 'top';
  for (const p of PLANETS) {
    const v = s.planets[p]; if (v[2] < -0.01 || !proj(v[0], v[1], v[2])) continue;
    const fl = Math.pow(10, -0.4 * s.pm[p]), r = Math.max(1.1, Math.min(4.6, 1.3 * Math.pow(fl, 0.3) * 1.6)) * dpr;
    const h = g.createRadialGradient(P.x, P.y, 0, P.x, P.y, r * 5); h.addColorStop(0, `rgba(${PCOL[p]},.25)`); h.addColorStop(1, `rgba(${PCOL[p]},0)`); g.fillStyle = h; g.fillRect(P.x - r * 5, P.y - r * 5, r * 10, r * 10);
    g.fillStyle = `rgb(${PCOL[p]})`; g.beginPath(); g.arc(P.x, P.y, r, 0, 6.2832); g.fill();
    g.fillStyle = 'rgba(226,222,212,.5)'; g.fillText(t(`sky.p.${p}`), P.x, P.y + r + 6 * dpr);
  }
  // the moon (drawn ~4x its true 0.52°, phase + bright-limb angle are exact)
  drawMoon(s.moon, s.sun, s.frac);
  // ground: everything below the true horizon, slightly see-through so a set moon / planet still reads
  g.beginPath(); let first = true, lx = 0, fx = 0;
  for (let d = -178; d <= 178; d += 2) {
    const a = (view.az + d) * D2R; if (!proj(Math.cos(a), -Math.sin(a), 0)) continue;
    if (first) { g.moveTo(P.x, P.y); fx = P.x; first = false; } else g.lineTo(P.x, P.y); lx = P.x;
  }
  if (!first) { g.lineTo(lx, H * 6); g.lineTo(fx, H * 6); g.closePath(); }
  const gg = g.createLinearGradient(0, hy, 0, hy + H * .25); gg.addColorStop(0, 'rgba(6,7,10,.86)'); gg.addColorStop(1, 'rgba(3,4,6,.96)');
  g.fillStyle = gg; g.fill();
  g.strokeStyle = 'rgba(200,196,186,.16)'; g.lineWidth = dpr; g.beginPath(); first = true;
  for (let d = -178; d <= 178; d += 2) { const a = (view.az + d) * D2R; if (!proj(Math.cos(a), -Math.sin(a), 0)) { first = true; continue; } if (first) g.moveTo(P.x, P.y); else g.lineTo(P.x, P.y); first = false; }
  g.stroke();
  // cardinal points
  g.font = `${11 * dpr}px ${getComputedStyle(document.body).getPropertyValue('--serif')}`; g.fillStyle = 'rgba(226,222,212,.55)'; g.textBaseline = 'top';
  (['N', 'E', 'S', 'W'] as const).forEach((c, i) => { const a = i * 90 * D2R; if (proj(Math.cos(a), -Math.sin(a), 0) && P.x > 0 && P.x < W) { g.fillRect(P.x - 0.5 * dpr, P.y - 4 * dpr, dpr, 8 * dpr); g.fillText(t(`sky.${c}`), P.x, P.y + 9 * dpr); } });
}
function drawMoon(v: V3, sun: V3, frac: number) {
  if (!proj(v[0], v[1], v[2])) return; const cx = P.x, cy = P.y;
  // bright-limb direction on screen: step from the moon a little along the great circle towards the sun
  const d = v[0] * sun[0] + v[1] * sun[1] + v[2] * sun[2], tx = sun[0] - d * v[0], ty = sun[1] - d * v[1], tz = sun[2] - d * v[2], tl = Math.hypot(tx, ty, tz) || 1, e = 0.01;
  if (!proj(v[0] + tx / tl * e, v[1] + ty / tl * e, v[2] + tz / tl * e)) return; const ang = Math.atan2(P.y - cy, P.x - cx);
  const r = Math.max(7 * dpr, K * Math.tan(0.26 * D2R * 4 / 2) * 2 / 2);
  const S = Math.ceil(r * 2 + 4); moonCv.width = moonCv.height = S; const m = moonCv.getContext('2d')!; m.translate(S / 2, S / 2); m.rotate(ang);
  m.fillStyle = 'rgba(40,44,56,.55)'; m.beginPath(); m.arc(0, 0, r, 0, 6.2832); m.fill();            // earthshine-dark disc
  m.fillStyle = '#efe9dc'; m.beginPath();
  m.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);                                                   // lit half faces +x (the sun)
  const ex = r * Math.abs(1 - 2 * frac); m.ellipse(0, 0, ex, r, 0, Math.PI / 2, -Math.PI / 2, frac < 0.5); m.fill();
  const below = v[2] < 0; g.globalAlpha = below ? 0.35 : 1;
  const h = g.createRadialGradient(cx, cy, r * .8, cx, cy, r * (3 + frac * 4)); h.addColorStop(0, `rgba(239,233,220,${(0.05 + frac * .16).toFixed(3)})`); h.addColorStop(1, 'rgba(239,233,220,0)');
  g.fillStyle = h; g.fillRect(cx - r * 8, cy - r * 8, r * 16, r * 16); g.drawImage(moonCv, cx - S / 2, cy - S / 2); g.globalAlpha = 1;
}

// ---------- UI (dates, place, moon, the "same sky again" lines) ----------
const ui = document.createElement('div'); ui.className = 'sk-ui';
ui.innerHTML = `<header class="sk-head"><p class="sk-date"></p><p class="sk-place"></p><p class="sk-moon"></p></header>
<footer class="sk-foot"><div class="sk-seg" role="group"><button type="button" data-k="0"></button><button type="button" data-k="1"></button></div>
<dl class="sk-rec"><dt data-i18n="sky.again" class="sk-rec-h"></dt><div><dt data-i18n="sky.r.stars"></dt><dd data-r="stars"></dd></div><div><dt data-i18n="sky.r.moon"></dt><dd data-r="moon"></dd></div><div><dt data-i18n="sky.r.planets"></dt><dd data-r="planets"></dd></div></dl></footer>
<button type="button" class="sk-gyro" data-i18n-aria="sky.gyro" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="8.5"/><path d="M12 5.5l2.2 6.5L12 18.5 9.8 12z"/></svg></button>`;
document.body.appendChild(ui);
const $ = <T extends HTMLElement>(s: string) => ui.querySelector<T>(s)!;
const fmtDate = (d: string) => d.replace(/-/g, '.');
const todayLocal = () => new Intl.DateTimeFormat('en-CA', { timeZone: SKY.place.tz }).format(new Date());
function phaseName(deg: number) { return t(`sky.ph.${Math.round(((deg % 360) + 360) % 360 / 45) % 8}`); }
function rel(date: string) { const n = dayDiff(todayLocal(), date); return n === 0 ? t('sky.today') : n > 0 ? t('sky.in', { n: n.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en') }) : t('sky.ago', { n: (-n).toLocaleString() }); }
function render() {
  const i = kTo, s = skies[i], pl = i ? placeN : SKY.place;
  $('.sk-date').textContent = `${fmtDate(s.date)}  ${s.time}`;
  $('.sk-place').textContent = `${lang === 'zh' ? pl.zh : pl.en}  ${Math.abs(pl.lat).toFixed(2)}°${pl.lat >= 0 ? 'N' : 'S'} ${Math.abs(pl.lon).toFixed(2)}°${pl.lon >= 0 ? 'E' : 'W'}`;
  $('.sk-moon').textContent = `${t('sky.moon')} · ${phaseName(s.moonPhase)} ${Math.round(s.moonFrac * 100)}%${altDeg(s.moon) < 0 ? ' · ' + t('sky.below') : ''}`;
  ui.querySelectorAll<HTMLButtonElement>('.sk-seg button').forEach(b => { const j = +b.dataset.k!; b.textContent = t('sky.day', { n: j ? SKY.dayN : 1 }); b.setAttribute('aria-pressed', String(j === i)); });
  const r = recs[i], set = (key: string, txt: string) => { $(`[data-r="${key}"]`).textContent = txt; };
  if (!r) { ['stars', 'moon', 'planets'].forEach(x => set(x, t('sky.computing'))); return; }
  set('stars', r.stars ? `${fmtDate(r.stars.date)} · ${rel(r.stars.date)}` : t('sky.none', { y: r.years }));
  set('moon', r.moon ? `${fmtDate(r.moon.date)} · ${rel(r.moon.date)}` : t('sky.none', { y: r.years }));
  set('planets', r.planets ? `${fmtDate(r.planets.date)} · ${rel(r.planets.date)}` : `${t('sky.never', { y: r.years })}${r.best ? ' · ' + t('sky.closest', { d: fmtDate(r.best.date), e: Math.round(r.best.planets!) }) : ''}`);
}
ui.querySelector('.sk-seg')!.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button'); if (!b) return; const j = +b.dataset.k!; if (j === kTo) return;
  kFrom = k; kTo = j; kT = still ? 1 : 0; render();
});
onLang(() => { apply(); render(); dirty = true; });
apply(); render();
// the recurrence search (~2.7k days × full rotation + ephemeris checks): run after first paint, one night at a time, cached
const CK = `sky.recur.v1:${JSON.stringify([SKY.start, SKY.dayN, SKY.time, SKY.place, SKY.placeN, SKY.search])}`;
try { const c = JSON.parse(localStorage.getItem(CK) || 'null'); if (c) { recs[0] = c[0]; recs[1] = c[1]; render(); } } catch { /* */ }
if (!recs[0]) setTimeout(() => {
  recs[1] = recur(skies[1], SKY.search); render();
  setTimeout(() => { recs[0] = recur(skies[0], SKY.search); render(); try { localStorage.setItem(CK, JSON.stringify(recs)); } catch { /* */ } }, 30);
}, 60);
(window as unknown as { __sky: unknown }).__sky = { skies, recs };

// ---------- look around: drag, pinch, wheel, optional gyro ----------
const pts = new Map<number, { x: number; y: number }>(); let pinch0 = 0, fov0 = 0;
const clampV = () => { view.alt = Math.max(-8, Math.min(89, view.alt)); view.fov = Math.max(30, Math.min(120, view.fov)); view.az = (view.az % 360 + 360) % 360; dirty = true; };
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); fov0 = view.fov; } gyro = false; });
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
  if (kT < 1) { kT = Math.min(1, kT + dt / 1.8); dirty = true; }
  if (!dirty && still) return;
  frame(now); dirty = false;
}
requestAnimationFrame(loop);
void irisIn(innerWidth / 2, innerHeight / 2, 900, '#04060b');
