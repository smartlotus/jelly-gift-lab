import { unpackSections } from '../core/pack';
import type { Actuation } from '../core/character';

/** Decoded character asset + derived per-tet data shared by both solvers. */
export interface TetAsset {
  meta: any;
  nodes: Float32Array;      // rest positions N*3
  tets: Uint32Array;        // T*4 (sorted by colour)
  colourOffsets: Uint32Array;
  finW: Float32Array;
  B: Float32Array;          // inverse rest matrices T*9 (row-major)
  restVol: Float32Array;
  invMass: Float32Array;
  mass: Float32Array;
  muscle: Float32Array;     // T*channels
  stiff: Float32Array;      // per-tet stiffness multiplier
  fric: Float32Array;       // per-node friction multiplier
  grav: Float32Array;       // per-node gravity multiplier
  channels: number;
  adjOffsets: Uint32Array;  // node -> tets CSR
  adjTets: Uint32Array;
  s: Record<string, any>;   // raw sections (surfaces etc.)
}

export function decodeAsset(buf: ArrayBuffer, act: Actuation, density: number): TetAsset {
  const { meta, s } = unpackSections(buf);
  const nodes: Float32Array = s.nodes, tets: Uint32Array = s.tets;
  const N = nodes.length / 3, T = tets.length / 4;
  const B = new Float32Array(T * 9), restVol = new Float32Array(T), mass = new Float32Array(N);
  const muscle = new Float32Array(T * act.channels);
  const stiff = new Float32Array(T);
  const w = new Float32Array(act.channels);
  for (let t = 0; t < T; t++) {
    const a = tets[4 * t] * 3;
    const m: number[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m.push(nodes[tets[4 * t + 1 + c] * 3 + r] - nodes[a + r]);
    const [a0, a1, a2, b0, b1, b2, c0, c1, c2] = m;
    const det = a0 * (b1 * c2 - b2 * c1) - a1 * (b0 * c2 - b2 * c0) + a2 * (b0 * c1 - b1 * c0);
    const id = 1 / det;
    B.set([(b1 * c2 - b2 * c1) * id, (a2 * c1 - a1 * c2) * id, (a1 * b2 - a2 * b1) * id,
      (b2 * c0 - b0 * c2) * id, (a0 * c2 - a2 * c0) * id, (a2 * b0 - a0 * b2) * id,
      (b0 * c1 - b1 * c0) * id, (a1 * c0 - a0 * c1) * id, (a0 * b1 - a1 * b0) * id], 9 * t);
    restVol[t] = det / 6;
    for (let q = 0; q < 4; q++) mass[tets[4 * t + q]] += det / 6 / 4 * density;
    let cx = 0, cy = 0, cz = 0;
    for (let q = 0; q < 4; q++) { const v = tets[4 * t + q] * 3; cx += nodes[v] / 4; cy += nodes[v + 1] / 4; cz += nodes[v + 2] / 4; }
    act.weights(cx, cy, cz, w);
    muscle.set(w, t * act.channels);
    stiff[t] = act.stiffness ? act.stiffness(cx, cy, cz) : 1;
  }
  const fric = new Float32Array(N);
  const grav = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    fric[i] = act.friction ? act.friction(nodes[3 * i], nodes[3 * i + 1], nodes[3 * i + 2]) : 1;
    grav[i] = act.gravity ? act.gravity(nodes[3 * i], nodes[3 * i + 1], nodes[3 * i + 2]) : 1;
  }
  const invMass = new Float32Array(N);
  for (let i = 0; i < N; i++) invMass[i] = mass[i] > 0 ? 1 / mass[i] : 0;
  const cnt = new Uint32Array(N + 1);
  for (let t = 0; t < T * 4; t++) cnt[tets[t] + 1]++;
  for (let i = 0; i < N; i++) cnt[i + 1] += cnt[i];
  const fill = cnt.slice(0, N); const adj = new Uint32Array(T * 4);
  for (let t = 0; t < T; t++) for (let q = 0; q < 4; q++) adj[fill[tets[4 * t + q]]++] = t;
  return { meta, nodes, tets, colourOffsets: s.colourOffsets, finW: s.finW, B, restVol, invMass, mass, muscle, stiff, fric, grav, channels: act.channels, adjOffsets: cnt, adjTets: adj, s };
}
