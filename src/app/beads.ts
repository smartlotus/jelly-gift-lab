import { MAX_BEADS } from '../sim/params';

/** Beads of jelly bait: small spheres simulated on the CPU against the floor, each other and the jelly's nodes. */
export class Beads {
  pos = new Float32Array(MAX_BEADS * 4); // xyz r
  vel = new Float32Array(MAX_BEADS * 3);
  count = 0; next = 0;
  spawn(x: number, y: number, z: number, r: number) {
    let i: number;
    if (this.count < MAX_BEADS) i = this.count++; else { i = this.next; this.next = (this.next + 1) % MAX_BEADS; }
    this.pos.set([x, y, z, r], 4 * i); this.vel.set([0, 0, 0], 3 * i);
  }
  clear() { this.count = 0; this.next = 0; }
  step(dt: number, nodes: Float32Array | null, stride: number, nNodes: number, nodeR: number, g: number) {
    const n = 4; const h = Math.min(dt, 1 / 30) / n;
    const P = this.pos, V = this.vel;
    for (let s = 0; s < n; s++) {
      for (let i = 0; i < this.count; i++) {
        V[3 * i + 1] -= g * h;
        const damp = Math.exp(-0.8 * h);
        V[3 * i] *= damp; V[3 * i + 1] *= damp; V[3 * i + 2] *= damp;
        P[4 * i] += V[3 * i] * h; P[4 * i + 1] += V[3 * i + 1] * h; P[4 * i + 2] += V[3 * i + 2] * h;
        const r = P[4 * i + 3];
        // floor
        if (P[4 * i + 1] < r) {
          P[4 * i + 1] = r;
          if (V[3 * i + 1] < 0) V[3 * i + 1] *= -0.25;
          const f = Math.exp(-9 * h); V[3 * i] *= f; V[3 * i + 2] *= f;
        }
        // jelly nodes
        if (nodes) {
          let px = 0, py = 0, pz = 0, cnt = 0;
          for (let k = 0; k < nNodes; k++) {
            const o = k * stride;
            const dx = P[4 * i] - nodes[o], dy = P[4 * i + 1] - nodes[o + 1], dz = P[4 * i + 2] - nodes[o + 2];
            const rr = r + nodeR; const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < rr * rr && d2 > 1e-12) { const d = Math.sqrt(d2); const pen = rr - d; px += dx / d * pen; py += dy / d * pen; pz += dz / d * pen; cnt++; }
          }
          if (cnt) {
            const k = 0.5 / Math.sqrt(cnt);
            P[4 * i] += px * k; P[4 * i + 1] += py * k; P[4 * i + 2] += pz * k;
            const nl = Math.hypot(px, py, pz) || 1; const nx = px / nl, ny = py / nl, nz = pz / nl;
            const vn = V[3 * i] * nx + V[3 * i + 1] * ny + V[3 * i + 2] * nz;
            if (vn < 0) { V[3 * i] -= vn * nx * 1.2; V[3 * i + 1] -= vn * ny * 1.2; V[3 * i + 2] -= vn * nz * 1.2; }
            const f = Math.exp(-5 * h); V[3 * i] *= f; V[3 * i + 2] *= f;
          }
        }
      }
      // bead-bead
      for (let i = 0; i < this.count; i++) for (let j = i + 1; j < this.count; j++) {
        const dx = P[4 * i] - P[4 * j], dy = P[4 * i + 1] - P[4 * j + 1], dz = P[4 * i + 2] - P[4 * j + 2];
        const rr = P[4 * i + 3] + P[4 * j + 3]; const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < rr * rr && d2 > 1e-12) {
          const d = Math.sqrt(d2); const s = (rr - d) / d * 0.5;
          P[4 * i] += dx * s; P[4 * i + 1] += dy * s; P[4 * i + 2] += dz * s;
          P[4 * j] -= dx * s; P[4 * j + 1] -= dy * s; P[4 * j + 2] -= dz * s;
        }
      }
    }
  }
}
