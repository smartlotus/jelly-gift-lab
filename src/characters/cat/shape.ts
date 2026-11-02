import type { CharacterShape } from '../../core/character';
import { clamp, smin, smax, smoothstep, opExtrude, sdEllipsoid, sdTri2, sdCapsule, frameUp, toLocal, type V3, type Frame3 } from '../../core/sdf';

// The cat from the doodle (and the v5 chibi figure): round head, tall ear blades, sleepy closed eyes, ω mouth,
// whiskers, an upright tail with a ring band. Figure units (B): y up, +z = the face, x lateral; scaled to rest space.
export const S = 0.0106;
export const YOFF = 3.4;
export const INSET = 1.5;

export const HEAD = { c: [0, 29.0, 0.4] as V3, r: [12.8, 10.6, 10.8] as V3 };
const BODY1 = { c: [0, 12.6, -0.6] as V3, r: [10.2, 11.0, 9.6] as V3 };
const BODY2 = { c: [0, 8.2, 0.8] as V3, r: [9.8, 7.2, 8.6] as V3 };
const PAW = { c: [5.2, 15.6, 8.0] as V3, r: [2.8, 2.5, 2.8] as V3 };
const FOOT = { c: [4.5, 4.7, 6.8] as V3, r: [3.0, 2.3, 3.4] as V3 };
export const FACE = { eyeX: 6.3, eyeY: 29.9, eyeHW: 2.4, eyeArch: 1.0, eyeW: 0.42, mouthY: 26.3, mouthR: 0.95, noseY: 27.4,
  whiskX0: 8.8, whiskX1: 12.0, whiskY: 26.9, whiskGap: 0.95, whiskW: 0.2, cheekX: 6.7, cheekY: 25.6, cheekRX: 3.2, cheekRY: 2.1 };

// tall ear blades
const earFrame = (side: number): Frame3 => {
  const lean = 0.10, roll = 0.27 * side;
  const up: V3 = [Math.sin(roll), Math.cos(roll) * Math.cos(lean), -Math.cos(roll) * Math.sin(lean)];
  const x = 7.0 * side; const hx = x / HEAD.r[0];
  const yb = HEAD.c[1] + HEAD.r[1] * Math.sqrt(1 - hx * hx) - 1.8;
  return frameUp([x, yb, -0.4], up, [0, 0.1, 1]);
};
export const EARS = [earFrame(1), earFrame(-1)];
const EAR_TRI = { hw: 5.0, b: -3.0, apex: 9.4, round: 1.3, t: 1.45 };
const tmp = new Float64Array(3);
function sdEar(f: Frame3, x: number, y: number, z: number, info?: { inner: number }) {
  toLocal(f, x, y, z, tmp);
  const u = tmp[0], v = tmp[1], w = tmp[2];
  const d2 = sdTri2(u, v, -EAR_TRI.hw, EAR_TRI.b, EAR_TRI.hw, EAR_TRI.b, 0, EAR_TRI.apex) - EAR_TRI.round;
  const t = EAR_TRI.t - 0.06 * clamp(v, 0, 10);
  const rr = Math.min(EAR_TRI.round, t * 0.9);
  if (info) info.inner = smoothstep(-0.6, -1.6, d2) * smoothstep(0.4, 2.0, v) * smoothstep(-0.3, 0.6, w);
  return opExtrude(d2 + rr, Math.abs(w) - t + rr) - rr;
}
export const earTip = (side: number): V3 => { const f = EARS[side > 0 ? 0 : 1]; const a = EAR_TRI.apex + 0.5; return [f.o[0] + f.v[0] * a, f.o[1] + f.v[1] * a, f.o[2] + f.v[2] * a]; };

// tail: Catmull-Rom through a few keys, rising up the cat's left side (screen right)
const KEYS: V3[] = [[1.5, 7.0, -7.4], [5.2, 6.0, -10.2], [9.6, 8.4, -10.4], [12.0, 13.6, -9.4], [12.6, 20.0, -8.6], [11.9, 25.6, -8.2], [10.6, 29.2, -8.4]];
const TAIL: V3[] = [];
for (let i = 0; i < KEYS.length - 1; i++) for (let k = 0; k < 6; k++) {
  const t = k / 6; const p0 = KEYS[Math.max(0, i - 1)], p1 = KEYS[i], p2 = KEYS[i + 1], p3 = KEYS[Math.min(KEYS.length - 1, i + 2)];
  const c = (j: number) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t * t * t);
  TAIL.push([c(0), c(1), c(2)]);
}
TAIL.push(KEYS[KEYS.length - 1]);
export const TAIL_TIP = TAIL[TAIL.length - 1];
const TAIL_R = (s: number) => 1.65 - 0.35 * s;
export const BAND = { s0: 0.70, s1: 0.78 };
/** distance to the tail; info.s = arclength fraction of the closest point */
function sdTail(x: number, y: number, z: number, info?: { s: number }) {
  if (z > -4.5 || x < -3) return Math.max(z + 4.5, -3 - x, 0.5) + 1;
  let d = 1e9, bs = 0; const n = TAIL.length - 1;
  for (let i = 0; i < n; i++) {
    const di = sdCapsule(x, y, z, TAIL[i], TAIL[i + 1], TAIL_R(i / n));
    if (di < d) { d = di; bs = i / n; }
  }
  if (info) info.s = bs;
  return d;
}
export const TAIL_PTS = TAIL;

const el = (x: number, y: number, z: number, e: { c: V3; r: V3 }) => sdEllipsoid(x - e.c[0], y - e.c[1], z - e.c[2], e.r[0], e.r[1], e.r[2]);
function coreB(x: number, y: number, z: number) {
  const ax = Math.abs(x);
  let d = smin(el(x, y, z, BODY1), el(x, y, z, BODY2), 3.0);
  d = smin(d, el(x, y, z, HEAD), 4.0);
  d = smin(d, sdEllipsoid(ax - PAW.c[0], y - PAW.c[1], z - PAW.c[2], PAW.r[0], PAW.r[1], PAW.r[2]), 1.3);
  d = smin(d, sdEllipsoid(ax - FOOT.c[0], y - FOOT.c[1], z - FOOT.c[2], FOOT.r[0], FOOT.r[1], FOOT.r[2]), 1.5);
  return smax(d, YOFF - y, 1.0);
}
function earsB(x: number, y: number, z: number, info?: { inner: number }) { return sdEar(EARS[x >= 0 ? 0 : 1], x, y, z, info); }
function outerB(x: number, y: number, z: number) {
  let d = coreB(x, y, z);
  if (y > 30) d = smin(d, earsB(x, y, z), 1.1);
  d = smin(d, sdTail(x, y, z), 0.9);
  return d;
}
function limbsB(x: number, y: number, z: number) {
  const ax = Math.abs(x);
  return Math.min(sdEllipsoid(ax - PAW.c[0], y - PAW.c[1], z - PAW.c[2], PAW.r[0], PAW.r[1], PAW.r[2]),
    smax(sdEllipsoid(ax - FOOT.c[0], y - FOOT.c[1], z - FOOT.c[2], FOOT.r[0], FOOT.r[1], FOOT.r[2]), YOFF + 0.8 - y, 0.5));
}
// milky core; the paws keep a thinner clear skin so they read as paws, not bubbles
function innerB(x: number, y: number, z: number) { return smin(coreB(x, y, z) + INSET, limbsB(x, y, z) + 0.5, 1.0); }

const B = (fn: (x: number, y: number, z: number) => number) => (x: number, y: number, z: number) => fn(x / S, y / S + YOFF, z / S) * S;
export const sdOuter = B(outerB), sdInner = B(innerB), sdCore = B(coreB);
export const toB = (p: V3): V3 => [p[0] * S, (p[1] - YOFF) * S, p[2] * S];
const info = { inner: 0 }; const tinfo = { s: 0 };
const headZ = (x: number, y: number) => { const hx = x / HEAD.r[0], hy = (y - HEAD.c[1]) / HEAD.r[1]; return HEAD.c[2] + HEAD.r[2] * Math.sqrt(Math.max(0, 1 - hx * hx - hy * hy)); };

export const cat: CharacterShape = {
  id: 'cat',
  unitCm: 25,
  surfScale: 1.25,
  bounds: { min: [-0.2, -0.005, -0.19], max: [0.2, 0.535, 0.17] },
  outer: sdOuter,
  inner: sdInner,
  core: sdCore,
  attrs(x, y, z, out) {
    const bx = x / S, by = y / S + YOFF, bz = z / S;
    const de = by > 28 ? earsB(bx, by, bz, info) : 1e9;
    const dc = coreB(bx, by, bz);
    const dt = sdTail(bx, by, bz, tinfo);
    out[0] = 0;
    out[1] = smoothstep(0.3, -0.6, Math.min(de, dt) - dc);
    out[2] = de < 1e8 ? info.inner * smoothstep(0.3, -0.6, de - dc) : 0;                       // inner ear
    out[3] = dt < 0.5 ? smoothstep(BAND.s0 - 0.02, BAND.s0, tinfo.s) * (1 - smoothstep(BAND.s1, BAND.s1 + 0.02, tinfo.s)) : 0; // tail band
  },
  bubbleOk(x, y, z) { return sdOuter(x, y, z) < -0.006 && sdInner(x, y, z) > 0.004; },
  landmarks: {
    earL: toB(earTip(1)), earR: toB(earTip(-1)),
    whiskL: toB([FACE.whiskX1 - 0.6, FACE.whiskY, headZ(FACE.whiskX1 - 0.6, FACE.whiskY) - 1.0]),
    whiskR: toB([-(FACE.whiskX1 - 0.6), FACE.whiskY, headZ(FACE.whiskX1 - 0.6, FACE.whiskY) - 1.0]),
    tail: toB(TAIL_TIP), crown: toB([0, HEAD.c[1] + HEAD.r[1] - 0.8, 0]),
  },
};
