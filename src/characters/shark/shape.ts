import type { CharacterShape } from '../../core/character';
import { clamp, makeProfile, sdEllipse, smin, smax, mix, smoothstep, makeFinFrame, sdFin, opExtrude, type FinSpec, type V3 } from '../../core/sdf';

// Rest space: +x = head, +y = up, z = lateral. Floor at y = 0. 1 unit = 25 cm.
// ---- body: elliptical section swept along the spine -------------------------------------------
const KX = [-0.42, -0.36, -0.29, -0.20, -0.09, 0.03, 0.14, 0.24, 0.33, 0.40, 0.47];
export const bodyA = makeProfile(KX, [0.010, 0.016, 0.028, 0.046, 0.060, 0.069, 0.073, 0.064, 0.047, 0.040, 0.030]); // half width
export const bodyB = makeProfile(KX, [0.016, 0.022, 0.036, 0.057, 0.075, 0.089, 0.095, 0.080, 0.053, 0.040, 0.026]); // half height
export const bodyC = makeProfile(KX, [0.080, 0.078, 0.076, 0.080, 0.087, 0.093, 0.096, 0.083, 0.064, 0.056, 0.050]); // spine height
const X0 = -0.42, X1 = 0.47;

export function sdBody(x: number, y: number, z: number) {
  const xc = clamp(x, X0, X1);
  const a = bodyA(xc), b = bodyB(xc), c = bodyC(xc);
  const d = sdEllipse(z, y - c, a, b);
  const dx = Math.abs(x - xc);
  return dx > 0 ? Math.hypot(Math.max(d, 0), dx) + Math.min(d, 0) * 0 : d;
}

// ---- cephalofoil -------------------------------------------------------------------------------
export const HS = 0.226; // half span
export const hammerFront = (z: number) => {
  const q = Math.abs(z) / HS;
  return 0.505 - 0.018 * q * q - 0.0085 * Math.exp(-(z * z) / (0.011 * 0.011));
};
export const hammerBack = (z: number) => {
  const q = Math.abs(z) / HS;
  return hammerFront(z) - (0.072 + 0.045 * Math.exp(-(z * z) / (0.055 * 0.055))) - 0.03 * q * q;
};
export const hammerY = (z: number) => 0.050 - 0.006 * (z * z) / (HS * HS);
const hammerT = (z: number) => 0.019 + 0.012 * Math.exp(-(z * z) / (0.065 * 0.065));

export function sdHammer(x: number, y: number, z: number) {
  const xf = hammerFront(z), xb = hammerBack(z);
  const du = Math.max(x - xf, xb - x);
  const dz = Math.abs(z) - HS;
  const d2 = smax(du, dz, 0.028);
  const u = clamp((xf - x) / (xf - xb), 0, 1);
  const shape = Math.min((1.6 * Math.sqrt(u) * Math.pow(1 - u, 0.9)) / 0.64, 1);
  const tip = smoothstep(HS - 0.03, HS, Math.abs(z));
  const t = Math.max(hammerT(z) * shape, 0.0035) * mix(1, 0.85, tip);
  const dy = Math.abs(y - hammerY(z)) - t;
  const rr = Math.min(t * 0.95, 0.008);
  return opExtrude(d2 + rr, dy + rr) - rr;
}
export const EYE_R = 0.0175;
export const eyeC = (side: number): V3 => [hammerFront(HS) - 0.022, hammerY(HS) + 0.004, side * (HS - 0.008)];

// ---- fins: seven kinds from one recipe ---------------------------------------------------------
const fin = (s: Partial<FinSpec> & Pick<FinSpec, 'name' | 'o' | 'U' | 'V' | 'H' | 'C' | 'sweep' | 't0'>): FinSpec => ({
  lePow: 2, falcate: 0, tmin: 0.0042, bury: 0.35, ...s,
});
export const FINS: FinSpec[] = [
  fin({ name: 'dorsal1', o: [0.135, 0.150, 0], U: [-1, 0, 0], V: [-0.05, 1, 0], H: 0.25, C: 0.155, sweep: 0.155, falcate: 0.075, t0: 0.018, lePow: 2.1 }),
  fin({ name: 'dorsal2', o: [-0.215, 0.095, 0], U: [-1, 0, 0], V: [-0.1, 1, 0], H: 0.066, C: 0.056, sweep: 0.046, falcate: 0.014, t0: 0.0085 }),
  fin({ name: 'pectoralL', o: [0.235, 0.040, 0.040], U: [-1, 0, 0.12], V: [-0.18, -0.22, 1], H: 0.17, C: 0.09, sweep: 0.09, falcate: 0.03, t0: 0.012 }),
  fin({ name: 'pectoralR', o: [0.235, 0.040, -0.040], U: [-1, 0, -0.12], V: [-0.18, -0.22, -1], H: 0.17, C: 0.09, sweep: 0.09, falcate: 0.03, t0: 0.012 }),
  fin({ name: 'pelvicL', o: [-0.095, 0.030, 0.022], U: [-1, 0, 0.1], V: [-0.3, -0.42, 1], H: 0.082, C: 0.055, sweep: 0.05, falcate: 0.02, t0: 0.0075 }),
  fin({ name: 'pelvicR', o: [-0.095, 0.030, -0.022], U: [-1, 0, -0.1], V: [-0.3, -0.42, -1], H: 0.082, C: 0.055, sweep: 0.05, falcate: 0.02, t0: 0.0075 }),
  fin({ name: 'anal', o: [-0.225, 0.052, 0], U: [-1, 0, 0], V: [-0.35, -1, 0], H: 0.056, C: 0.05, sweep: 0.04, falcate: 0.015, t0: 0.007 }),
  fin({ name: 'caudalUpper', o: [-0.362, 0.090, 0], U: [-0.75, -1, 0], V: [-1, 0.75, 0], H: 0.30, C: 0.105, sweep: 0.02, lePow: 1.5, falcate: 0.016, t0: 0.013, bury: 0.12,
        notch: { s: 0.80, w: 0.03, depth: 0.6 } }),
  fin({ name: 'caudalLower', o: [-0.39, 0.074, 0], U: [-0.55, 1, 0], V: [-1, -0.55, 0], H: 0.15, C: 0.066, sweep: 0.032, falcate: 0.024, t0: 0.011, bury: 0.15 }),
];
const FRAMES = FINS.map(makeFinFrame);

const tmp = new Float64Array(2);
export function sdFinsAll(x: number, y: number, z: number, info?: { s: number; idx: number }) {
  let d = 1e9, best = -1, bs = 0;
  for (let i = 0; i < FRAMES.length; i++) {
    const di = sdFin(FRAMES[i], x, y, z, tmp);
    if (di < d) { d = di; best = i; bs = tmp[0]; }
  }
  if (info) { info.s = bs; info.idx = best; }
  return d;
}

export function sdCore(x: number, y: number, z: number) {
  return smin(sdBody(x, y, z), sdHammer(x, y, z), 0.045);
}
function sdEyes(x: number, y: number, z: number, r: number) {
  const e = eyeC(z >= 0 ? 1 : -1);
  return Math.hypot(x - e[0], y - e[1], z - e[2]) - r;
}

export function sdOuter(x: number, y: number, z: number) {
  let d = sdCore(x, y, z);
  d = smin(d, sdFinsAll(x, y, z), 0.014);
  d = smin(d, sdEyes(x, y, z, EYE_R + 0.0035), 0.008);
  return d;
}

export function bellyLine(x: number, z: number) {
  const xb = clamp(x, X0, X1);
  const body = bodyC(xb) - 0.40 * bodyB(xb);
  return mix(body, hammerY(z) + 0.001, smoothstep(0.36, 0.43, x));
}
export function sdInner(x: number, y: number, z: number) {
  const shell = mix(0.011, 0.0055, smoothstep(0.34, 0.44, x));
  let d = sdCore(x, y, z) + shell;
  d = smax(d, y - bellyLine(x, z), 0.02);
  return Math.min(d, sdEyes(x, y, z, EYE_R - 0.0025));
}

export const shark: CharacterShape = {
  id: 'shark',
  unitCm: 25,
  bounds: { min: [-0.70, -0.005, -0.30], max: [0.53, 0.43, 0.30] },
  outer: sdOuter,
  inner: sdInner,
  core: sdCore,
  attrs(x, y, z, out) {
    const info = { s: 0, idx: -1 };
    const dfin = sdFinsAll(x, y, z, info);
    const dcore = sdCore(x, y, z);
    const xb = clamp(x, X0, X1);
    // 0: vertical section coordinate (−1 belly … +1 back); hammer uses its own mid-plane
    const secBody = (y - bodyC(xb)) / bodyB(xb);
    const secHam = (y - hammerY(z)) / 0.02;
    const h = smoothstep(0.37, 0.43, x) * smoothstep(0.03, 0.08, Math.abs(z)) ;
    out[0] = clamp(mix(secBody, secHam, Math.max(h, smoothstep(0.42, 0.46, x))), -2, 2);
    // 1: fin mask (1 on fins)
    const fm = smoothstep(0.004, -0.006, dfin - dcore);
    out[1] = fm;
    // 2: dusky fin tip
    out[2] = fm * smoothstep(0.55, 0.98, info.s) * (info.idx === 1 ? 0.6 : 1.0);
    // 3: fin id (for shader variations), normalised
    out[3] = fm > 0.5 ? (info.idx + 1) / 16 : 0;
  },
  bubbleOk(x, y, z) {
    return sdOuter(x, y, z) < -0.009 && sdInner(x, y, z) > 0.006 && sdFinsAll(x, y, z) > 0.0;
  },
  landmarks: {
    snout: [hammerFront(0) - 0.004, hammerY(0), 0],
    fork: [-0.418, 0.079, 0], // refined during bake
    eyeL: eyeC(1),
    eyeR: eyeC(-1),
  },
};
