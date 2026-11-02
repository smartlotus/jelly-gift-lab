/// <reference lib="webworker" />
// CPU XPBD worker for the WebGL2 fallback path.
import { decodeAsset } from './mesh';
import { CpuSolver, makeGrab } from './cpu';
import { DEFAULT_PARAMS, MAX_GRAB } from './params';
import { actuationFor } from '../characters/registry';

let solver: CpuSolver | null = null;
const grab = makeGrab(MAX_GRAB);
let lastCost = 0;

self.onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.type === 'init') {
    const act = actuationFor(m.character)!;
    const a = decodeAsset(m.buf, act, 1);
    solver = new CpuSolver(a, { ...DEFAULT_PARAMS, substeps: m.substeps ?? 8 });
    solver.nodeRadius = a.meta.h * 0.42;
    (self as any).postMessage({ type: 'ready', N: solver.N, T: solver.T, volume0: solver.volume() });
  } else if (m.type === 'step' && solver) {
    const t0 = performance.now();
    grab.active = m.grab.active; grab.count = m.grab.count; grab.twist = m.grab.twist;
    grab.idx.set(m.grab.idx); grab.off.set(m.grab.off); grab.wt.set(m.grab.wt); grab.target.set(m.grab.target); grab.axis.set(m.grab.axis);
    solver.beads.set(m.beads); solver.beadCount = m.beadCount;
    if (m.substeps) solver.prm.substeps = m.substeps;
    solver.step(m.dt, m.act, grab);
    const nd: Float32Array = m.out && m.out.length === solver.N * 16 ? m.out : new Float32Array(solver.N * 16);
    const src = solver.computeNodeData(); nd.set(src);
    lastCost = performance.now() - t0;
    (self as any).postMessage({ type: 'state', nodeData: nd, volume: solver.volume(), cost: lastCost, seq: m.seq }, [nd.buffer]);
  } else if (m.type === 'reset' && solver) {
    solver.reset();
  }
};
