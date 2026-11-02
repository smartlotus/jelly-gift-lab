/** Gentle self-righting: if the jelly stays tipped over (and nobody holds it), spin it back upright.
 *  Body "up" is the rest-height-weighted spread of the current node cloud, so it works for any character. */
export class Righting {
  private idx: Uint32Array; private q: Float32Array; private tipped = 0;
  constructor(rest: Float32Array, maxSamples = 600, public strength = 380, public delay = 0.6) {
    const N = rest.length / 3; const step = Math.max(1, Math.floor(N / maxSamples));
    const ids: number[] = []; for (let i = 0; i < N; i += step) ids.push(i);
    this.idx = new Uint32Array(ids);
    const c = [0, 0, 0]; for (const i of ids) for (let k = 0; k < 3; k++) c[k] += rest[3 * i + k] / ids.length;
    this.q = new Float32Array(ids.length * 3); ids.forEach((i, j) => { for (let k = 0; k < 3; k++) this.q[3 * j + k] = rest[3 * i + k] - c[k]; });
  }
  /** returns the tilt angle (rad); writes angular acceleration xyz + centre xyz into out */
  update(x: Float32Array, stride: number, dt: number, held: boolean, out: Float32Array) {
    const n = this.idx.length; let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < n; k++) { const o = this.idx[k] * stride; cx += x[o]; cy += x[o + 1]; cz += x[o + 2]; }
    cx /= n; cy /= n; cz /= n;
    // best-fit rotation (shape matching): A = sum (x - c) q^T, R = polar(A); body up = R * (0,1,0)
    const A = [0, 0, 0, 0, 0, 0, 0, 0, 0]; const q = this.q;
    for (let k = 0; k < n; k++) { const o = this.idx[k] * stride; const d = [x[o] - cx, x[o + 1] - cy, x[o + 2] - cz];
      for (let r = 0; r < 3; r++) for (let cc = 0; cc < 3; cc++) A[3 * r + cc] += d[r] * q[3 * k + cc]; }
    let R = A.slice();
    for (let it = 0; it < 12; it++) {           // Higham iteration R <- (R + R^-T) / 2
      const [a, b, c, d, e, f, g, h, i] = R;
      const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g); if (Math.abs(det) < 1e-12) break;
      const it_ = [(e * i - f * h) / det, -(d * i - f * g) / det, (d * h - e * g) / det, -(b * i - c * h) / det, (a * i - c * g) / det, -(a * h - b * g) / det, (b * f - c * e) / det, -(a * f - c * d) / det, (a * e - b * d) / det];
      R = R.map((v, k) => 0.5 * (v + it_[k]));   // it_ is the cofactor matrix / det = inverse transpose
    }
    let ux = R[1], uy = R[4], uz = R[7];
    const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
    const ang = Math.acos(Math.max(-1, Math.min(1, uy)));
    out.fill(0); out[3] = cx; out[4] = cy; out[5] = cz;
    this.tipped = held || ang < 0.45 ? 0 : this.tipped + dt;
    if (this.tipped > this.delay) {
      // axis = up x Y  (rotates 'up' toward +Y); upside-down: pick the body's long axis-ish fallback
      let ax = -uz, az = ux; let al = Math.hypot(ax, az);
      if (al < 1e-3) { ax = 1; az = 0; al = 1; }
      const ramp = Math.min(1, (this.tipped - this.delay) / 0.4);
      const mag = this.strength * ramp * Math.min(1, (ang - 0.35) / 0.5);
      out[0] = ax / al * mag; out[2] = az / al * mag;
    }
    return ang;
  }
}
