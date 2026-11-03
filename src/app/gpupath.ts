import type { Path, SimInput } from './path';
import type { TetAsset } from '../sim/mesh';
import { DEFAULT_PARAMS, MAX_BEADS, MAX_GRAB } from '../sim/params';
import { SIM_WGSL, NODEF_WGSL } from '../sim/gpu.wgsl';
import { FRAME_FLOATS } from '../render/frame';
import * as W from '../render/webgpu/shaders';
import type { Look } from '../core/look';

const U = GPUBufferUsage, T = GPUTextureUsage, SS = GPUShaderStage;
const SIM_BYTES = 512; // see Sim struct in gpu.wgsl.ts
const HDR = 'rgba16float' as GPUTextureFormat;

/** WebGPU path: XPBD on compute shaders, skinned + shaded with WGSL render passes. Mirrors GLPath + WebGL2Backend. */
export class GPUPath implements Path {
  kind = 'webgpu' as const;
  ready: Promise<void>;
  substeps = DEFAULT_PARAMS.substeps;
  private ctx: GPUCanvasContext; private fmt: GPUTextureFormat;
  private N: number; private T: number; private colours: { off: number; count: number }[] = [];
  private b: Record<string, GPUBuffer> = {};
  private simBG!: GPUBindGroup; private rangeBG!: GPUBindGroup; private nodeFBG!: GPUBindGroup;
  private cp: Record<string, GPUComputePipeline> = {};
  private rp: Record<string, GPURenderPipeline> = {};
  private bgl: Record<string, GPUBindGroupLayout> = {};
  private frameBG!: GPUBindGroup; private dummyBG!: GPUBindGroup; private meshBG!: GPUBindGroup; private shadowSBG!: GPUBindGroup;
  private shellBG?: GPUBindGroup; private compBG?: GPUBindGroup;
  private shadowTex!: GPUTexture;
  private tg: { sceneMS?: GPUTexture; scene?: GPUTexture; sceneDepth?: GPUTexture; back?: GPUTexture; backDepth?: GPUTexture; shellMS?: GPUTexture; shell?: GPUTexture; shellDepth?: GPUTexture } = {};
  private linS!: GPUSampler; private nearS!: GPUSampler;
  private W = 0; private H = 0;
  private simU = new ArrayBuffer(SIM_BYTES); private simF = new Float32Array(this.simU); private simI = new Uint32Array(this.simU);
  private grabData = new Float32Array(MAX_GRAB * 8);
  private latest: Float32Array; private staging: GPUBuffer[] = []; private stagingBusy = [false, false]; private stagingNext = 0;
  private cost = 0; private inflight = 0; private nOuter: number; private nInner: number; private nBub: number;
  private lost = false; private skip = false; private pendingEnc: GPUCommandEncoder | null = null; private pendingRead = -1;
  presented = 0; simSteps = 0;
  private captureReq: ((d: ImageData) => void) | null = null;
  /** Debug/self-check only: read back the next presented frame (headless WebGPU canvases don't reach screenshots). */
  capture(): Promise<ImageData> { return new Promise(r => { this.captureReq = r; }); }

  constructor(private canvas: HTMLCanvasElement, public asset: TetAsset, private dev: GPUDevice, private samples: number, private look: Look) {
    const a = asset; this.N = a.nodes.length / 3; this.T = a.tets.length / 4;
    const ctx = canvas.getContext('webgpu'); if (!ctx) throw new Error('no webgpu canvas context');
    this.ctx = ctx; this.fmt = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({ device: dev, format: this.fmt, alphaMode: 'opaque', usage: T.RENDER_ATTACHMENT | T.COPY_SRC });
    dev.lost.then(i => { this.lost = true; if (i.reason !== 'destroyed') console.error('WebGPU device lost:', i.message); });
    dev.addEventListener('uncapturederror', (e: any) => console.error('WebGPU error:', e.error?.message ?? e));
    this.latest = new Float32Array(this.N * 4);
    for (let i = 0; i < this.N; i++) this.latest.set([a.nodes[3 * i], a.nodes[3 * i + 1], a.nodes[3 * i + 2], a.invMass[i]], 4 * i);
    this.nOuter = a.s.o_idx.length; this.nInner = a.s.i_idx.length; this.nBub = a.s.bub.length / 4;
    const co = a.colourOffsets;
    for (let c = 0; c + 1 < co.length; c++) if (co[c + 1] > co[c]) this.colours.push({ off: co[c], count: co[c + 1] - co[c] });
    this.ready = this.init();
  }

  private buf(name: string, data: ArrayBufferView | number, usage: number) {
    const size = typeof data === 'number' ? data : data.byteLength;
    const b = this.dev.createBuffer({ size: Math.max(16, Math.ceil(size / 4) * 4), usage: usage | U.COPY_DST, mappedAtCreation: typeof data !== 'number' });
    if (typeof data !== 'number') {
      new Uint8Array(b.getMappedRange()).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)); b.unmap();
    }
    this.b[name] = b; return b;
  }

  private async init() {
    const d = this.dev; const a = this.asset; const N = this.N, Tn = this.T;
    d.pushErrorScope('validation');
    // ---------------- simulation buffers
    const prm = DEFAULT_PARAMS;
    const tetB = new Float32Array(Tn * 12);
    for (let t = 0; t < Tn; t++) {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) tetB[12 * t + 4 * r + c] = a.B[9 * t + 3 * r + c];
      tetB[12 * t + 3] = a.restVol[t];
      tetB[12 * t + 7] = (prm.muBody + (prm.muFin - prm.muBody) * a.finW[t]) * a.stiff[t];
    }
    const tetM = new Float32Array(Tn * 4);
    for (let t = 0; t < Tn; t++) for (let c = 0; c < Math.min(4, a.channels); c++) tetM[4 * t + c] = a.muscle[t * a.channels + c];
    const SR = U.STORAGE;
    this.buf('X', N * 16, SR | U.COPY_SRC); this.buf('P', N * 16, SR); this.buf('V', N * 16, SR); this.buf('Q', Tn * 16, SR);
    this.buf('tets', a.tets, SR); this.buf('tetB', tetB, SR); this.buf('tetM', tetM, SR);
    this.buf('adjOff', a.adjOffsets, SR); this.buf('adjTet', a.adjTets, SR);
    this.buf('nodeData', N * 64, SR);
    this.buf('sim', SIM_BYTES, U.UNIFORM); this.buf('grab', MAX_GRAB * 32, SR);
    const counts = new Uint32Array([N, Tn, 0, 0]); this.buf('counts', counts, U.UNIFORM);
    const ranges = new Uint32Array(Math.max(1, this.colours.length) * 64);
    this.colours.forEach((c, i) => { ranges[64 * i] = c.off; ranges[64 * i + 1] = c.count; });
    this.buf('ranges', ranges, U.UNIFORM);
    this.writeInitialState();
    for (let i = 0; i < 2; i++) this.staging.push(d.createBuffer({ size: N * 16, usage: U.MAP_READ | U.COPY_DST }));

    const st = (b: number, type: GPUBufferBindingType, vis = SS.COMPUTE): GPUBindGroupLayoutEntry => ({ binding: b, visibility: vis, buffer: { type } });
    const simL = d.createBindGroupLayout({ entries: [st(0, 'uniform'), st(1, 'storage'), st(2, 'storage'), st(3, 'storage'), st(4, 'read-only-storage'), st(5, 'read-only-storage'), st(6, 'read-only-storage'), st(7, 'storage'), st(8, 'read-only-storage')] });
    const rangeL = d.createBindGroupLayout({ entries: [{ binding: 0, visibility: SS.COMPUTE, buffer: { type: 'uniform', hasDynamicOffset: true, minBindingSize: 16 } }] });
    const simMod = d.createShaderModule({ code: SIM_WGSL, label: 'sim' });
    const simPL = d.createPipelineLayout({ bindGroupLayouts: [simL, rangeL] });
    const mkC = (mod: GPUShaderModule, ep: string, layout: GPUPipelineLayout) => d.createComputePipelineAsync({ layout, compute: { module: mod, entryPoint: ep } });
    const B = this.b;
    this.simBG = d.createBindGroup({ layout: simL, entries: ['sim', 'X', 'P', 'V', 'tets', 'tetB', 'tetM', 'Q', 'grab'].map((n, i) => ({ binding: i, resource: { buffer: B[n] } })) });
    this.rangeBG = d.createBindGroup({ layout: rangeL, entries: [{ binding: 0, resource: { buffer: B.ranges, size: 16 } }] });
    const nfL = d.createBindGroupLayout({ entries: [st(0, 'uniform'), st(1, 'read-only-storage'), st(2, 'read-only-storage'), st(3, 'read-only-storage'), st(4, 'read-only-storage'), st(5, 'read-only-storage'), st(6, 'storage')] });
    this.nodeFBG = d.createBindGroup({ layout: nfL, entries: ['counts', 'X', 'tets', 'tetB', 'adjOff', 'adjTet', 'nodeData'].map((n, i) => ({ binding: i, resource: { buffer: B[n] } })) });
    const nfMod = d.createShaderModule({ code: NODEF_WGSL, label: 'nodeF' });

    // ---------------- render resources
    const restN = new Float32Array(N * 4); for (let i = 0; i < N; i++) restN.set([a.nodes[3 * i], a.nodes[3 * i + 1], a.nodes[3 * i + 2], 1], 4 * i);
    this.buf('restN', restN, SR); this.buf('frame', FRAME_FLOATS * 4, U.UNIFORM); this.buf('comp', 16, U.UNIFORM);
    const V = U.VERTEX;
    for (const p of ['o_', 'i_']) for (const k of ['pos', 'nrm', 'attr', 'nodes', 'wts']) this.buf(p + k, a.s[p + k], V);
    this.buf('o_idx', new Uint32Array(a.s.o_idx), U.INDEX); this.buf('i_idx', new Uint32Array(a.s.i_idx), U.INDEX);
    this.buf('bub', a.s.bub, V); this.buf('bubN', a.s.bubN, V); this.buf('bubW', a.s.bubW, V);
    this.linS = d.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    this.nearS = d.createSampler({ magFilter: 'nearest', minFilter: 'nearest' });
    this.shadowTex = d.createTexture({ size: [512, 512], format: HDR, usage: T.RENDER_ATTACHMENT | T.TEXTURE_BINDING });

    const VF = SS.VERTEX | SS.FRAGMENT; const TB0 = T.TEXTURE_BINDING;
    const L = this.bgl;
    L.frame = d.createBindGroupLayout({ entries: [{ binding: 0, visibility: VF, buffer: { type: 'uniform' } }] });
    L.mesh = d.createBindGroupLayout({ entries: [st(0, 'read-only-storage', SS.VERTEX), st(1, 'read-only-storage', SS.VERTEX)] });
    const tex = (b: number, sampleType: GPUTextureSampleType = 'float'): GPUBindGroupLayoutEntry => ({ binding: b, visibility: SS.FRAGMENT, texture: { sampleType } });
    const smp = (b: number): GPUBindGroupLayoutEntry => ({ binding: b, visibility: SS.FRAGMENT, sampler: { type: 'filtering' } });
    L.shadowS = d.createBindGroupLayout({ entries: [tex(0), smp(1)] });
    L.shell = d.createBindGroupLayout({ entries: [tex(0), tex(1), smp(2), smp(3)] });
    L.comp = d.createBindGroupLayout({ entries: [tex(0, 'unfilterable-float'), tex(1, 'unfilterable-float'), { binding: 2, visibility: SS.FRAGMENT, buffer: { type: 'uniform' } }] });
    this.frameBG = d.createBindGroup({ layout: L.frame, entries: [{ binding: 0, resource: { buffer: B.frame } }] });
    this.meshBG = d.createBindGroup({ layout: L.mesh, entries: [{ binding: 0, resource: { buffer: B.nodeData } }, { binding: 1, resource: { buffer: B.restN } }] });
    const dummy = d.createTexture({ size: [1, 1], format: HDR, usage: TB0 });
    this.dummyBG = d.createBindGroup({ layout: L.shadowS, entries: [{ binding: 0, resource: dummy.createView() }, { binding: 1, resource: this.linS }] });
    this.shadowSBG = d.createBindGroup({ layout: L.shadowS, entries: [{ binding: 0, resource: this.shadowTex.createView() }, { binding: 1, resource: this.linS }] });

    const meshVB: GPUVertexBufferLayout[] = [
      { arrayStride: 8, attributes: [{ shaderLocation: 0, offset: 0, format: 'unorm16x4' }] },
      { arrayStride: 8, attributes: [{ shaderLocation: 1, offset: 0, format: 'snorm16x4' }] },
      { arrayStride: 4, attributes: [{ shaderLocation: 2, offset: 0, format: 'unorm8x4' }] },
      { arrayStride: 8, attributes: [{ shaderLocation: 3, offset: 0, format: 'uint16x4' }] },
      { arrayStride: 8, attributes: [{ shaderLocation: 4, offset: 0, format: 'snorm16x4' }] },
    ];
    const bubVB: GPUVertexBufferLayout[] = [
      { arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }] },
      { arrayStride: 8, stepMode: 'instance', attributes: [{ shaderLocation: 1, offset: 0, format: 'uint16x4' }] },
      { arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x4' }] },
    ];
    const mod = (code: string, label: string) => d.createShaderModule({ code, label });
    const mMesh = mod(W.SHADOW_WGSL, 'shadow'), mBack = mod(W.BACK_WGSL, 'back'), mInner = mod(W.innerWGSL(this.look.shellWGSL, this.look.innerWGSL), 'inner'), mShell = mod(W.shellWGSL(this.look.shellWGSL), 'shell');
    const mBackdrop = mod(W.BACKDROP_WGSL, 'backdrop'), mBub = mod(W.BUBBLE_WGSL, 'bubble'), mBead = mod(W.BEAD_WGSL, 'bead'), mComp = mod(W.COMPOSITE_WGSL, 'composite');
    const lay3 = d.createPipelineLayout({ bindGroupLayouts: [L.frame, L.mesh, L.shadowS] });
    const layShell = d.createPipelineLayout({ bindGroupLayouts: [L.frame, L.mesh, L.shell] });
    const layComp = d.createPipelineLayout({ bindGroupLayouts: [L.comp] });
    const ds = (write = true, cmp: GPUCompareFunction = 'less'): GPUDepthStencilState => ({ format: 'depth24plus', depthWriteEnabled: write, depthCompare: cmp });
    const ms = { count: this.samples };
    const add: GPUBlendComponent = { operation: 'add', srcFactor: 'one', dstFactor: 'one' };
    const P = this.rp;
    const jobs: Promise<void>[] = [];
    const R = (name: string, desc: GPURenderPipelineDescriptor) => jobs.push(d.createRenderPipelineAsync({ label: name, ...desc }).then(p => { P[name] = p; }));
    R('shadowO', { layout: lay3, vertex: { module: mMesh, entryPoint: 'vsLight', buffers: meshVB }, fragment: { module: mMesh, entryPoint: 'fsShell', targets: [{ format: HDR, blend: { color: add, alpha: { operation: 'min', srcFactor: 'one', dstFactor: 'one' } } }] }, primitive: { cullMode: 'none' } });
    R('shadowI', { layout: lay3, vertex: { module: mMesh, entryPoint: 'vsLight', buffers: meshVB }, fragment: { module: mMesh, entryPoint: 'fsInner', targets: [{ format: HDR, blend: { color: add, alpha: { operation: 'min', srcFactor: 'one', dstFactor: 'one' } } }] }, primitive: { cullMode: 'none' } });
    R('backdrop', { layout: lay3, vertex: { module: mBackdrop, entryPoint: 'vsFull' }, fragment: { module: mBackdrop, entryPoint: 'fsMain', targets: [{ format: HDR }] }, depthStencil: ds(false, 'always'), multisample: ms });
    R('inner', { layout: lay3, vertex: { module: mInner, entryPoint: 'vsMain', buffers: meshVB }, fragment: { module: mInner, entryPoint: 'fsMain', targets: [{ format: HDR }] }, primitive: { cullMode: 'back' }, depthStencil: ds(), multisample: ms });
    R('bead', { layout: lay3, vertex: { module: mBead, entryPoint: 'vsMain' }, fragment: { module: mBead, entryPoint: 'fsMain', targets: [{ format: HDR }] }, depthStencil: ds(), multisample: ms });
    R('bubble', { layout: lay3, vertex: { module: mBub, entryPoint: 'vsMain', buffers: bubVB }, fragment: { module: mBub, entryPoint: 'fsMain', targets: [{ format: HDR, blend: { color: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { operation: 'add', srcFactor: 'zero', dstFactor: 'one' } } }] }, primitive: { topology: 'triangle-strip' }, depthStencil: ds(false), multisample: ms });
    R('back', { layout: lay3, vertex: { module: mBack, entryPoint: 'vsMain', buffers: meshVB }, fragment: { module: mBack, entryPoint: 'fsMain', targets: [{ format: HDR }] }, primitive: { cullMode: 'front' }, depthStencil: ds() });
    R('shell', { layout: layShell, vertex: { module: mShell, entryPoint: 'vsMain', buffers: meshVB }, fragment: { module: mShell, entryPoint: 'fsMain', targets: [{ format: HDR }] }, primitive: { cullMode: 'back' }, depthStencil: ds(), multisample: ms });
    R('comp', { layout: layComp, vertex: { module: mComp, entryPoint: 'vsFull' }, fragment: { module: mComp, entryPoint: 'fsMain', targets: [{ format: this.fmt }] } });
    for (const ep of ['predict', 'solveTets', 'solveGrab', 'contacts']) jobs.push(mkC(simMod, ep, simPL).then(p => { this.cp[ep] = p; }));
    jobs.push(mkC(nfMod, 'nodeF', d.createPipelineLayout({ bindGroupLayouts: [nfL] })).then(p => { this.cp.nodeF = p; }));
    for (const m of [simMod, nfMod, mMesh, mBack, mInner, mShell, mBackdrop, mBub, mBead, mComp]) {
      const info = await m.getCompilationInfo();
      for (const msg of info.messages) if (msg.type === 'error') { await Promise.allSettled(jobs); throw new Error(`WGSL ${m.label}:${msg.lineNum}:${msg.linePos}: ${msg.message}`); }
    }
    await Promise.all(jobs);
    const err = await d.popErrorScope();
    if (err) throw new Error('WebGPU validation: ' + err.message);
    // prime nodeData so the first frame is skinned correctly
    const enc = d.createCommandEncoder(); const cp = enc.beginComputePass();
    cp.setPipeline(this.cp.nodeF); cp.setBindGroup(0, this.nodeFBG); cp.dispatchWorkgroups(Math.ceil(N / 64)); cp.end();
    d.queue.submit([enc.finish()]);
    await d.queue.onSubmittedWorkDone();
  }

  private writeInitialState() {
    const a = this.asset, N = this.N, q = this.dev.queue;
    const X = new Float32Array(N * 4), P = new Float32Array(N * 4), V = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      X.set([a.nodes[3 * i], a.nodes[3 * i + 1], a.nodes[3 * i + 2], a.invMass[i]], 4 * i);
      P.set([a.nodes[3 * i], a.nodes[3 * i + 1], a.nodes[3 * i + 2], a.fric[i]], 4 * i);
      V.set([0, 0, 0, a.grav[i]], 4 * i);
    }
    const Q = new Float32Array(this.T * 4); for (let t = 0; t < this.T; t++) Q[4 * t + 3] = 1;
    q.writeBuffer(this.b.X, 0, X); q.writeBuffer(this.b.P, 0, P); q.writeBuffer(this.b.V, 0, V); q.writeBuffer(this.b.Q, 0, Q);
  }

  step(inp: SimInput) {
    if (this.lost || !(inp.dt > 1e-5)) return;
    this.skip = this.inflight >= 2; // GPU is behind: drop this frame (sim + render) to keep latency bounded
    if (this.skip) return;
    if (this.cost > 20 && this.substeps > 8) this.substeps--; else if (this.cost < 10 && this.substeps < 10) this.substeps++;
    const prm = DEFAULT_PARAMS; const n = this.substeps; const h = inp.dt / n;
    const f = this.simF, u = this.simI; const g = inp.grab;
    f[0] = h; f[1] = prm.gravity; f[2] = Math.exp(-prm.damping * h); f[3] = prm.muBody;
    f[4] = prm.muFin; f[5] = prm.lambdaRatio; f[6] = prm.frictionStatic; f[7] = prm.frictionKinetic;
    f[8] = prm.grabStiffness; f[9] = this.asset.meta.h * 0.42; f[10] = Math.min(inp.beadCount, MAX_BEADS); f[11] = g.active ? g.count : 0;
    f.fill(0, 12, 16); for (let c = 0; c < Math.min(4, inp.act.length); c++) f[12 + c] = inp.act[c];
    f[16] = g.target[0]; f[17] = g.target[1]; f[18] = g.target[2]; f[19] = g.twist;
    f[20] = g.axis[0]; f[21] = g.axis[1]; f[22] = g.axis[2]; f[23] = 0;
    u[24] = this.N; u[25] = this.T; u[26] = 0; u[27] = 0;
    f[28] = inp.spin[0]; f[29] = inp.spin[1]; f[30] = inp.spin[2]; f[31] = 0; f[32] = inp.spin[3]; f[33] = inp.spin[4]; f[34] = inp.spin[5]; f[35] = 0;
    for (let c = 0; c < 4; c++) { f[36 + 4 * c] = this.asset.axes[3 * c]; f[37 + 4 * c] = this.asset.axes[3 * c + 1]; f[38 + 4 * c] = this.asset.axes[3 * c + 2]; f[39 + 4 * c] = 0; }
    f.set(inp.beads.subarray(0, MAX_BEADS * 4), 52);
    f.fill(0, 116, 128); if (inp.acc) f.set(inp.acc, 116); if (inp.box) f.set(inp.box, 120);
    const q = this.dev.queue;
    q.writeBuffer(this.b.sim, 0, this.simU);
    const grabbing = g.active && g.count > 0;
    if (grabbing) {
      const gd = this.grabData;
      for (let j = 0; j < g.count; j++) { gd[4 * j] = g.off[3 * j]; gd[4 * j + 1] = g.off[3 * j + 1]; gd[4 * j + 2] = g.off[3 * j + 2]; gd[4 * j + 3] = g.wt[j]; gd[4 * (MAX_GRAB + j)] = g.idx[j]; }
      q.writeBuffer(this.b.grab, 0, gd);
    }
    const enc = this.dev.createCommandEncoder();
    const cp = enc.beginComputePass();
    const nodeWG = Math.ceil(this.N / 64);
    cp.setBindGroup(0, this.simBG);
    cp.setBindGroup(1, this.rangeBG, [0]);
    for (let s = 0; s < n; s++) {
      cp.setPipeline(this.cp.predict); cp.dispatchWorkgroups(nodeWG);
      cp.setPipeline(this.cp.solveTets);
      for (let c = 0; c < this.colours.length; c++) { cp.setBindGroup(1, this.rangeBG, [c * 256]); cp.dispatchWorkgroups(Math.ceil(this.colours[c].count / 64)); }
      if (grabbing) { cp.setPipeline(this.cp.solveGrab); cp.dispatchWorkgroups(Math.ceil(g.count / 64)); }
      cp.setPipeline(this.cp.contacts); cp.dispatchWorkgroups(nodeWG);
    }
    cp.setPipeline(this.cp.nodeF); cp.setBindGroup(0, this.nodeFBG); cp.dispatchWorkgroups(nodeWG);
    cp.end();
    // async readback of positions for picking / bait / readouts
    const si = this.stagingNext; let read = false;
    if (!this.stagingBusy[si]) { enc.copyBufferToBuffer(this.b.X, 0, this.staging[si], 0, this.N * 16); read = true; this.stagingNext = 1 - si; }
    this.pendingEnc = enc; this.pendingRead = read ? si : -1;
  }

  dispose() {
    this.lost = true; // stops step/render
    const d = () => { for (const b of Object.values(this.b)) b.destroy(); for (const b of this.staging) { try { b.destroy(); } catch { /* mapped */ } } for (const t of Object.values(this.tg)) t?.destroy(); this.shadowTex?.destroy(); };
    this.dev.queue.onSubmittedWorkDone().then(d, d);
  }
  private submit(enc: GPUCommandEncoder) {
    const q = this.dev.queue; const t0 = performance.now();
    q.submit([enc.finish()]);
    this.inflight++; this.presented++; this.simSteps++;
    q.onSubmittedWorkDone().then(() => { this.inflight--; this.cost = this.cost * 0.85 + (performance.now() - t0) * 0.15; });
    const si = this.pendingRead; this.pendingRead = -1;
    if (si >= 0) {
      this.stagingBusy[si] = true; const sb = this.staging[si];
      sb.mapAsync(GPUMapMode.READ).then(() => {
        this.latest = new Float32Array(sb.getMappedRange().slice(0)); sb.unmap(); this.stagingBusy[si] = false;
      }).catch(() => { this.stagingBusy[si] = false; });
    }
  }

  resize(w: number, h: number) {
    if (w === this.W && h === this.H && this.tg.scene) return;
    this.W = w; this.H = h; this.canvas.width = w; this.canvas.height = h;
    for (const t of Object.values(this.tg)) t?.destroy();
    const d = this.dev; const RA = T.RENDER_ATTACHMENT, TB = T.TEXTURE_BINDING;
    const mk = (format: GPUTextureFormat, usage: number, sampleCount = 1) => d.createTexture({ size: [w, h], format, usage, sampleCount });
    const s = this.samples;
    this.tg = {
      sceneMS: s > 1 ? mk(HDR, RA, s) : undefined, scene: mk(HDR, RA | TB), sceneDepth: mk('depth24plus', RA, s),
      back: mk(HDR, RA | TB), backDepth: mk('depth24plus', RA),
      shellMS: s > 1 ? mk(HDR, RA, s) : undefined, shell: mk(HDR, RA | TB), shellDepth: mk('depth24plus', RA, s),
    };
    this.shellBG = d.createBindGroup({ layout: this.bgl.shell, entries: [
      { binding: 0, resource: this.tg.scene!.createView() }, { binding: 1, resource: this.tg.back!.createView() },
      { binding: 2, resource: this.linS }, { binding: 3, resource: this.nearS }] });
    this.compBG = d.createBindGroup({ layout: this.bgl.comp, entries: [
      { binding: 0, resource: this.tg.scene!.createView() }, { binding: 1, resource: this.tg.shell!.createView() },
      { binding: 2, resource: { buffer: this.b.comp } }] });
  }

  private mesh(pass: GPURenderPassEncoder, pfx: 'o_' | 'i_') {
    const B = this.b; ['pos', 'nrm', 'attr', 'nodes', 'wts'].forEach((k, i) => pass.setVertexBuffer(i, B[pfx + k]));
    pass.setIndexBuffer(B[pfx + 'idx'], 'uint32');
    pass.drawIndexed(pfx === 'o_' ? this.nOuter : this.nInner);
  }

  render(frame: Float32Array, exposure: number, time: number) {
    if (this.lost || !this.tg.scene || this.skip) return;
    const d = this.dev, q = d.queue, P = this.rp, tg = this.tg;
    q.writeBuffer(this.b.frame, 0, frame);
    q.writeBuffer(this.b.comp, 0, new Float32Array([exposure, time, 1.5 / 255, 0.35]));
    const enc = this.pendingEnc ?? d.createCommandEncoder(); this.pendingEnc = null;
    const common = (p: GPURenderPassEncoder) => { p.setBindGroup(0, this.frameBG); p.setBindGroup(1, this.meshBG); };
    // 1. shadow thickness
    let p = enc.beginRenderPass({ colorAttachments: [{ view: this.shadowTex.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 10] }] });
    common(p); p.setBindGroup(2, this.dummyBG); // can't sample the texture being written
    p.setPipeline(P.shadowO); this.mesh(p, 'o_'); p.setPipeline(P.shadowI); this.mesh(p, 'i_'); p.end();
    // 2. scene
    p = enc.beginRenderPass({
      colorAttachments: [{ view: (tg.sceneMS ?? tg.scene)!.createView(), resolveTarget: tg.sceneMS ? tg.scene!.createView() : undefined, loadOp: 'clear', storeOp: tg.sceneMS ? 'discard' : 'store', clearValue: [0, 0, 0, 1000] }],
      depthStencilAttachment: { view: tg.sceneDepth!.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'discard' },
    });
    common(p); p.setBindGroup(2, this.shadowSBG);
    p.setPipeline(P.backdrop); p.draw(3);
    p.setPipeline(P.inner); this.mesh(p, 'i_');
    p.setPipeline(P.bead); p.draw(6 * MAX_BEADS);
    p.setPipeline(P.bubble);
    p.setVertexBuffer(0, this.b.bub); p.setVertexBuffer(1, this.b.bubN); p.setVertexBuffer(2, this.b.bubW);
    if (this.nBub) p.draw(4, this.nBub);
    p.end();
    // 3. shell back faces -> linear depth
    p = enc.beginRenderPass({
      colorAttachments: [{ view: tg.back!.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [1000, 0, 0, 1] }],
      depthStencilAttachment: { view: tg.backDepth!.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'discard' },
    });
    common(p); p.setBindGroup(2, this.shadowSBG); p.setPipeline(P.back); this.mesh(p, 'o_'); p.end();
    // 4. shell front
    p = enc.beginRenderPass({
      colorAttachments: [{ view: (tg.shellMS ?? tg.shell)!.createView(), resolveTarget: tg.shellMS ? tg.shell!.createView() : undefined, loadOp: 'clear', storeOp: tg.shellMS ? 'discard' : 'store', clearValue: [0, 0, 0, 0] }],
      depthStencilAttachment: { view: tg.shellDepth!.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'discard' },
    });
    common(p); p.setBindGroup(2, this.shellBG!); p.setPipeline(P.shell); this.mesh(p, 'o_'); p.end();
    // 5. composite
    const cur = this.ctx.getCurrentTexture();
    p = enc.beginRenderPass({ colorAttachments: [{ view: cur.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
    p.setPipeline(P.comp); p.setBindGroup(0, this.compBG!); p.draw(3); p.end();
    let cap: { buf: GPUBuffer; bpr: number; res: (d: ImageData) => void } | null = null;
    if (this.captureReq) {
      const bpr = Math.ceil(this.W * 4 / 256) * 256;
      const buf = d.createBuffer({ size: bpr * this.H, usage: U.COPY_DST | U.MAP_READ });
      enc.copyTextureToBuffer({ texture: cur }, { buffer: buf, bytesPerRow: bpr }, [this.W, this.H]);
      cap = { buf, bpr, res: this.captureReq }; this.captureReq = null;
    }
    this.submit(enc);
    if (cap) {
      const { buf, bpr, res } = cap; const w = this.W, h = this.H, bgra = this.fmt === 'bgra8unorm';
      buf.mapAsync(GPUMapMode.READ).then(() => {
        const src = new Uint8Array(buf.getMappedRange()); const img = new ImageData(w, h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = y * bpr + 4 * x, o = 4 * (y * w + x);
          img.data[o] = src[i + (bgra ? 2 : 0)]; img.data[o + 1] = src[i + 1]; img.data[o + 2] = src[i + (bgra ? 0 : 2)]; img.data[o + 3] = 255;
        }
        buf.unmap(); buf.destroy(); res(img);
      });
    }
  }

  nodes() { return { data: this.latest, stride: 4 }; }
  reset() { this.writeInitialState(); }
  simMs() { return this.cost; }
  busy() { return this.inflight >= 2; }
  idle() { return this.dev.queue.onSubmittedWorkDone(); }
}
