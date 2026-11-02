// Scalar SDF helpers (allocation-free, used by the bake pipeline and by runtime actuation code).
export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const smin = (a: number, b: number, k: number) => {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
export const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);

/** Approximate SDF of an axis-aligned ellipse (iq's k0/k1 approximation). */
export function sdEllipse(px: number, py: number, a: number, b: number) {
  const k0 = Math.hypot(px / a, py / b);
  if (k0 < 1e-9) return -Math.min(a, b);
  const k1 = Math.hypot(px / (a * a), py / (b * b));
  return (k0 * (k0 - 1)) / k1;
}

/** Combine an in-plane 2D distance with an out-of-plane slab distance (exact for orthogonal extrusion). */
export function opExtrude(d2: number, dw: number) {
  const ox = Math.max(d2, 0), oy = Math.max(dw, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(d2, dw), 0);
}

export function sdSphere(x: number, y: number, z: number, cx: number, cy: number, cz: number, r: number) {
  return Math.hypot(x - cx, y - cy, z - cz) - r;
}

/** Natural cubic-ish interpolation through sorted keys (Catmull-Rom, clamped ends). */
export function makeProfile(xs: number[], ys: number[]) {
  const n = xs.length;
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const x0 = xs[i], x1 = xs[i + 1];
    const t = (x - x0) / (x1 - x0);
    const y0 = ys[Math.max(i - 1, 0)], y1 = ys[i], y2 = ys[i + 1], y3 = ys[Math.min(i + 2, n - 1)];
    // Catmull-Rom with non-uniform spacing approximated by uniform tangents scaled by interval
    const m1 = (y2 - y0) / ((xs[i + 1] - xs[Math.max(i - 1, 0)]) || 1) * (x1 - x0);
    const m2 = (y3 - y1) / ((xs[Math.min(i + 2, n - 1)] - xs[i]) || 1) * (x1 - x0);
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * y2 + (t3 - t2) * m2;
  };
}

export type V3 = [number, number, number];
export const v3 = {
  sub: (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  scale: (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a: V3) => Math.hypot(a[0], a[1], a[2]),
  norm: (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};

/** One recipe for every fin: convex leading edge, falcate trailing edge, thinning toward the tip. */
export interface FinSpec {
  name: string;
  o: V3;        // leading root point (buried slightly inside the body)
  U: V3;        // root chord direction (leading -> trailing)
  V: V3;        // span direction (root -> tip)
  H: number;    // span length
  C: number;    // root chord
  sweep: number; // tip offset along U
  lePow: number; // leading-edge curvature exponent (>1 = convex)
  falcate: number; // trailing edge concavity (units)
  t0: number;   // half thickness at the root
  tmin: number; // minimum half thickness
  notch?: { s: number; w: number; depth: number }; // subterminal notch on trailing edge (depth = fraction of local chord)
  bury: number; // how far (fraction of H) the fin root extends into the body
}
export interface FinFrame { spec: FinSpec; U: V3; V: V3; N: V3 }
export function makeFinFrame(spec: FinSpec): FinFrame {
  const U = v3.norm(spec.U);
  let V = v3.sub(spec.V, v3.scale(U, v3.dot(spec.V, U)));
  V = v3.norm(V);
  const N = v3.norm(v3.cross(U, V));
  return { spec, U, V, N };
}
/** Returns signed distance; writes span param s and chord param c into out[0], out[1]. */
export function sdFin(f: FinFrame, x: number, y: number, z: number, out?: Float64Array) {
  const s0 = f.spec;
  const px = x - s0.o[0], py = y - s0.o[1], pz = z - s0.o[2];
  const u = px * f.U[0] + py * f.U[1] + pz * f.U[2];
  const v = px * f.V[0] + py * f.V[1] + pz * f.V[2];
  const w = px * f.N[0] + py * f.N[1] + pz * f.N[2];
  const s = v / s0.H;
  const sc = clamp(s, 0, 1);
  const le = s0.sweep * Math.pow(sc, s0.lePow) - (s < 0 ? 0.0 : 0);
  let te = mix(s0.C, s0.sweep, sc) - s0.falcate * Math.sin(Math.PI * sc) * (1 - 0.35 * sc);
  if (s0.notch) {
    const g = (sc - s0.notch.s) / s0.notch.w;
    te -= (te - le) * s0.notch.depth * Math.exp(-g * g * 2.0);
  }
  const chord = Math.max(te - le, 1e-5);
  const d2 = Math.max(le - u, u - te, v - s0.H, -s0.bury * s0.H - v);
  const cn = clamp((u - le) / chord, 0, 1);
  // chordwise profile: full rounded leading edge, thin trailing edge
  const prof = Math.pow(cn, 0.5) * Math.pow(1 - cn, 0.85) / 0.6;
  const spanThin = mix(1, 0.22, Math.pow(sc, 1.2));
  const th = Math.max(s0.t0 * spanThin * Math.min(prof, 1.0) * Math.min(1, chord / (0.35 * s0.C) + 0.35), s0.tmin);
  const dw = Math.abs(w) - th;
  if (out) { out[0] = s; out[1] = cn; }
  // rounded rims: the edge becomes a bead of radius ~th (surface nets cannot hold knife edges)
  const rr = Math.min(th * 0.95, 0.006);
  return opExtrude(d2 + rr, dw + rr) - rr;
}

// ---- extra primitives for the chibi characters --------------------------------------------------
/** Approximate SDF of an axis-aligned ellipsoid (iq's k0/k1 bound, accurate near the surface). */
export function sdEllipsoid(x: number, y: number, z: number, rx: number, ry: number, rz: number) {
  const k0 = Math.hypot(x / rx, y / ry, z / rz);
  if (k0 < 1e-9) return -Math.min(rx, ry, rz);
  const k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return (k0 * (k0 - 1)) / k1;
}
/** Exact SDF of a 2D triangle (iq). */
export function sdTri2(px: number, py: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  const e0x = bx - ax, e0y = by - ay, e1x = cx - bx, e1y = cy - by, e2x = ax - cx, e2y = ay - cy;
  const v0x = px - ax, v0y = py - ay, v1x = px - bx, v1y = py - by, v2x = px - cx, v2y = py - cy;
  const t0 = clamp((v0x * e0x + v0y * e0y) / (e0x * e0x + e0y * e0y), 0, 1);
  const t1 = clamp((v1x * e1x + v1y * e1y) / (e1x * e1x + e1y * e1y), 0, 1);
  const t2 = clamp((v2x * e2x + v2y * e2y) / (e2x * e2x + e2y * e2y), 0, 1);
  const q0x = v0x - e0x * t0, q0y = v0y - e0y * t0, q1x = v1x - e1x * t1, q1y = v1y - e1y * t1, q2x = v2x - e2x * t2, q2y = v2y - e2y * t2;
  const s = Math.sign(e0x * e2y - e0y * e2x);
  let dx = q0x * q0x + q0y * q0y, dy = s * (v0x * e0y - v0y * e0x);
  const ax1 = q1x * q1x + q1y * q1y, ay1 = s * (v1x * e1y - v1y * e1x);
  const ax2 = q2x * q2x + q2y * q2y, ay2 = s * (v2x * e2y - v2y * e2x);
  if (ax1 < dx) dx = ax1; if (ay1 < dy) dy = ay1;
  if (ax2 < dx) dx = ax2; if (ay2 < dy) dy = ay2;
  return -Math.sqrt(dx) * Math.sign(dy);
}
export function sdCapsule(x: number, y: number, z: number, a: V3, b: V3, r: number) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const pax = x - a[0], pay = y - a[1], paz = z - a[2];
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}
/** Orthonormal local frame: origin o, axes u (local x), v (local y), w (local z). */
export interface Frame3 { o: V3; u: V3; v: V3; w: V3 }
export const norm3 = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** frame whose v axis points along 'up' and w is as close as possible to 'fwd' */
export function frameUp(o: V3, up: V3, fwd: V3): Frame3 {
  const v = norm3(up); const u = norm3(cross3(v, fwd)); const w = cross3(u, v);
  return { o, u, v, w };
}
export function toLocal(f: Frame3, x: number, y: number, z: number, out: Float64Array | number[]) {
  const dx = x - f.o[0], dy = y - f.o[1], dz = z - f.o[2];
  out[0] = dx * f.u[0] + dy * f.u[1] + dz * f.u[2];
  out[1] = dx * f.v[0] + dy * f.v[1] + dz * f.v[2];
  out[2] = dx * f.w[0] + dy * f.w[1] + dz * f.w[2];
}
