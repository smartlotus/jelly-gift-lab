// Diagnose skinning quality: run the CPU sim briefly then skin the outer surface on the CPU and report stretched edges.
import { readFileSync } from 'fs';
import { decodeAsset } from '../src/sim/mesh';
import { CpuSolver, makeGrab } from '../src/sim/cpu';
import { DEFAULT_PARAMS } from '../src/sim/params';
import { sharkActuation } from '../src/characters/shark/actuation';
const lvl = process.argv[2] || 'lo'; const mode = process.argv[3] || 'full';
const buf = readFileSync(`public/assets/shark/${lvl}.bin`);
const a = decodeAsset(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), sharkActuation, 1);
const s = new CpuSolver(a, DEFAULT_PARAMS); const g = makeGrab(64); const act = new Float32Array(2);
for (let f = 0; f < 60; f++) { sharkActuation.activation(f / 60, act); s.step(1 / 60, act, g); }
const nd = s.computeNodeData();
const S = a.s; const qmin = a.meta.qmin, qext = a.meta.qext;
const nv = S.o_pos.length / 4; const P = new Float32Array(nv * 3), X = new Float32Array(nv * 3);
for (let v = 0; v < nv; v++) {
  for (let c = 0; c < 3; c++) X[3 * v + c] = qmin[c] + S.o_pos[4 * v + c] / 65535 * qext[c];
  let w = [0, 1, 2, 3].map(q => S.o_wts[4 * v + q] / 32767 * 2);
  if (mode === 'clamp') { w = w.map(x => Math.max(x, 0)); const sm = w.reduce((p, c) => p + c, 0); w = w.map(x => x / sm); }
  for (let q = 0; q < 4; q++) {
    const n = S.o_nodes[4 * v + q]; const o = 16 * n;
    const dx = X[3 * v] - a.nodes[3 * n], dy = X[3 * v + 1] - a.nodes[3 * n + 1], dz = X[3 * v + 2] - a.nodes[3 * n + 2];
    for (let r = 0; r < 3; r++) P[3 * v + r] += w[q] * (nd[o + r] + nd[o + 4 + r] * dx + nd[o + 8 + r] * dy + nd[o + 12 + r] * dz);
  }
}
const idx = S.o_idx; let worst: [number, number, number][] = [];
for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) {
  const i = idx[t + e], j = idx[t + (e + 1) % 3];
  const r = Math.hypot(X[3 * i] - X[3 * j], X[3 * i + 1] - X[3 * j + 1], X[3 * i + 2] - X[3 * j + 2]);
  const d = Math.hypot(P[3 * i] - P[3 * j], P[3 * i + 1] - P[3 * j + 1], P[3 * i + 2] - P[3 * j + 2]);
  worst.push([d / Math.max(r, 1e-6), i, j]);
}
worst.sort((p, q) => q[0] - p[0]);
console.log('max edge stretch', worst.slice(0, 8).map(w => `${w[0].toFixed(1)} @ (${[...X.slice(3 * w[1], 3 * w[1] + 3)].map(x => x.toFixed(3))}) w=${[0,1,2,3].map(q=>(S.o_wts[4*w[1]+q]/32767*2).toFixed(2))}`).join('\n'));
console.log('edges > 3x:', worst.filter(w => w[0] > 3).length, ' > 1.6x:', worst.filter(w => w[0] > 1.6).length, 'of', worst.length);
