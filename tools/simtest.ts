import { readFileSync } from 'fs';
import { decodeAsset } from '../src/sim/mesh';
import { CpuSolver, makeGrab } from '../src/sim/cpu';
import { DEFAULT_PARAMS } from '../src/sim/params';
import { sharkActuation } from '../src/characters/shark/actuation';
const lvl = process.argv[2] || 'lo';
const buf = readFileSync(`public/assets/shark/${lvl}.bin`);
const a = decodeAsset(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), sharkActuation, 1);
const prm = { ...DEFAULT_PARAMS, substeps: +(process.argv[3] || 10), frictionStatic: +(process.argv[4] ?? 1.2), frictionKinetic: +(process.argv[4] ?? 0.9) };
const s = new CpuSolver(a, prm); const g = makeGrab(64); const act = new Float32Array(2);
const v0 = s.volume();
const dorsalTip = (() => { let best = 0, bi = 0; for (let i = 0; i < s.N; i++) if (a.nodes[3 * i + 1] > best) { best = a.nodes[3 * i + 1]; bi = i; } return bi; })();
const t0 = performance.now();
for (let f = 0; f < 600; f++) {
  sharkActuation.activation(f / 60, act);
  s.step(1 / 60, act, g);
  if (f % 30 === 29) {
    let maxv = 0; for (let i = 0; i < s.N * 3; i++) maxv = Math.max(maxv, Math.abs(s.v[i]));
    let headZ = 0, n = 0, cz = 0, tz = 0, tn = 0; for (let i = 0; i < s.N; i++) { cz += s.x[3*i+2]/s.N; if (a.nodes[3 * i] > 0.42) { headZ += s.x[3 * i + 2]; n++; } if (a.nodes[3*i] < -0.5) { tz += s.x[3*i+2]; tn++; } }
    console.log(`t=${((f + 1) / 60).toFixed(1)} vol=${(s.volume() / v0).toFixed(4)} maxv=${maxv.toFixed(3)} dorsalTipY=${s.x[3 * dorsalTip + 1].toFixed(3)} (rest ${a.nodes[3 * dorsalTip + 1].toFixed(3)}) headZ=${(headZ / n).toFixed(4)} cz=${cz.toFixed(4)} tail=${(tz/tn).toFixed(4)}`);
  }
}
console.log('nodes', s.N, 'tets', s.T, 'ms/frame', ((performance.now() - t0) / 600).toFixed(2));
