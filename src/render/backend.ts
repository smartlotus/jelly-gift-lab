export interface FrameInput {
  frame: Float32Array;            // FRAME_FLOATS uniform block
  nodeData: Float32Array | null;  // new node state (WebGL2 path) or null
  exposure: number;
  time: number;
}
export interface Backend {
  kind: 'webgpu' | 'webgl2';
  resize(w: number, h: number): void;
  render(f: FrameInput): void;
}
