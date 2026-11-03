import { readFileSync } from 'fs';
import { decodeAsset } from '../src/sim/mesh';
import { CpuSolver, makeGrab } from '../src/sim/cpu';
import { DEFAULT_PARAMS } from '../src/sim/params';
import { sharkActuation } from '../src/characters/shark/actuation';
const buf = readFileSync(`public/jelly/assets/shark/lo.bin`);
const a = decodeAsset(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), sharkActuation, 1);
const s = new CpuSolver(a, { ...DEFAULT_PARAMS, substeps: 10 }); const g = makeGrab(64); const act = new Float32Array(3);
for (let f = 0; f < 60 * 12; f++) { sharkActuation.activation(f / 60, act); s.step(1 / 60, act, g);
  if (f % 30 === 0) { let my = 1e9, n = 0, ay = 0; for (let i = 0; i < s.N; i++) if (a.nodes[3 * i] > 0.42) { my = Math.min(my, s.x[3 * i + 1]); ay += s.x[3*i+1]; n++; } console.log(`t=${(f/60).toFixed(1)} act2=${act[2].toFixed(2)} headMinY=${my.toFixed(4)} headMeanY=${(ay/n).toFixed(4)}`); } }
