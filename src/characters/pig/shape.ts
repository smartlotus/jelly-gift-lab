import type { CharacterShape } from '../../core/character';
import { clamp, smin, smax, smoothstep, opExtrude, sdEllipse, sdEllipsoid, sdTri2, sdCapsule, frameUp, toLocal, norm3, cross3, type V3, type Frame3 } from '../../core/sdf';

// The pig from the doodle (and the v5 chibi figure). Modelled in "figure units" (B) — the chibi's Blender units with
// y up, +z = the face (towards the camera), x lateral — then scaled to rest space (1 unit = 25 cm, floor at y = 0).
export const S = 0.0115;           // figure unit -> rest unit  (pig ~46 B tall -> 0.53 u -> 13 cm)
export const YOFF = 3.4;           // flat base at B y = 3.4 sits on the floor (a wide seat keeps the big head upright)
export const INSET = 1.55;         // clear-jelly thickness over the milky core (B)

export const HEAD = { c: [0, 23.4, 0] as V3, r: [12.8, 10.9, 11.0] as V3 };
const BODY1 = { c: [0, 9.4, -0.6] as V3, r: [10.0, 9.0, 9.4] as V3 };
const BODY2 = { c: [0, 7.4, 1.0] as V3, r: [8.8, 6.8, 8.2] as V3 };
export const SNOUT = { y: 20.6, z0: 7.0, z1: 12.0, rx: 4.3, ry: 3.0, round: 1.05 };
export const NOSTRIL = { x: 1.5, rx: 0.68, ry: 1.05 };
export const CHEEK = { x: 7.8, y: 19.8, rx: 3.0, ry: 2.1 };
const ARM = { c: [5.4, 9.8, 7.4] as V3, r: [2.5, 2.8, 2.6] as V3 };
const FOOT = { c: [4.4, 4.6, 6.6] as V3, r: [3.1, 2.3, 3.4] as V3 };

// eyes: small black ovals set wide on the face, oriented with the head surface
const eyeFrame = (side: number): Frame3 => {
  const p: V3 = [5.6 * side, 24.6, 0];
  const hx = p[0] / HEAD.r[0], hy = (p[1] - HEAD.c[1]) / HEAD.r[1];
  p[2] = HEAD.r[2] * Math.sqrt(1 - hx * hx - hy * hy);
  const n = norm3([p[0] / HEAD.r[0] ** 2, (p[1] - HEAD.c[1]) / HEAD.r[1] ** 2, p[2] / HEAD.r[2] ** 2]);
  const R = EYE_R[2] + 0.42;
  const o: V3 = [p[0] - n[0] * R, p[1] - n[1] * R, p[2] - n[2] * R];
  const u = norm3(cross3([0, 1, 0], n)); const v = cross3(n, u);
  return { o, u, v, w: n };
};
export const EYE_R: V3 = [1.45, 1.95, 1.05];
export const EYES = [eyeFrame(1), eyeFrame(-1)];

// ears: rounded triangle slabs on the top of the head, tipped outward and leaning back a touch
const earFrame = (side: number): Frame3 => {
  const lean = 0.17, roll = 0.36 * side;
  const up: V3 = [Math.sin(roll), Math.cos(roll) * Math.cos(lean), -Math.cos(roll) * Math.sin(lean)];
  const x = 6.0 * side; const hx = x / HEAD.r[0];
  const yb = HEAD.c[1] + HEAD.r[1] * Math.sqrt(1 - hx * hx) - 1.6;
  return frameUp([x, yb, -0.6], up, [0, 0.15, 1]);
};
export const EARS = [earFrame(1), earFrame(-1)];
const EAR_TRI = { hw: 4.5, b: -3.0, apex: 5.8, round: 1.8, t: 1.55 };
const tmp = new Float64Array(3);
function sdEar(f: Frame3, x: number, y: number, z: number, info?: { inner: number }) {
  toLocal(f, x, y, z, tmp);
  const u = tmp[0], v = tmp[1], w = tmp[2];
  const d2 = sdTri2(u, v, -EAR_TRI.hw, EAR_TRI.b, EAR_TRI.hw, EAR_TRI.b, 0, EAR_TRI.apex) - EAR_TRI.round;
  const t = EAR_TRI.t - 0.07 * clamp(v, 0, 9);
  const rr = Math.min(EAR_TRI.round, t * 0.9);
  if (info) info.inner = smoothstep(-0.5, -1.4, d2) * smoothstep(0.3, 1.6, v) * smoothstep(-0.3, 0.6, w);
  return opExtrude(d2 + rr, Math.abs(w) - t + rr) - rr;
}
export const earTip = (side: number): V3 => { const f = EARS[side > 0 ? 0 : 1]; const a = EAR_TRI.apex + 0.6; return [f.o[0] + f.v[0] * a, f.o[1] + f.v[1] * a, f.o[2] + f.v[2] * a]; };

// curly tail: a short helix on the back
const TAIL_C: V3 = [0, 10.6, -11.2];
const TAIL_PTS: V3[] = [];
for (let i = 0; i <= 28; i++) {
  const t = (i / 28) * 1.55 * 2 * Math.PI; const R = 1.65 - 0.25 * (i / 28);
  TAIL_PTS.push([TAIL_C[0] + R * Math.cos(t + 2.4), TAIL_C[1] + R * Math.sin(t + 2.4), TAIL_C[2] - 0.32 * t]);
}
const TAIL_STUB: [V3, V3] = [[-0.6, 10.4, -8.4], TAIL_PTS[0]];
export const TAIL_END = TAIL_PTS[TAIL_PTS.length - 1];
function sdTail(x: number, y: number, z: number) {
  const dc = Math.hypot(x - TAIL_C[0], y - TAIL_C[1], z - (TAIL_C[2] - 2.0));
  if (dc > 7.5) return dc - 5.5;
  let d = sdCapsule(x, y, z, TAIL_STUB[0], TAIL_STUB[1], 0.95);
  for (let i = 0; i < TAIL_PTS.length - 1; i++) d = Math.min(d, sdCapsule(x, y, z, TAIL_PTS[i], TAIL_PTS[i + 1], 0.95 - 0.25 * (i / 28)));
  return d;
}

const el = (x: number, y: number, z: number, e: { c: V3; r: V3 }) => sdEllipsoid(x - e.c[0], y - e.c[1], z - e.c[2], e.r[0], e.r[1], e.r[2]);
function sdSnout(x: number, y: number, z: number, grow = 0) {
  const r = SNOUT.round;
  const d2 = sdEllipse(x, y - SNOUT.y, SNOUT.rx + grow - r, SNOUT.ry + grow - r);
  const zc = (SNOUT.z0 + SNOUT.z1) / 2, hz = (SNOUT.z1 - SNOUT.z0) / 2 + grow;
  return opExtrude(d2 + r, Math.abs(z - zc) - hz + r) - r;
}
/** body without ears/tail (B units) */
function coreB(x: number, y: number, z: number) {
  const ax = Math.abs(x);
  let d = smin(el(x, y, z, BODY1), el(x, y, z, BODY2), 3.0);
  d = smin(d, el(x, y, z, HEAD), 4.2);
  d = smin(d, sdEllipsoid(ax - ARM.c[0], y - ARM.c[1], z - ARM.c[2], ARM.r[0], ARM.r[1], ARM.r[2]), 1.4);
  d = smin(d, sdEllipsoid(ax - FOOT.c[0], y - FOOT.c[1], z - FOOT.c[2], FOOT.r[0], FOOT.r[1], FOOT.r[2]), 1.6);
  d = smin(d, sdSnout(x, y, z), 1.3);
  return smax(d, YOFF - y, 1.0);            // flat seat
}
function earsB(x: number, y: number, z: number, info?: { inner: number }) {
  const f = EARS[x >= 0 ? 0 : 1];
  return sdEar(f, x, y, z, info);
}
function outerB(x: number, y: number, z: number) {
  let d = coreB(x, y, z);
  if (y > 26) d = smin(d, earsB(x, y, z), 1.1);
  if (z < -6) d = smin(d, sdTail(x, y, z), 0.6);
  return d;
}
function eyesB(x: number, y: number, z: number) {
  const f = EYES[x >= 0 ? 0 : 1]; toLocal(f, x, y, z, tmp);
  return sdEllipsoid(tmp[0], tmp[1], tmp[2], EYE_R[0], EYE_R[1], EYE_R[2]);
}
function innerB(x: number, y: number, z: number) {
  let d = coreB(x, y, z) + INSET;
  d = smin(d, sdSnout(x, y, z, -0.5), 0.6);    // the milky snout comes close to the surface so the nostrils read
  return Math.min(d, eyesB(x, y, z));
}

const B = (f: (x: number, y: number, z: number) => number) => (x: number, y: number, z: number) => f(x / S, y / S + YOFF, z / S) * S;
export const sdOuter = B(outerB), sdInner = B(innerB), sdCore = B(coreB);
const info = { inner: 0 };
export const toB = (p: V3): V3 => [p[0] * S, (p[1] - YOFF) * S, p[2] * S];

export const pig: CharacterShape = {
  id: 'pig',
  unitCm: 25,
  surfScale: 1.3,
  bounds: { min: [-0.22, -0.005, -0.22], max: [0.22, 0.52, 0.17] },
  outer: sdOuter,
  inner: sdInner,
  core: sdCore,
  attrs(x, y, z, out) {
    const bx = x / S, by = y / S + YOFF, bz = z / S;
    const de = by > 24 ? earsB(bx, by, bz, info) : 1e9;
    const dc = coreB(bx, by, bz);
    out[0] = 0;
    out[1] = smoothstep(0.3, -0.6, de - dc);                 // appendage (ear) mask
    out[2] = de < 1e8 ? info.inner * out[1] : 0;             // inner-ear pink
    out[3] = smoothstep(0.4, -0.4, sdTail(bx, by, bz) - dc); // tail
  },
  bubbleOk(x, y, z) { return sdOuter(x, y, z) < -0.006 && sdInner(x, y, z) > 0.004; },
  landmarks: {
    snout: toB([0, SNOUT.y, SNOUT.z1 - 0.3]),
    tail: toB(TAIL_STUB[0]).map((v, i) => i === 2 ? v - 0.012 : v) as V3,
    earL: toB(earTip(1)), earR: toB(earTip(-1)),
    crown: toB([0, HEAD.c[1] + HEAD.r[1] - 0.8, 0]),
    seat: toB([0, YOFF + 1.0, 0]),
  },
};
