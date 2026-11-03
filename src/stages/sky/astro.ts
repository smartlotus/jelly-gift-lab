// Real-sky maths for /sky/ (pure functions; no DOM). astronomy-engine (MIT, bundled) does the ephemerides:
// Rotation_EQJ_HOR includes precession + nutation + Earth rotation for the observer; Equator(..., ofdate=false,
// aberration=true) gives topocentric J2000 vectors for the Moon / Sun / planets (light-time corrected).
import * as A from 'astronomy-engine';
import type { Place } from './config';

export type V3 = [number, number, number];
export type M3 = number[][]; // row-major 3x3, J2000 equatorial (EQJ) -> horizontal (x north, y west, z up)
export const PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const;
export type PlanetName = typeof PLANETS[number];
const D2R = Math.PI / 180;

/** wall-clock 'YYYY-MM-DD' + 'HH:MM' in an IANA zone -> UTC Date (iterative offset solve, handles DST) */
export function zoned(date: string, time: string, tz: string): Date {
  const [y, mo, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number);
  const want = Date.UTC(y, mo - 1, d, h, mi);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  let t = want;
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map(x => [x.type, x.value]));
    const seen = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
    t += want - seen;
  }
  return new Date(t);
}
/** calendar arithmetic on 'YYYY-MM-DD' */
export const addDays = (date: string, n: number) => { const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
export const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

const obs = (p: Place) => new A.Observer(p.lat, p.lon, p.height);
export function eqjToHor(t: Date, p: Place): M3 { return A.Rotation_EQJ_HOR(t, obs(p)).rot; }
/** astronomy-engine rot[i][j] maps as v'[j] = sum_i rot[i][j] v[i]  (see RotateVector) */
export function rot(m: M3, v: V3): V3 { return [m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2], m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2], m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2]]; }
export function radec(raDeg: number, decDeg: number): V3 { const a = raDeg * D2R, d = decDeg * D2R, c = Math.cos(d); return [c * Math.cos(a), c * Math.sin(a), Math.sin(d)]; }
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
export const sepDeg = (a: V3, b: V3) => Math.atan2(Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]), a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / D2R;
/** angle (deg) of the rotation taking one star field (as seen) to the other: the "how different do the stars look" error */
export function fieldErrDeg(m0: M3, m1: M3): number {
  // R = M1^T-ish composite; trace(M0 * M1^T) works for either convention since both are orthonormal
  let tr = 0; for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) tr += m0[i][k] * m1[i][k];
  return Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2))) / D2R;
}
/** horizontal unit vector (x north, y west, z up) with standard refraction applied to the altitude */
export function bodyHor(body: string, t: Date, p: Place, m: M3): V3 {
  const e = A.Equator(body as A.Body, t, obs(p), false, true);
  return refract(rot(m, norm([e.vec.x, e.vec.y, e.vec.z])));
}
export function refract(v: V3): V3 {
  const alt = Math.asin(Math.max(-1, Math.min(1, v[2]))) / D2R; if (alt < -1) return v;
  const a2 = (alt + A.Refraction('normal', alt)) * D2R, h = Math.hypot(v[0], v[1]) || 1, c = Math.cos(a2);
  return [v[0] / h * c, v[1] / h * c, Math.sin(a2)];
}
export const altDeg = (v: V3) => Math.asin(Math.max(-1, Math.min(1, v[2]))) / D2R;
/** azimuth, degrees from north through east */
export const azDeg = (v: V3) => ((Math.atan2(-v[1], v[0]) / D2R) + 360) % 360;

export interface Sky {
  date: string; time: string; place: Place; t: Date; m: M3;
  moon: V3; sun: V3; moonFrac: number; moonPhase: number; /* 0..360 elongation-ish: 0 new, 180 full */ moonAge: number;
  planets: Record<PlanetName, V3>;
}
export function sky(date: string, time: string, place: Place): Sky {
  const t = zoned(date, time, place.tz), m = eqjToHor(t, place);
  const il = A.Illumination(A.Body.Moon, t), ph = A.MoonPhase(t);
  const planets = {} as Record<PlanetName, V3>;
  for (const n of PLANETS) planets[n] = bodyHor(n, t, place, m);
  // days since the last new moon (synodic age)
  const nm = A.SearchMoonPhase(0, t, -31); const age = nm ? (t.getTime() - nm.date.getTime()) / 864e5 : 0;
  return { date, time, place, t, m, moon: bodyHor('Moon', t, place, m), sun: bodyHor('Sun', t, place, m), moonFrac: il.phase_fraction, moonPhase: ph, moonAge: age, planets };
}

// ---------- "when will this exact sky come back?" ----------
export interface Match { date: string; days: number; star: number; moon?: number; frac?: number; planets?: number }
export interface Recur { stars: Match | null; moon: Match | null; planets: Match | null; best: Match | null; years: number; checked: number }
/** Search forward day by day from `s` (same place, same clock time) for the next date where:
 *   stars:  the whole star field is rotated by < starDeg (precession included — this is the true "looks the same" error)
 *   moon:   + Moon's apparent position within moonDeg AND illuminated fraction within moonFrac
 *   planets:+ all five naked-eye planets: we report the date (within the horizon) that minimises the worst planet error,
 *            among dates that already satisfy stars + moon (honest best match, whatever its error).
 *  Only days within ±4 of the calendar anniversary can match the stars at a fixed clock time, so per year we test ~9
 *  days with a cheap sidereal-time filter, then the full rotation matrix. */
export function recur(s: Sky, o: { years: number; starDeg: number; moonDeg: number; moonFrac: number }, onProgress?: (k: number) => void): Recur {
  const r: Recur = { stars: null, moon: null, planets: null, best: null, years: o.years, checked: 0 };
  const y0 = +s.date.slice(0, 4), md = s.date.slice(4);
  for (let y = 1; y <= o.years; y++) {
    onProgress?.(y / o.years);
    let anchor = `${y0 + y}${md}`; if (isNaN(Date.parse(anchor))) anchor = addDays(`${y0 + y}-03-01`, -1); // 29 Feb -> 28 Feb
    for (let k = -4; k <= 4; k++) {
      const date = addDays(anchor, k), t = zoned(date, s.time, s.place.tz);
      const m = eqjToHor(t, s.place), star = fieldErrDeg(s.m, m); r.checked++;
      if (star > o.starDeg) continue;
      const days = dayDiff(s.date, date);
      if (!r.stars) r.stars = { date, days, star };
      const moon = sepDeg(s.moon, bodyHor('Moon', t, s.place, m)), frac = Math.abs(A.Illumination(A.Body.Moon, t).phase_fraction - s.moonFrac);
      if (moon > o.moonDeg || frac > o.moonFrac) continue;
      let worst = 0; for (const n of PLANETS) worst = Math.max(worst, sepDeg(s.planets[n], bodyHor(n, t, s.place, m)));
      const mt: Match = { date, days, star, moon, frac, planets: worst };
      if (!r.moon) r.moon = mt;
      if (!r.best || worst < r.best.planets!) r.best = mt;
    }
  }
  // "planets too": only claim a recurrence if every planet is back within the moon tolerance
  if (r.best && r.best.planets! <= o.moonDeg) r.planets = r.best;
  return r;
}
