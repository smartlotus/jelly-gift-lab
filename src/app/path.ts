import type { TetAsset } from '../sim/mesh';
import type { GrabState } from '../sim/cpu';

export interface SimInput {
  dt: number; act: Float32Array; grab: GrabState; beads: Float32Array; beadCount: number;
}
/** A complete simulation + rendering path (WebGPU compute+render, or CPU worker + WebGL2). */
export interface Path {
  kind: 'webgpu' | 'webgl2';
  asset: TetAsset;
  step(inp: SimInput): void;
  render(frame: Float32Array, exposure: number, time: number): void;
  resize(w: number, h: number): void;
  /** latest node positions known on the CPU (for picking, bait, readouts) */
  nodes(): { data: Float32Array; stride: number } | null;
  reset(): void;
  simMs(): number;
  substeps: number;
  /** frames actually submitted to the GPU / sim states produced (for honest fps) */
  presented: number; simSteps: number;
  /** true when the next step() would be dropped because the sim is still busy */
  busy(): boolean;
}
