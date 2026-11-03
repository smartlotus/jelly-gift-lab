// Muscle motion check: how far do landmark-ish nodes move (relative to the body centroid) under the idle actuation?
import { readFileSync } from 'fs';
import { decodeAsset } from '../src/sim/mesh';
import { CpuSolver, makeGrab } from '../src/sim/cpu';
import { DEFAULT_PARAMS } from '../src/sim/params';
import { ACTUATIONS } from '../src/characters/actuations';
import { Righting } from '../src/sim/righting';
const id = process.argv[2] || 'pig'; const pts: Record<string, number[]> = JSON.parse(process.argv[3] || '{}');
const act = ACTUATIONS[id]; const buf = readFileSync(`public/jelly/assets/${id}/${process.env.LV || "lo"}.bin`);
const a = decodeAsset(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), act, 1);
const s = new CpuSolver(a, { ...DEFAULT_PARAMS, substeps: 8 }); const g = makeGrab(64); const u = new Float32Array(act.channels);
const rt = new Righting(a.nodes); rt.hold = 0.3; const sp = new Float32Array(6);
const N = s.N; const near = (p: number[]) => { let bi = 0, bd = 1e9; for (let i = 0; i < N; i++) { const d = (a.nodes[3*i]-p[0])**2 + (a.nodes[3*i+1]-p[1])**2 + (a.nodes[3*i+2]-p[2])**2; if (d < bd) { bd = d; bi = i; } } return bi; };
const ids = Object.fromEntries(Object.entries(pts).map(([k, p]) => [k, near(p)]));
const rel: Record<string, number[][]> = {}; for (const k in ids) rel[k] = [];
for (let f = 0; f < 600; f++) {
  act.activation(f / 60, u); rt.update(s.x, 3, 1 / 60, false, sp); s.spin.set(sp); s.step(1 / 60, u, g);
  if (f < 90) continue;
  let cx = 0, cy = 0, cz = 0; for (let i = 0; i < N; i++) { cx += s.x[3*i]; cy += s.x[3*i+1]; cz += s.x[3*i+2]; } cx /= N; cy /= N; cz /= N;
  for (const k in ids) { const i = ids[k]; rel[k].push([s.x[3*i]-cx, s.x[3*i+1]-cy, s.x[3*i+2]-cz]); }
}
for (const k in rel) { const r = rel[k]; const rng = [0, 1, 2].map(c => { const v = r.map(q => q[c]); return ((Math.max(...v) - Math.min(...v)) * 25 * 10).toFixed(1); }); console.log(k, 'range mm (x,y,z):', rng.join(', ')); }
