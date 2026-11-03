import type { Path, SimInput } from './path';
import type { TetAsset } from '../sim/mesh';
import { WebGL2Backend } from '../render/webgl2/backend';
import type { Look } from '../core/look';

/** WebGL2 fallback: CPU XPBD in a worker, skinned + shaded on the GPU. */
export class GLPath implements Path {
  kind = 'webgl2' as const;
  gl: WebGL2Backend;
  worker: Worker;
  latest: Float32Array | null = null;
  fresh: Float32Array | null = null;
  inflight = 0; cost = 0; seq = 0;
  substeps = 8; presented = 0; simSteps = 0;
  ready: Promise<void>;
  constructor(canvas: HTMLCanvasElement, public asset: TetAsset, buf: ArrayBuffer, character: string, msaa: number, look: Look) {
    this.gl = new WebGL2Backend(canvas, asset, { msaa, look });
    this.worker = new Worker(new URL('../sim/worker.ts', import.meta.url), { type: 'module' });
    this.ready = new Promise((res, rej) => {
      this.worker.onmessage = (e) => {
        const m = e.data;
        if (m.type === 'ready') res();
        else if (m.type === 'state') {
          this.inflight--; this.cost = this.cost * 0.9 + m.cost * 0.1;
          this.fresh = m.nodeData; this.latest = m.nodeData; this.simSteps++;
        }
      };
      this.worker.onerror = (e) => rej(e);
    });
    this.worker.postMessage({ type: 'init', buf: buf.slice(0), character, substeps: this.substeps });
  }
  dispose() { this.worker.terminate(); this.gl.dispose(); }
  step(inp: SimInput) {
    if (this.inflight > 1) return; // worker is behind: skip, keeps latency bounded
    // adaptive substeps keep the worker within budget on slow phones
    if (this.cost > 13 && this.substeps > 6) this.substeps--; else if (this.cost < 7 && this.substeps < 10) this.substeps++;
    const g = inp.grab;
    this.worker.postMessage({ type: 'step', dt: inp.dt, act: inp.act, substeps: this.substeps, seq: this.seq++,
      grab: { active: g.active, count: g.count, idx: g.idx, off: g.off, wt: g.wt, target: g.target, twist: g.twist, axis: g.axis },
      beads: inp.beads, beadCount: inp.beadCount, spin: inp.spin, acc: inp.acc, box: inp.box });
    this.inflight++;
  }
  render(frame: Float32Array, exposure: number, time: number) {
    const nd = this.fresh; this.fresh = null;
    this.gl.render({ frame, nodeData: nd, exposure, time }); this.presented++;
  }
  resize(w: number, h: number) { this.gl.resize(w, h); }
  nodes() { return this.latest ? { data: this.latest, stride: 16 } : null; }
  reset() { this.worker.postMessage({ type: 'reset' }); }
  simMs() { return this.cost; }
  busy() { return this.inflight > 1; }
}
