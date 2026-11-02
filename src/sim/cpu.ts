import type { TetAsset } from './mesh';
import { type SimParams, MAX_BEADS } from './params';

export interface GrabState { active: boolean; count: number; idx: Int32Array; off: Float32Array; wt: Float32Array; target: Float32Array; twist: number; axis: Float32Array }
export function makeGrab(max: number): GrabState {
  return { active: false, count: 0, idx: new Int32Array(max), off: new Float32Array(max * 3), wt: new Float32Array(max), target: new Float32Array(3), twist: 0, axis: new Float32Array([0, 0, 1]) };
}

/** Reference XPBD solver: co-rotational deviatoric constraint + volume constraint per tet, Gauss-Seidel by colour. */
export class CpuSolver {
  N: number; T: number;
  x: Float32Array; p: Float32Array; v: Float32Array;
  q: Float32Array; // per-tet rotation quaternion warm start
  nodeData: Float32Array; // N*16 : pos.xyz,0 | F col0 | F col1 | F col2
  time = 0;
  act: Float32Array;
  beads = new Float32Array(MAX_BEADS * 4); beadCount = 0;
  constructor(public a: TetAsset, public prm: SimParams) {
    this.N = a.nodes.length / 3; this.T = a.tets.length / 4;
    this.x = new Float32Array(a.nodes); this.p = new Float32Array(a.nodes); this.v = new Float32Array(this.N * 3);
    this.q = new Float32Array(this.T * 4); for (let t = 0; t < this.T; t++) this.q[4 * t + 3] = 1;
    this.nodeData = new Float32Array(this.N * 16);
    this.act = new Float32Array(a.channels);
  }
  reset() {
    this.x.set(this.a.nodes); this.p.set(this.a.nodes); this.v.fill(0);
    for (let t = 0; t < this.T; t++) { this.q[4 * t] = 0; this.q[4 * t + 1] = 0; this.q[4 * t + 2] = 0; this.q[4 * t + 3] = 1; }
  }

  step(dt: number, act: Float32Array, grab: GrabState) {
    const { prm, a } = this; const n = prm.substeps; const h = dt / n;
    const x = this.x, p = this.p, v = this.v, w = a.invMass;
    const damp = Math.exp(-prm.damping * h);
    for (let s = 0; s < n; s++) {
      for (let i = 0; i < this.N; i++) {
        if (w[i] === 0) continue;
        v[3 * i + 1] -= prm.gravity * a.grav[i] * h;
        v[3 * i] *= damp; v[3 * i + 1] *= damp; v[3 * i + 2] *= damp;
        p[3 * i] = x[3 * i]; p[3 * i + 1] = x[3 * i + 1]; p[3 * i + 2] = x[3 * i + 2];
        x[3 * i] += v[3 * i] * h; x[3 * i + 1] += v[3 * i + 1] * h; x[3 * i + 2] += v[3 * i + 2] * h;
      }
      this.solveTets(h, act);
      this.solveGrab(grab);
      this.solveContacts();
      const ih = 1 / h;
      for (let i = 0; i < this.N * 3; i++) v[i] = (x[i] - p[i]) * ih;
    }
    this.time += dt;
  }

  private solveTets(h: number, act: Float32Array) {
    const { a, prm, x, q } = this; const tets = a.tets, B = a.B, w = a.invMass;
    const ih2 = 1 / (h * h); const ch = a.channels;
    const g = new Float64Array(12);
    for (let t = 0; t < this.T; t++) {
      const i0 = tets[4 * t], i1 = tets[4 * t + 1], i2 = tets[4 * t + 2], i3 = tets[4 * t + 3];
      const vol = a.restVol[t];
      const fw = a.finW[t];
      const mu = (prm.muBody + (prm.muFin - prm.muBody) * fw) * a.stiff[t];
      // muscle: isochoric active stretch along rest x
      let s = 0; for (let c = 0; c < ch; c++) s += a.muscle[t * ch + c] * act[c];
      const sx = 1 / (1 + s), syz = Math.sqrt(1 + s);
      const b = 9 * t;
      // effective B = B * diag(sx, syz, syz)  (columns scaled)
      const B00 = B[b] * sx, B01 = B[b + 1] * syz, B02 = B[b + 2] * syz;
      const B10 = B[b + 3] * sx, B11 = B[b + 4] * syz, B12 = B[b + 5] * syz;
      const B20 = B[b + 6] * sx, B21 = B[b + 7] * syz, B22 = B[b + 8] * syz;
      for (let pass = 0; pass < 2; pass++) {
        const e1x = x[3 * i1] - x[3 * i0], e1y = x[3 * i1 + 1] - x[3 * i0 + 1], e1z = x[3 * i1 + 2] - x[3 * i0 + 2];
        const e2x = x[3 * i2] - x[3 * i0], e2y = x[3 * i2 + 1] - x[3 * i0 + 1], e2z = x[3 * i2 + 2] - x[3 * i0 + 2];
        const e3x = x[3 * i3] - x[3 * i0], e3y = x[3 * i3 + 1] - x[3 * i0 + 1], e3z = x[3 * i3 + 2] - x[3 * i0 + 2];
        // F = Ds * B  (column j of F = e1*B0j + e2*B1j + e3*B2j)
        const F00 = e1x * B00 + e2x * B10 + e3x * B20, F10 = e1y * B00 + e2y * B10 + e3y * B20, F20 = e1z * B00 + e2z * B10 + e3z * B20;
        const F01 = e1x * B01 + e2x * B11 + e3x * B21, F11 = e1y * B01 + e2y * B11 + e3y * B21, F21 = e1z * B01 + e2z * B11 + e3z * B21;
        const F02 = e1x * B02 + e2x * B12 + e3x * B22, F12 = e1y * B02 + e2y * B12 + e3y * B22, F22 = e1z * B02 + e2z * B12 + e3z * B22;
        let P00, P01, P02, P10, P11, P12, P20, P21, P22, C, alpha;
        if (pass === 0) {
          // polar decomposition (Mueller et al. 2016), warm-started
          let qx = q[4 * t], qy = q[4 * t + 1], qz = q[4 * t + 2], qw = q[4 * t + 3];
          let R00 = 0, R01 = 0, R02 = 0, R10 = 0, R11 = 0, R12 = 0, R20 = 0, R21 = 0, R22 = 0;
          for (let it = 0; it < 3; it++) {
            R00 = 1 - 2 * (qy * qy + qz * qz); R01 = 2 * (qx * qy - qz * qw); R02 = 2 * (qx * qz + qy * qw);
            R10 = 2 * (qx * qy + qz * qw); R11 = 1 - 2 * (qx * qx + qz * qz); R12 = 2 * (qy * qz - qx * qw);
            R20 = 2 * (qx * qz - qy * qw); R21 = 2 * (qy * qz + qx * qw); R22 = 1 - 2 * (qx * qx + qy * qy);
            // omega = sum_i r_i x f_i / (|sum r_i . f_i| + eps)
            const ox = (R10 * F20 - R20 * F10) + (R11 * F21 - R21 * F11) + (R12 * F22 - R22 * F12);
            const oy = (R20 * F00 - R00 * F20) + (R21 * F01 - R01 * F21) + (R22 * F02 - R02 * F22);
            const oz = (R00 * F10 - R10 * F00) + (R01 * F11 - R11 * F01) + (R02 * F12 - R12 * F02);
            const den = Math.abs(R00 * F00 + R10 * F10 + R20 * F20 + R01 * F01 + R11 * F11 + R21 * F21 + R02 * F02 + R12 * F12 + R22 * F22) + 1e-9;
            const wx = ox / den, wy = oy / den, wz = oz / den;
            const ang = Math.hypot(wx, wy, wz);
            if (ang < 1e-7) break;
            const ha = Math.min(ang, 1.0) * 0.5, sn = Math.sin(ha) / ang, cs = Math.cos(ha);
            const ax = wx * sn, ay = wy * sn, az = wz * sn;
            // q = dq * q
            const nx = cs * qx + ax * qw + ay * qz - az * qy;
            const ny = cs * qy - ax * qz + ay * qw + az * qx;
            const nz = cs * qz + ax * qy - ay * qx + az * qw;
            const nw = cs * qw - ax * qx - ay * qy - az * qz;
            const l = 1 / Math.hypot(nx, ny, nz, nw);
            qx = nx * l; qy = ny * l; qz = nz * l; qw = nw * l;
          }
          R00 = 1 - 2 * (qy * qy + qz * qz); R01 = 2 * (qx * qy - qz * qw); R02 = 2 * (qx * qz + qy * qw);
          R10 = 2 * (qx * qy + qz * qw); R11 = 1 - 2 * (qx * qx + qz * qz); R12 = 2 * (qy * qz - qx * qw);
          R20 = 2 * (qx * qz - qy * qw); R21 = 2 * (qy * qz + qx * qw); R22 = 1 - 2 * (qx * qx + qy * qy);
          q[4 * t] = qx; q[4 * t + 1] = qy; q[4 * t + 2] = qz; q[4 * t + 3] = qw;
          P00 = F00 - R00; P01 = F01 - R01; P02 = F02 - R02; P10 = F10 - R10; P11 = F11 - R11; P12 = F12 - R12; P20 = F20 - R20; P21 = F21 - R21; P22 = F22 - R22;
          C = Math.sqrt(P00 * P00 + P01 * P01 + P02 * P02 + P10 * P10 + P11 * P11 + P12 * P12 + P20 * P20 + P21 * P21 + P22 * P22);
          if (C < 1e-9) continue;
          const ic = 1 / C;
          P00 *= ic; P01 *= ic; P02 *= ic; P10 *= ic; P11 *= ic; P12 *= ic; P20 *= ic; P21 *= ic; P22 *= ic;
          alpha = 1 / (mu * vol);
        } else {
          // volume: C = det(F) - 1, dC/dF = cof(F)
          P00 = F11 * F22 - F21 * F12; P10 = F21 * F02 - F01 * F22; P20 = F01 * F12 - F11 * F02;
          P01 = F12 * F20 - F22 * F10; P11 = F22 * F00 - F02 * F20; P21 = F02 * F10 - F12 * F00;
          P02 = F10 * F21 - F20 * F11; P12 = F20 * F01 - F00 * F21; P22 = F00 * F11 - F10 * F01;
          const det = F00 * P00 + F10 * P10 + F20 * P20;
          C = det - 1;
          alpha = 1 / (mu * prm.lambdaRatio * vol);
        }
        // gradients g_j = column j of P * B^T  -> g_j = P[:,0]*B[j][0] + P[:,1]*B[j][1] + P[:,2]*B[j][2]
        g[3] = P00 * B00 + P01 * B01 + P02 * B02; g[4] = P10 * B00 + P11 * B01 + P12 * B02; g[5] = P20 * B00 + P21 * B01 + P22 * B02;
        g[6] = P00 * B10 + P01 * B11 + P02 * B12; g[7] = P10 * B10 + P11 * B11 + P12 * B12; g[8] = P20 * B10 + P21 * B11 + P22 * B12;
        g[9] = P00 * B20 + P01 * B21 + P02 * B22; g[10] = P10 * B20 + P11 * B21 + P12 * B22; g[11] = P20 * B20 + P21 * B21 + P22 * B22;
        g[0] = -(g[3] + g[6] + g[9]); g[1] = -(g[4] + g[7] + g[10]); g[2] = -(g[5] + g[8] + g[11]);
        const w0 = w[i0], w1 = w[i1], w2 = w[i2], w3 = w[i3];
        const den = w0 * (g[0] * g[0] + g[1] * g[1] + g[2] * g[2]) + w1 * (g[3] * g[3] + g[4] * g[4] + g[5] * g[5]) + w2 * (g[6] * g[6] + g[7] * g[7] + g[8] * g[8]) + w3 * (g[9] * g[9] + g[10] * g[10] + g[11] * g[11]) + alpha * ih2;
        if (den < 1e-12) continue;
        const dl = -C / den;
        x[3 * i0] += w0 * dl * g[0]; x[3 * i0 + 1] += w0 * dl * g[1]; x[3 * i0 + 2] += w0 * dl * g[2];
        x[3 * i1] += w1 * dl * g[3]; x[3 * i1 + 1] += w1 * dl * g[4]; x[3 * i1 + 2] += w1 * dl * g[5];
        x[3 * i2] += w2 * dl * g[6]; x[3 * i2 + 1] += w2 * dl * g[7]; x[3 * i2 + 2] += w2 * dl * g[8];
        x[3 * i3] += w3 * dl * g[9]; x[3 * i3 + 1] += w3 * dl * g[10]; x[3 * i3 + 2] += w3 * dl * g[11];
      }
    }
  }

  private solveGrab(gr: GrabState) {
    if (!gr.active) return;
    const x = this.x; const k = this.prm.grabStiffness;
    const c = Math.cos(gr.twist), s = Math.sin(gr.twist); const ax = gr.axis;
    for (let j = 0; j < gr.count; j++) {
      const i = gr.idx[j];
      let ox = gr.off[3 * j], oy = gr.off[3 * j + 1], oz = gr.off[3 * j + 2];
      // Rodrigues rotation of the offset about the twist axis
      const d = ox * ax[0] + oy * ax[1] + oz * ax[2];
      const cx = ax[1] * oz - ax[2] * oy, cy = ax[2] * ox - ax[0] * oz, cz = ax[0] * oy - ax[1] * ox;
      const rx = ox * c + cx * s + ax[0] * d * (1 - c), ry = oy * c + cy * s + ax[1] * d * (1 - c), rz = oz * c + cz * s + ax[2] * d * (1 - c);
      const kk = Math.min(1, k * gr.wt[j]);
      x[3 * i] += (gr.target[0] + rx - x[3 * i]) * kk;
      x[3 * i + 1] += (gr.target[1] + ry - x[3 * i + 1]) * kk;
      x[3 * i + 2] += (gr.target[2] + rz - x[3 * i + 2]) * kk;
    }
  }

  nodeRadius = 0.012;
  private solveContacts() {
    const { x, p } = this; const ms = this.prm.frictionStatic, mk = this.prm.frictionKinetic;
    const bd = this.beads, nb = this.beadCount, nr = this.nodeRadius;
    for (let i = 0; i < this.N; i++) {
      for (let b = 0; b < nb; b++) {
        const dx = x[3 * i] - bd[4 * b], dy = x[3 * i + 1] - bd[4 * b + 1], dz = x[3 * i + 2] - bd[4 * b + 2];
        const r = bd[4 * b + 3] + nr; const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < r * r && d2 > 1e-12) { const d = Math.sqrt(d2); const s = (r - d) / d * 0.5; x[3 * i] += dx * s; x[3 * i + 1] += dy * s; x[3 * i + 2] += dz * s; }
      }
      const y = x[3 * i + 1];
      if (y < 0) {
        const fs = this.a.fric[i];
        const pen = -y; x[3 * i + 1] = 0;
        const tx = x[3 * i] - p[3 * i], tz = x[3 * i + 2] - p[3 * i + 2];
        const tl = Math.hypot(tx, tz);
        if (tl < ms * fs * pen) { x[3 * i] = p[3 * i]; x[3 * i + 2] = p[3 * i + 2]; }
        else if (tl > 0) { const f = Math.min(mk * fs * pen / tl, 1); x[3 * i] -= tx * f; x[3 * i + 2] -= tz * f; }
      }
    }
  }

  /** per-node position + volume-weighted deformation gradient for smooth skinning */
  computeNodeData() {
    const { a, x } = this; const nd = this.nodeData; nd.fill(0);
    const tets = a.tets, B = a.B;
    const wsum = new Float32Array(this.N);
    for (let t = 0; t < this.T; t++) {
      const i0 = tets[4 * t], i1 = tets[4 * t + 1], i2 = tets[4 * t + 2], i3 = tets[4 * t + 3];
      const b = 9 * t; const vol = a.restVol[t];
      const e = [x[3 * i1] - x[3 * i0], x[3 * i1 + 1] - x[3 * i0 + 1], x[3 * i1 + 2] - x[3 * i0 + 2],
        x[3 * i2] - x[3 * i0], x[3 * i2 + 1] - x[3 * i0 + 1], x[3 * i2 + 2] - x[3 * i0 + 2],
        x[3 * i3] - x[3 * i0], x[3 * i3 + 1] - x[3 * i0 + 1], x[3 * i3 + 2] - x[3 * i0 + 2]];
      for (let col = 0; col < 3; col++) for (let r = 0; r < 3; r++) {
        const F = e[r] * B[b + col] + e[3 + r] * B[b + 3 + col] + e[6 + r] * B[b + 6 + col];
        for (let q = 0; q < 4; q++) nd[16 * tets[4 * t + q] + 4 + 4 * col + r] += F * vol;
      }
      for (let q = 0; q < 4; q++) wsum[tets[4 * t + q]] += vol;
    }
    for (let i = 0; i < this.N; i++) {
      const iw = 1 / wsum[i];
      nd[16 * i] = x[3 * i]; nd[16 * i + 1] = x[3 * i + 1]; nd[16 * i + 2] = x[3 * i + 2]; nd[16 * i + 3] = 1;
      for (let c = 4; c < 16; c++) nd[16 * i + c] *= iw;
    }
    return nd;
  }

  volume() {
    let v = 0; const { a, x } = this; const tets = a.tets;
    for (let t = 0; t < this.T; t++) {
      const i0 = 3 * tets[4 * t], i1 = 3 * tets[4 * t + 1], i2 = 3 * tets[4 * t + 2], i3 = 3 * tets[4 * t + 3];
      const ax = x[i1] - x[i0], ay = x[i1 + 1] - x[i0 + 1], az = x[i1 + 2] - x[i0 + 2];
      const bx = x[i2] - x[i0], by = x[i2 + 1] - x[i0 + 1], bz = x[i2 + 2] - x[i0 + 2];
      const cx = x[i3] - x[i0], cy = x[i3 + 1] - x[i0 + 1], cz = x[i3 + 2] - x[i0 + 2];
      v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    }
    return v;
  }
}
