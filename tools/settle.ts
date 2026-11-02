// Settle test: drop a character on the floor (CPU solver, lo mesh) and report tilt, crown height and volume over time.
import { readFileSync } from 'fs';
import { decodeAsset } from '../src/sim/mesh';
import { CpuSolver, makeGrab } from '../src/sim/cpu';
import { DEFAULT_PARAMS } from '../src/sim/params';
import { ACTUATIONS } from '../src/characters/actuations';
import { Righting } from '../src/sim/righting';
const id = process.argv[2] || 'pig'; const roll = +(process.argv[3] || 0) * Math.PI / 180; const level = process.argv[4] || 'lo';
const act = ACTUATIONS[id]; const buf = readFileSync(`public/assets/${id}/${level}.bin`);
const a = decodeAsset(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), act, 1);
const s = new CpuSolver(a, { ...DEFAULT_PARAMS, substeps: 8 }); const g = makeGrab(64); const u = new Float32Array(act.channels);
const N = s.N; let cy = 0, cx = 0; for (let i = 0; i < N; i++) { cy += a.nodes[3 * i + 1] / N; cx += a.nodes[3 * i] / N; }
if (roll) { let miny = 1e9; for (let i = 0; i < N; i++) { const x = a.nodes[3 * i] - cx, y = a.nodes[3 * i + 1] - cy; s.x[3 * i] = cx + x * Math.cos(roll) - y * Math.sin(roll); s.x[3 * i + 1] = cy + x * Math.sin(roll) + y * Math.cos(roll); miny = Math.min(miny, s.x[3 * i + 1]); } for (let i = 0; i < N; i++) s.x[3 * i + 1] -= miny - 0.002; s.p.set(s.x); }
let top = 0, topI = 0; for (let i = 0; i < N; i++) if (a.nodes[3 * i + 1] > top) { top = a.nodes[3 * i + 1]; topI = i; }
const rt = new Righting(a.nodes); const sp = new Float32Array(6); const v0 = s.volume();
const frames = +(process.argv[5] || 360);
for (let f = 0; f < frames; f++) {
  if (!process.env.NOACT) act.activation(f / 60, u); const tilt = rt.update(s.x, 3, 1 / 60, false, sp); s.spin.set(sp); s.step(1 / 60, u, g);
  if (f % 30 === 29) { let maxy = 0; for (let i = 0; i < N; i++) maxy = Math.max(maxy, s.x[3 * i + 1]);
    console.log(`t=${((f + 1) / 60).toFixed(1)}s tilt=${(tilt * 180 / Math.PI).toFixed(1)}° top=${maxy.toFixed(3)} (rest ${top.toFixed(3)}) topNode=(${s.x[3 * topI].toFixed(3)},${s.x[3 * topI + 2].toFixed(3)}) vol=${(s.volume() / v0).toFixed(3)}`); }
}
