// Build-time bake: SDF -> surface meshes (surface nets + projection) + snapped-hex-lattice tet mesh,
// barycentric embedding, graph colouring, bubbles, landmarks.  Output: public/assets/<id>/<level>.bin
import { mkdirSync, writeFileSync } from 'fs';
import { packSections } from '../src/core/pack';
import type { CharacterShape } from '../src/core/character';
import { shark } from '../src/characters/shark/shape';
import { pig } from '../src/characters/pig/shape';
import { cat } from '../src/characters/cat/shape';
import type { CharacterShape } from '../src/core/character';
const SHAPES: Record<string, CharacterShape> = { shark, pig, cat };

type F = (x: number, y: number, z: number) => number;

function grad(f: F, x: number, y: number, z: number, e: number): [number, number, number] {
  const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
  const l = Math.hypot(gx, gy, gz) || 1;
  return [gx / l, gy / l, gz / l];
}

// ---------------------------------------------------------------- surface nets ----
function surfaceNets(f: F, bmin: number[], bmax: number[], vs: number) {
  const nx = Math.ceil((bmax[0] - bmin[0]) / vs) + 2, ny = Math.ceil((bmax[1] - bmin[1]) / vs) + 2, nz = Math.ceil((bmax[2] - bmin[2]) / vs) + 2;
  const ox = bmin[0] - vs, oy = bmin[1] - vs, oz = bmin[2] - vs;
  const N = nx * ny * nz;
  const val = new Float32Array(N);
  const B = 4; // narrow band via coarse blocks
  const idx = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  let evals = 0;
  for (let k0 = 0; k0 < nz; k0 += B) for (let j0 = 0; j0 < ny; j0 += B) for (let i0 = 0; i0 < nx; i0 += B) {
    const cx = ox + (i0 + B / 2) * vs, cy = oy + (j0 + B / 2) * vs, cz = oz + (k0 + B / 2) * vs;
    const dc = f(cx, cy, cz); evals++;
    const far = Math.abs(dc) > B * vs * 1.2;
    for (let k = k0; k < Math.min(k0 + B + 1, nz); k++) for (let j = j0; j < Math.min(j0 + B + 1, ny); j++) for (let i = i0; i < Math.min(i0 + B + 1, nx); i++) {
      if (far) { val[idx(i, j, k)] = dc; continue; }
      val[idx(i, j, k)] = f(ox + i * vs, oy + j * vs, oz + k * vs); evals++;
    }
  }
  const vid = new Int32Array(N).fill(-1);
  const pos: number[] = [];
  const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float64Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { cv[c] = val[idx(i + corner[c][0], j + corner[c][1], k + corner[c][2])]; if (cv[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      if ((cv[a] < 0) === (cv[b] < 0)) continue;
      const t = cv[a] / (cv[a] - cv[b]);
      sx += corner[a][0] + t * (corner[b][0] - corner[a][0]);
      sy += corner[a][1] + t * (corner[b][1] - corner[a][1]);
      sz += corner[a][2] + t * (corner[b][2] - corner[a][2]);
      n++;
    }
    let px = ox + (i + sx / n) * vs, py = oy + (j + sy / n) * vs, pz = oz + (k + sz / n) * vs;
    // project onto the iso-surface (bounded so we stay in the cell neighbourhood)
    for (let it = 0; it < 3; it++) {
      const d = f(px, py, pz); const g = grad(f, px, py, pz, vs * 0.25);
      const s = Math.max(-vs, Math.min(vs, d));
      px -= g[0] * s; py -= g[1] * s; pz -= g[2] * s;
    }
    vid[idx(i, j, k)] = pos.length / 3;
    pos.push(px, py, pz);
  }
  const tris: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) { const t = b; b = d; d = t; }
    // split along shorter diagonal
    const dac = dist2(pos, a, c), dbd = dist2(pos, b, d);
    if (dac < dbd) tris.push(a, b, c, a, c, d); else tris.push(a, b, d, b, c, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = val[idx(i, j, k)];
    const in0 = v0 < 0;
    // x-edge (i,j,k)-(i+1,j,k): cells sharing it: (i,j-1,k-1),(i,j,k-1),(i,j,k),(i,j-1,k)
    if (i < nx - 1 && in0 !== (val[idx(i + 1, j, k)] < 0))
      quad(vid[idx(i, j - 1, k - 1)], vid[idx(i, j, k - 1)], vid[idx(i, j, k)], vid[idx(i, j - 1, k)], !in0);
    if (j < ny - 1 && in0 !== (val[idx(i, j + 1, k)] < 0))
      quad(vid[idx(i - 1, j, k - 1)], vid[idx(i - 1, j, k)], vid[idx(i, j, k)], vid[idx(i, j, k - 1)], !in0);
    if (k < nz - 1 && in0 !== (val[idx(i, j, k + 1)] < 0))
      quad(vid[idx(i - 1, j - 1, k)], vid[idx(i, j - 1, k)], vid[idx(i, j, k)], vid[idx(i - 1, j, k)], !in0);
  }
  return { pos: new Float32Array(pos), tris: new Uint32Array(tris), evals };
}
function dist2(p: number[], a: number, b: number) {
  const dx = p[3 * a] - p[3 * b], dy = p[3 * a + 1] - p[3 * b + 1], dz = p[3 * a + 2] - p[3 * b + 2];
  return dx * dx + dy * dy + dz * dz;
}
function meshVolume(pos: Float32Array, tris: Uint32Array) {
  let v = 0;
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t] * 3, b = tris[t + 1] * 3, c = tris[t + 2] * 3;
    v += (pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c]) + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c])) / 6;
  }
  return v;
}
/** keep the largest connected component (removes specks) */
function largestComponent(pos: Float32Array, tris: Uint32Array) {
  const n = pos.length / 3; const par = new Int32Array(n).map((_, i) => i);
  const find = (a: number): number => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let t = 0; t < tris.length; t += 3) { const a = find(tris[t]), b = find(tris[t + 1]), c = find(tris[t + 2]); par[b] = a; par[find(c)] = a; }
  const cnt = new Map<number, number>();
  for (let t = 0; t < tris.length; t += 3) { const r = find(tris[t]); cnt.set(r, (cnt.get(r) || 0) + 1); }
  const comps = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
  const keepRoots = new Set(comps.filter(c => c[1] > comps[0][1] * 0.002).map(c => c[0]));
  const remap = new Int32Array(n).fill(-1); const np: number[] = []; const nt: number[] = [];
  for (let t = 0; t < tris.length; t += 3) {
    if (!keepRoots.has(find(tris[t]))) continue;
    for (let q = 0; q < 3; q++) { const v = tris[t + q]; if (remap[v] < 0) { remap[v] = np.length / 3; np.push(pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]); } nt.push(remap[v]); }
  }
  return { pos: new Float32Array(np), tris: new Uint32Array(nt), comps: comps.length };
}

// ---------------------------------------------------------------- tet lattice ----
const KUHN = [[0, 1, 3, 7], [0, 1, 5, 7], [0, 2, 3, 7], [0, 2, 6, 7], [0, 4, 5, 7], [0, 4, 6, 7]];
function tetVol(p: Float64Array | Float32Array, a: number, b: number, c: number, d: number) {
  const ax = p[3 * b] - p[3 * a], ay = p[3 * b + 1] - p[3 * a + 1], az = p[3 * b + 2] - p[3 * a + 2];
  const bx = p[3 * c] - p[3 * a], by = p[3 * c + 1] - p[3 * a + 1], bz = p[3 * c + 2] - p[3 * a + 2];
  const cx = p[3 * d] - p[3 * a], cy = p[3 * d + 1] - p[3 * a + 1], cz = p[3 * d + 2] - p[3 * a + 2];
  return (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
}
function buildTets(ch: CharacterShape, h: number) {
  const f = ch.outer;
  const bmin = ch.bounds.min, bmax = ch.bounds.max;
  const nx = Math.ceil((bmax[0] - bmin[0]) / h) + 2, ny = Math.ceil((bmax[1] - bmin[1]) / h) + 2, nz = Math.ceil((bmax[2] - bmin[2]) / h) + 2;
  // lattice origin: floor plane aligned so a node row sits exactly at y = 0
  const ox = bmin[0] - h, oy = Math.floor((bmin[1]) / h) * h - 0 * h, oz = -Math.ceil(nz / 2) * h;
  const NZ = Math.ceil(nz / 2) * 2 + 1;
  const cellKeep = new Uint8Array(nx * ny * NZ);
  const cidx = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  for (let k = 0; k < NZ - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const cx = ox + (i + 0.5) * h, cy = oy + (j + 0.5) * h, cz = oz + (k + 0.5) * h;
    const dc = f(cx, cy, cz);
    if (dc > h * 1.0) continue;
    let keep = dc < h * 0.30;
    if (!keep) {
      // sample a 4x4x4 sub-lattice: catch thin fins passing through the cell
      let inside = 0;
      for (let c = 0; c < 64 && inside < 2; c++) {
        const a = (c & 3) / 3, b = ((c >> 2) & 3) / 3, e = (c >> 4) / 3;
        if (f(ox + (i + 0.08 + 0.84 * a) * h, oy + (j + 0.08 + 0.84 * b) * h, oz + (k + 0.08 + 0.84 * e) * h) < 0) inside++;
      }
      keep = inside >= 2;
    }
    if (cy - 0.5 * h < -1e-6) keep = false; // nothing below the floor
    if (keep) cellKeep[cidx(i, j, k)] = 1;
  }
  // nodes
  const nodeId = new Int32Array((nx + 1) * (ny + 1) * (NZ + 1)).fill(-1);
  const nidx = (i: number, j: number, k: number) => i + (nx + 1) * (j + (ny + 1) * k);
  const P: number[] = []; const lat: number[] = [];
  const tets: number[] = [];
  for (let k = 0; k < NZ - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    if (!cellKeep[cidx(i, j, k)]) continue;
    const cn: number[] = [];
    for (let c = 0; c < 8; c++) {
      const ii = i + (c & 1), jj = j + ((c >> 1) & 1), kk = k + ((c >> 2) & 1);
      const id = nidx(ii, jj, kk);
      if (nodeId[id] < 0) { nodeId[id] = P.length / 3; P.push(ox + ii * h, oy + jj * h, oz + kk * h); lat.push(ii, jj, kk); }
      cn.push(nodeId[id]);
    }
    for (const t of KUHN) tets.push(cn[t[0]], cn[t[1]], cn[t[2]], cn[t[3]]);
  }
  const nNodes = P.length / 3;
  const pos = new Float64Array(P);
  // orientation
  for (let t = 0; t < tets.length; t += 4) if (tetVol(pos, tets[t], tets[t + 1], tets[t + 2], tets[t + 3]) < 0) { const s = tets[t + 2]; tets[t + 2] = tets[t + 3]; tets[t + 3] = s; }
  // boundary nodes = touched by a missing cell
  const boundary = new Uint8Array(nNodes);
  for (let n = 0; n < nNodes; n++) {
    const i = lat[3 * n], j = lat[3 * n + 1], k = lat[3 * n + 2];
    for (let c = 0; c < 8 && !boundary[n]; c++) {
      const ci = i - (c & 1), cj = j - ((c >> 1) & 1), ck = k - ((c >> 2) & 1);
      if (ci < 0 || cj < 0 || ck < 0 || !cellKeep[cidx(ci, cj, ck)]) boundary[n] = 1;
    }
  }
  // snap boundary nodes onto the surface (never below the floor)
  const disp = new Float64Array(nNodes * 3);
  for (let n = 0; n < nNodes; n++) {
    if (!boundary[n]) continue;
    const x = pos[3 * n], y = pos[3 * n + 1], z = pos[3 * n + 2];
    const d = f(x, y, z); const g = grad(f, x, y, z, h * 0.05);
    const s = Math.max(-0.5 * h, Math.min(0.5 * h, d));
    disp[3 * n] = -g[0] * s; disp[3 * n + 1] = -g[1] * s; disp[3 * n + 2] = -g[2] * s;
    if (y + disp[3 * n + 1] < 0) disp[3 * n + 1] = -y;
    if (Math.abs(y) < 1e-9) disp[3 * n + 1] = 0; // floor-row nodes stay on the floor
  }
  const rv = h * h * h / 6;
  const scale = new Float64Array(nNodes).fill(1);
  const cur = new Float64Array(nNodes * 3);
  for (let iter = 0; iter < 12; iter++) {
    for (let n = 0; n < nNodes * 3; n++) cur[n] = pos[n] + disp[n] * scale[Math.floor(n / 3)];
    let bad = 0;
    for (let t = 0; t < tets.length; t += 4) {
      const v = tetVol(cur, tets[t], tets[t + 1], tets[t + 2], tets[t + 3]);
      if (v < rv * 0.3) { bad++; for (let q = 0; q < 4; q++) scale[tets[t + q]] *= 0.6; }
    }
    if (!bad) break;
  }
  for (let n = 0; n < nNodes * 3; n++) pos[n] = pos[n] + disp[n] * scale[Math.floor(n / 3)];
  // drop degenerate leftovers
  const T: number[] = [];
  for (let t = 0; t < tets.length; t += 4) if (tetVol(pos, tets[t], tets[t + 1], tets[t + 2], tets[t + 3]) > rv * 0.05) T.push(tets[t], tets[t + 1], tets[t + 2], tets[t + 3]);
  // prune dangling tets (nodes owned by <= 2 tets are flimsy corners that flap and invert)
  for (let pass = 0; pass < 6; pass++) {
    const adj = new Uint16Array(nNodes);
    for (let t = 0; t < T.length; t++) adj[T[t]]++;
    const keep: number[] = []; let dropped = 0;
    for (let t = 0; t < T.length; t += 4) {
      if (adj[T[t]] <= 2 || adj[T[t + 1]] <= 2 || adj[T[t + 2]] <= 2 || adj[T[t + 3]] <= 2) { dropped++; continue; }
      keep.push(T[t], T[t + 1], T[t + 2], T[t + 3]);
    }
    T.length = 0; T.push(...keep);
    if (!dropped) break;
  }
  // keep largest connected component of tets
  const par = new Int32Array(nNodes).map((_, i) => i);
  const find = (a: number): number => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let t = 0; t < T.length; t += 4) for (let q = 1; q < 4; q++) { const a = find(T[t]), b = find(T[t + q]); if (a !== b) par[b] = a; }
  const cnt = new Map<number, number>(); for (let t = 0; t < T.length; t += 4) { const r = find(T[t]); cnt.set(r, (cnt.get(r) || 0) + 1); }
  const main = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const remap = new Int32Array(nNodes).fill(-1); const NP: number[] = []; const NT: number[] = [];
  for (let t = 0; t < T.length; t += 4) {
    if (find(T[t]) !== main) continue;
    for (let q = 0; q < 4; q++) { const v = T[t + q]; if (remap[v] < 0) { remap[v] = NP.length / 3; NP.push(pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]); } NT.push(remap[v]); }
  }
  return { nodes: new Float32Array(NP), tets: new Uint32Array(NT), comps: cnt.size };
}

function colourTets(tets: Uint32Array, nNodes: number) {
  const nT = tets.length / 4;
  const used = new Array<Set<number>>(nNodes); for (let i = 0; i < nNodes; i++) used[i] = new Set();
  const col = new Int32Array(nT);
  let maxC = 0;
  for (let t = 0; t < nT; t++) {
    let c = 0;
    while (used[tets[4 * t]].has(c) || used[tets[4 * t + 1]].has(c) || used[tets[4 * t + 2]].has(c) || used[tets[4 * t + 3]].has(c)) c++;
    col[t] = c; maxC = Math.max(maxC, c + 1);
    for (let q = 0; q < 4; q++) used[tets[4 * t + q]].add(c);
  }
  // sort by colour
  const order = [...Array(nT).keys()].sort((a, b) => col[a] - col[b]);
  const sorted = new Uint32Array(tets.length);
  const offsets = new Uint32Array(maxC + 1);
  order.forEach((t, i) => { for (let q = 0; q < 4; q++) sorted[4 * i + q] = tets[4 * t + q]; offsets[col[t] + 1]++; });
  for (let c = 0; c < maxC; c++) offsets[c + 1] += offsets[c];
  return { tets: sorted, offsets, colours: maxC };
}

// ---------------------------------------------------------------- embedding ----
function makeEmbedder(nodes: Float32Array, tets: Uint32Array, h: number) {
  const nT = tets.length / 4;
  const inv = new Float64Array(nT * 9);
  for (let t = 0; t < nT; t++) {
    const a = tets[4 * t] * 3;
    const m = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let c = 0; c < 3; c++) { const b = tets[4 * t + 1 + c] * 3; m[c] = nodes[b] - nodes[a]; m[3 + c] = nodes[b + 1] - nodes[a + 1]; m[6 + c] = nodes[b + 2] - nodes[a + 2]; }
    const [a0, a1, a2, b0, b1, b2, c0, c1, c2] = m;
    const det = a0 * (b1 * c2 - b2 * c1) - a1 * (b0 * c2 - b2 * c0) + a2 * (b0 * c1 - b1 * c0);
    const id = 1 / det;
    inv.set([(b1 * c2 - b2 * c1) * id, (a2 * c1 - a1 * c2) * id, (a1 * b2 - a2 * b1) * id,
      (b2 * c0 - b0 * c2) * id, (a0 * c2 - a2 * c0) * id, (a2 * b0 - a0 * b2) * id,
      (b0 * c1 - b1 * c0) * id, (a1 * c0 - a0 * c1) * id, (a0 * b1 - a1 * b0) * id], t * 9);
  }
  const cs = h; const grid = new Map<string, number[]>();
  const key = (i: number, j: number, k: number) => i + ',' + j + ',' + k;
  for (let t = 0; t < nT; t++) {
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let q = 0; q < 4; q++) for (let c = 0; c < 3; c++) { const v = nodes[tets[4 * t + q] * 3 + c]; mn[c] = Math.min(mn[c], v); mx[c] = Math.max(mx[c], v); }
    for (let i = Math.floor(mn[0] / cs); i <= Math.floor(mx[0] / cs); i++) for (let j = Math.floor(mn[1] / cs); j <= Math.floor(mx[1] / cs); j++) for (let k = Math.floor(mn[2] / cs); k <= Math.floor(mx[2] / cs); k++) {
      const kk = key(i, j, k); let l = grid.get(kk); if (!l) grid.set(kk, l = []); l.push(t);
    }
  }
  const bary = (t: number, x: number, y: number, z: number, out: number[]) => {
    const a = tets[4 * t] * 3; const dx = x - nodes[a], dy = y - nodes[a + 1], dz = z - nodes[a + 2];
    const m = t * 9;
    const b1 = inv[m] * dx + inv[m + 1] * dy + inv[m + 2] * dz;
    const b2 = inv[m + 3] * dx + inv[m + 4] * dy + inv[m + 5] * dz;
    const b3 = inv[m + 6] * dx + inv[m + 7] * dy + inv[m + 8] * dz;
    out[0] = 1 - b1 - b2 - b3; out[1] = b1; out[2] = b2; out[3] = b3;
    return Math.min(out[0], b1, b2, b3);
  };
  const tmp = [0, 0, 0, 0];
  return (x: number, y: number, z: number) => {
    const ci = Math.floor(x / cs), cj = Math.floor(y / cs), ck = Math.floor(z / cs);
    let best = -1, bestScore = -1e9; let bw = [0, 0, 0, 0];
    for (let r = 0; r <= 4 && (best < 0 || (r <= 1)); r++) {
      for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) for (let k = ck - r; k <= ck + r; k++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj), Math.abs(k - ck)) !== r) continue;
        const l = grid.get(key(i, j, k)); if (!l) continue;
        for (const t of l) { const s = bary(t, x, y, z, tmp); if (s > bestScore) { bestScore = s; best = t; bw = tmp.slice(); } }
      }
      if (bestScore >= -1e-6) break;
    }
    if (best < 0) throw new Error('no tet near ' + x + ',' + y + ',' + z);
    return { t: best, w: bw, score: bestScore };
  };
}

/** Smooth (continuous) node embedding: 4 nearest mutually-visible nodes, weight -> 0 at the 5th neighbour's distance. */
function makeNodeEmbedder(nodes: Float32Array, h: number, f: F) {
  const N = nodes.length / 3; const cs = h; const grid = new Map<string, number[]>();
  const key = (i: number, j: number, k: number) => i + ',' + j + ',' + k;
  for (let n = 0; n < N; n++) { const kk = key(Math.floor(nodes[3 * n] / cs), Math.floor(nodes[3 * n + 1] / cs), Math.floor(nodes[3 * n + 2] / cs)); let l = grid.get(kk); if (!l) grid.set(kk, l = []); l.push(n); }
  const visible = (x: number, y: number, z: number, n: number) => {
    for (let q = 1; q < 6; q++) { const t = q / 6; const px = x + (nodes[3 * n] - x) * t, py = y + (nodes[3 * n + 1] - y) * t, pz = z + (nodes[3 * n + 2] - z) * t; if (f(px, py, pz) > 0.35 * h) return false; }
    return true;
  };
  return (x: number, y: number, z: number) => {
    const ci = Math.floor(x / cs), cj = Math.floor(y / cs), ck = Math.floor(z / cs);
    let cand: [number, number][] = [];
    for (let r = 1; r <= 4 && cand.length < 5; r++) {
      cand = [];
      for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) for (let k = ck - r; k <= ck + r; k++) {
        const l = grid.get(key(i, j, k)); if (!l) continue;
        for (const n of l) cand.push([Math.hypot(nodes[3 * n] - x, nodes[3 * n + 1] - y, nodes[3 * n + 2] - z), n]);
      }
      cand.sort((a, b) => a[0] - b[0]);
      cand = cand.filter(c => visible(x, y, z, c[1])).slice(0, 5);
    }
    if (cand.length < 2) throw new Error('embed: no nodes near ' + [x, y, z]);
    const d5 = cand.length >= 5 ? cand[4][0] : cand[cand.length - 1][0] * 1.5 + 1e-4;
    const ids = [0, 0, 0, 0], w = [0, 0, 0, 0]; let sum = 0;
    for (let q = 0; q < Math.min(4, cand.length); q++) { const u = cand[q][0] / d5; const wq = Math.pow(Math.max(0, 1 - u * u), 2) + 1e-6; ids[q] = cand[q][1]; w[q] = wq; sum += wq; }
    for (let q = 0; q < 4; q++) w[q] /= sum;
    return { ids, w };
  };
}

// ---------------------------------------------------------------- pack surfaces ----
function packSurface(ch: CharacterShape, f: F, mesh: { pos: Float32Array; tris: Uint32Array }, embed: ReturnType<typeof makeNodeEmbedder>, qb: { min: number[]; ext: number[] }, vs: number) {
  const n = mesh.pos.length / 3;
  const qpos = new Uint16Array(n * 4), qnrm = new Int16Array(n * 4), attr = new Uint8Array(n * 4), nodes = new Uint16Array(n * 4), wts = new Int16Array(n * 4);
  const a = new Float32Array(4);
  let worst = 0;
  for (let v = 0; v < n; v++) {
    const x = mesh.pos[3 * v], y = mesh.pos[3 * v + 1], z = mesh.pos[3 * v + 2];
    for (let c = 0; c < 3; c++) qpos[4 * v + c] = Math.round(Math.max(0, Math.min(1, (mesh.pos[3 * v + c] - qb.min[c]) / qb.ext[c])) * 65535);
    const g = grad(f, x, y, z, vs * 0.35);
    for (let c = 0; c < 3; c++) qnrm[4 * v + c] = Math.round(g[c] * 32767);
    ch.attrs(x, y, z, a);
    attr[4 * v] = Math.round(Math.max(0, Math.min(1, (a[0] + 2) / 4)) * 255);
    for (let c = 1; c < 4; c++) attr[4 * v + c] = Math.round(Math.max(0, Math.min(1, a[c])) * 255);
    const e = embed(x, y, z);
    for (let q = 0; q < 4; q++) { nodes[4 * v + q] = e.ids[q]; wts[4 * v + q] = Math.round(Math.max(-1, Math.min(1, e.w[q] / 2)) * 32767); }
  }
  return { qpos, qnrm, attr, nodes, wts, idx: mesh.tris, worst };
}

// ---------------------------------------------------------------- main ----
function mulberry(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function bake(ch: CharacterShape, level: string, opts: { vsOuter: number; vsInner: number; h: number; bubbles: number }) {
  const t0 = Date.now();
  const b = ch.bounds;
  let outer = surfaceNets(ch.outer, b.min, b.max, opts.vsOuter);
  const o2 = largestComponent(outer.pos, outer.tris);
  const inner0 = surfaceNets(ch.inner, b.min, b.max, opts.vsInner);
  const surfVol = meshVolume(o2.pos, o2.tris);
  const innerVol = meshVolume(inner0.pos, inner0.tris);
  const tm = buildTets(ch, opts.h);
  const col = colourTets(tm.tets, tm.nodes.length / 3);
  let tetVolSum = 0;
  for (let t = 0; t < col.tets.length; t += 4) tetVolSum += tetVol(tm.nodes, col.tets[t], col.tets[t + 1], col.tets[t + 2], col.tets[t + 3]);
  const embed = makeEmbedder(tm.nodes, col.tets, opts.h);
  const qb = { min: b.min as number[], ext: [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]] };
  const nemb = makeNodeEmbedder(tm.nodes, opts.h, ch.outer);
  const so = packSurface(ch, ch.outer, o2, nemb, qb, opts.vsOuter);
  const si = packSurface(ch, ch.inner, inner0, nemb, qb, opts.vsInner);
  // bubbles
  const rnd = mulberry(7);
  const bub: number[] = []; const bubN: number[] = []; const bubW: number[] = [];
  let guard = 0;
  while (bub.length / 4 < opts.bubbles && guard++ < 400000) {
    const x = b.min[0] + rnd() * (b.max[0] - b.min[0]), y = b.min[1] + rnd() * (b.max[1] - b.min[1]), z = b.min[2] + rnd() * (b.max[2] - b.min[2]);
    const r = 0.0014 + 0.0062 * Math.pow(rnd(), 3.2);
    if (!ch.bubbleOk(x, y, z) || ch.outer(x, y, z) > -(r + 0.004) || ch.inner(x, y, z) < r + 0.002) continue;
    let ok = true; for (let q = 0; q < bub.length; q += 4) if (Math.hypot(bub[q] - x, bub[q + 1] - y, bub[q + 2] - z) < bub[q + 3] + r + 0.004) { ok = false; break; }
    if (!ok) continue;
    const e = embed(x, y, z);
    bub.push(x, y, z, r); for (let q = 0; q < 4; q++) { bubN.push(col.tets[4 * e.t + q]); bubW.push(e.w[q]); }
  }
  // landmarks (fork refined by marching out of the tail notch)
  const lm: Record<string, number[]> = { ...ch.landmarks } as any;
  if (ch.id === 'shark') {
    let fx = -0.37; const fy = 0.079; while (fx > -0.6 && ch.outer(fx, fy, 0) < 0) fx -= 0.0005;
    lm.fork = [fx + 0.002, fy, 0];
  }
  const lmNames = Object.keys(lm);
  const lmN = new Uint16Array(lmNames.length * 4), lmW = new Float32Array(lmNames.length * 4), lmP = new Float32Array(lmNames.length * 4);
  lmNames.forEach((k, i) => { const p = lm[k]; const e = embed(p[0], p[1], p[2]); for (let q = 0; q < 4; q++) { lmN[4 * i + q] = col.tets[4 * e.t + q]; lmW[4 * i + q] = e.w[q]; } lmP.set([p[0], p[1], p[2], 0], 4 * i); });
  // per-tet fin weight (firmer fins)
  const nT = col.tets.length / 4; const finW = new Float32Array(nT);
  for (let t = 0; t < nT; t++) {
    let cx = 0, cy = 0, cz = 0; for (let q = 0; q < 4; q++) { const v = col.tets[4 * t + q] * 3; cx += tm.nodes[v] / 4; cy += tm.nodes[v + 1] / 4; cz += tm.nodes[v + 2] / 4; }
    const d = ch.core(cx, cy, cz);
    finW[t] = Math.max(0, Math.min(1, (d - 0.004) / 0.03));
  }
  const meta = {
    id: ch.id, level, unitCm: ch.unitCm, h: opts.h, qmin: qb.min, qext: qb.ext,
    nodes: tm.nodes.length / 3, tets: nT, colours: col.colours,
    outer: { verts: so.qpos.length / 4, tris: so.idx.length / 3 }, inner: { verts: si.qpos.length / 4, tris: si.idx.length / 3 },
    surfVolume: surfVol, innerVolume: innerVol, tetVolume: tetVolSum, bubbles: bub.length / 4, landmarks: lmNames,
  };
  const out = packSections(meta, {
    nodes: tm.nodes, tets: col.tets, colourOffsets: col.offsets, finW,
    o_pos: so.qpos, o_nrm: so.qnrm, o_attr: so.attr, o_nodes: so.nodes, o_wts: so.wts, o_idx: so.idx,
    i_pos: si.qpos, i_nrm: si.qnrm, i_attr: si.attr, i_nodes: si.nodes, i_wts: si.wts, i_idx: si.idx,
    bub: new Float32Array(bub), bubN: new Uint16Array(bubN), bubW: new Float32Array(bubW),
    lmN, lmW, lmP,
  });
  mkdirSync(`public/assets/${ch.id}`, { recursive: true });
  writeFileSync(`public/assets/${ch.id}/${level}.bin`, out);
  console.log(level, JSON.stringify(meta), 'comps', o2.comps, tm.comps, 'bytes', out.length, 'ms', Date.now() - t0);
}

const which = process.argv[3] || 'all';
const chars = (process.argv[2] || 'shark') === 'all' ? Object.keys(SHAPES) : [process.argv[2] || 'shark'];
const LEVELS: Record<string, { vsOuter: number; vsInner: number; h: number; bubbles: number }> = {
  hi: { vsOuter: 0.0030, vsInner: 0.0040, h: 0.0165, bubbles: 90 },
  md: { vsOuter: 0.0036, vsInner: 0.0048, h: 0.021, bubbles: 70 },
  lo: { vsOuter: 0.0034, vsInner: 0.0048, h: 0.034, bubbles: 60 },
};
for (const c of chars) for (const [k, v] of Object.entries(LEVELS)) if (which === 'all' || which === k) bake(SHAPES[c], k, { ...v, vsOuter: v.vsOuter * (SHAPES[c].surfScale ?? 1), vsInner: v.vsInner * (SHAPES[c].surfScale ?? 1) });
