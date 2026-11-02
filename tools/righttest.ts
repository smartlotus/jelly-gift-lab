// Self-righting test: roll the shark onto its side and see whether it comes back upright (CPU solver, lo mesh).
import { readFileSync } from 'fs';
import { decodeAsset } from '../src/sim/mesh';
import { CpuSolver, makeGrab } from '../src/sim/cpu';
import { DEFAULT_PARAMS } from '../src/sim/params';
import { sharkActuation } from '../src/characters/shark/actuation';
import { Righting } from '../src/sim/righting';
const roll = +(process.argv[2] || 90) * Math.PI / 180;
const buf = readFileSync(`public/assets/shark/lo.bin`);
const a = decodeAsset(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), sharkActuation, 1);
const s = new CpuSolver(a, { ...DEFAULT_PARAMS, substeps: 10 }); const g = makeGrab(64); const act = new Float32Array(2);
const N = s.N; let cy = 0, cz = 0; for (let i = 0; i < N; i++) { cy += a.nodes[3 * i + 1] / N; cz += a.nodes[3 * i + 2] / N; }
let miny = 1e9;
for (let i = 0; i < N; i++) { const y = a.nodes[3 * i + 1] - cy, z = a.nodes[3 * i + 2] - cz; s.x[3 * i + 1] = cy + y * Math.cos(roll) - z * Math.sin(roll); s.x[3 * i + 2] = cz + y * Math.sin(roll) + z * Math.cos(roll); miny = Math.min(miny, s.x[3 * i + 1]); }
for (let i = 0; i < N; i++) s.x[3 * i + 1] -= miny - 0.002;
s.p.set(s.x);
// body "up" = mean over mid-body nodes of (node - centroid) weighted by rest height
const up = () => { let uy = 0, uz = 0, w = 0; let my = 0, mz = 0, n = 0;
  for (let i = 0; i < N; i++) if (Math.abs(a.nodes[3 * i]) < 0.2) { my += s.x[3 * i + 1]; mz += s.x[3 * i + 2]; n++; }
  my /= n; mz /= n;
  for (let i = 0; i < N; i++) if (Math.abs(a.nodes[3 * i]) < 0.2) { const r = a.nodes[3 * i + 1] - cy; uy += r * (s.x[3 * i + 1] - my); uz += r * (s.x[3 * i + 2] - mz); w++; }
  return Math.atan2(uz, uy) * 180 / Math.PI; };
const rt = new Righting(a.nodes); const sp = new Float32Array(6); const use = process.argv[3] !== 'off';
for (let f = 0; f < 480; f++) { sharkActuation.activation(f / 60, act); if (use) { rt.update(s.x, 3, 1 / 60, false, sp); s.spin.set(sp); } s.step(1 / 60, act, g); if (f % 60 === 59) console.log(`sp=${Array.from(sp).map(v=>v.toFixed(2))} t=${(f + 1) / 60}s roll=${up().toFixed(1)}° vol=${(s.volume()).toFixed(5)}`); }
