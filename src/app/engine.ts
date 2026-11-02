import { m4 } from '../core/math';
import { FRAME_FLOATS, F } from '../render/frame';
import type { Path } from './path';
import { makeGrab } from '../sim/cpu';
import { MAX_GRAB, MAX_BEADS, DEFAULT_PARAMS } from '../sim/params';
import { Beads } from './beads';
import { Righting } from '../sim/righting';
import type { Actuation } from '../core/character';
import type { Colourway } from '../core/look';

const KEY = [-0.28, 1.0, -0.62];
export interface Readouts { massG: number; volumeMl: number; metrics: number[] }
/** a live measurement between two embedded landmarks (cm) */
export interface Metric { id: string; label: string; zh: string; a: string; b: string; decimals?: number }
export interface CharacterSetup {
  id: string; actuation: Actuation; colourways: Colourway[]; metrics: Metric[];
  camera: { target: number[]; yaw: number; pitch: number; mobileYaw?: number; mobilePitch?: number; legacyFit?: boolean };
  idle?: Engine['idle'];
}

export class Engine {
  frame = new Float32Array(FRAME_FLOATS);
  view = m4.create(); proj = m4.create(); vp = m4.create(); ivp = m4.create(); lvp = m4.create();
  cam = { yaw: 0.62, pitch: 0.42, zoom: 1, target: [-0.03, 0.085, 0] as number[], eye: [0, 0, 0] as number[], fov: 0.5 };
  camGoal = { yaw: 0.62, pitch: 0.42, zoom: 1 };
  grab = makeGrab(MAX_GRAB);
  beads = new Beads();
  spin = new Float32Array(6); righting: Righting | null = null; tilt = 0;
  /** scripted idle gesture: an invisible hand gently lifts one spot now and then (e.g. the shark raising its head) */
  idle: { at: number[]; lift: number[]; period: number; duration: number; radius: number; offset?: number } | null = null;
  private idleT = 0; private autoGrab = false; private autoP0 = [0, 0, 0];
  act!: Float32Array; actuation!: Actuation;
  simTime = 0; last = 0; running = false; time = 0;
  colour!: Colourway; colourMix = 1; prevColour!: Colourway;
  readouts: Readouts = { massG: 0, volumeMl: 0, metrics: [] };
  metrics: Metric[] = []; character!: CharacterSetup;
  onReadouts?: (r: Readouts) => void;
  onFirstInteract?: () => void;
  lockstep = new URLSearchParams(location.search).has('lockstep');
  fps = 0; simHz = 0; rafFps = 0; frames = 0; fpsT = 0; frameMs = 0; private pres0 = 0; private sim0 = 0;
  W = 1; H = 1; dpr = 1;
  volRatio = 1; tetRestVol = 0;
  twistDecay = 0;
  wheelTimer = 0;
  constructor(public canvas: HTMLCanvasElement, public path: Path, ch: CharacterSetup, public dprCap: number, public zeroToOne: boolean, public mobilePortrait = false) {
    this.setCharacter(path, ch);
    this.bindInput();
  }

  /** swap in another character's simulation path (the old one is disposed by the caller) */
  setCharacter(path: Path, ch: CharacterSetup, colour?: Colourway) {
    this.path = path; this.character = ch; this.actuation = ch.actuation; this.metrics = ch.metrics;
    this.act = new Float32Array(ch.actuation.channels);
    this.colour = this.prevColour = colour ?? ch.colourways[0]; this.colourMix = 1;
    const a = path.asset;
    this.tetRestVol = a.restVol.reduce((s, v) => s + v, 0);
    this.volRatio = a.meta.surfVolume / a.meta.tetVolume;
    this.righting = null; this.rest = null; this.beads.clear(); this.grab.active = false; this.grab.twist = 0;
    this.autoGrab = false; this.idleT = 0; this.idle = ch.idle ?? null; this.simTime = 0;
    this.mode = 'none'; this.pointers.clear();
    const c = ch.camera; const y = this.mobilePortrait ? c.mobileYaw ?? c.yaw : c.yaw, p = this.mobilePortrait ? c.mobilePitch ?? c.pitch : c.pitch;
    this.cam.target = [...c.target]; this.cam.yaw = this.camGoal.yaw = y; this.cam.pitch = this.camGoal.pitch = p; this.cam.zoom = this.camGoal.zoom = 1;
    this.readouts = { massG: 0, volumeMl: 0, metrics: ch.metrics.map(() => 0) };
    if (this.W > 2) { this.W = 0; this.resize(); }
  }

  setColour(c: Colourway) { this.prevColour = this.colourNow(); this.colour = c; this.colourMix = 0; }
  private colourNow(): Colourway {
    if (this.colourMix >= 1) return this.colour;
    const t = this.colourMix * this.colourMix * (3 - 2 * this.colourMix);
    const L = (a: number[], b: number[]) => a.map((v, i) => v + (b[i] - v) * t) as any;
    const p = this.prevColour, c = this.colour;
    return { ...c, absorb: L(p.absorb, c.absorb), back: L(p.back, c.back), finTip: L(p.finTip, c.finTip), belly: L(p.belly, c.belly), glow: L(p.glow, c.glow), bead: L(p.bead, c.bead), bgTop: L(p.bgTop, c.bgTop), bgBot: L(p.bgBot, c.bgBot), floor: L(p.floor, c.floor) };
  }

  private raf = 0;
  start() { if (this.running) return; this.running = true; this.last = performance.now(); cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(this.loop); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.W = Math.max(2, Math.round(r.width * this.dpr)); this.H = Math.max(2, Math.round(r.height * this.dpr));
    this.path.resize(this.W, this.H);
    // free band between the top and bottom UI (portrait layouts frame the jelly inside it)
    const H = r.height || 1; let top = 0, bot = H;
    for (const el of document.querySelectorAll('.masthead, .characters')) { const b = el.getBoundingClientRect(); if (b.height && b.bottom < H * 0.5) top = Math.max(top, b.bottom - r.top); }
    for (const el of document.querySelectorAll('.readouts, .controls')) { const b = el.getBoundingClientRect(); if (b.height && b.top > H * 0.5) bot = Math.min(bot, b.top - r.top); }
    this.band = [1 - 2 * (bot - 4) / H, 1 - 2 * (top + 4) / H];
    if (!this.rest) {
      const n = this.path.asset.nodes; const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
      for (let i = 0; i < n.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], n[i + k]); hi[k] = Math.max(hi[k], n[i + k]); }
      this.rest = { lo, hi };
    }
  }
  band = [-1, 1]; rest: { lo: number[]; hi: number[] } | null = null;

  dropBait() {
    const r = 0.016 + Math.random() * 0.008;
    const u = Math.random();
    let x: number, z: number;
    if (u < 0.65) { x = 0.58 + Math.random() * 0.14; z = (Math.random() - 0.5) * 0.36; }
    else { x = -0.2 + Math.random() * 0.5; z = (Math.random() - 0.5) * 0.12; }
    this.beads.spawn(x, 0.42 + Math.random() * 0.1, z, r);
  }
  reset() { this.autoGrab = false; this.idleT = 0; this.path.reset(); this.beads.clear(); this.grab.active = false; this.simTime = 0; }

  private loop = (t: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const t0 = performance.now();
    // lockstep (self-check only): advance exactly one 60 Hz frame per completed sim step,
    // so slow software GPUs reproduce real-time behaviour frame for frame
    if (this.lockstep && this.path.busy()) return;
    const realDt = Math.min(Math.max((t - this.last) / 1000, 1 / 240), 0.25);
    const dt = this.lockstep ? 1 / 60 : Math.min(realDt, 1 / 30); this.last = t;
    if (this.colourMix < 1) this.colourMix = Math.min(1, this.colourMix + (this.lockstep ? dt : realDt) * 1.6);
    this.time += dt;
    this.frames++;
    if (t - this.fpsT > 500) {
      const k = 1000 / (t - this.fpsT);
      this.rafFps = this.frames * k; this.fps = (this.path.presented - this.pres0) * k; this.simHz = (this.path.simSteps - this.sim0) * k;
      this.frames = 0; this.fpsT = t; this.pres0 = this.path.presented; this.sim0 = this.path.simSteps;
    }
    this.update(dt);
    this.frameMs = this.frameMs * 0.9 + (performance.now() - t0) * 0.1;
  };

  update(dt: number) {
    this.simTime += Math.min(dt, 1 / 60);
    this.actuation.activation(this.simTime, this.act);
    // twist relaxes after the wheel stops when not holding
    if (this.wheelTimer > 0) { this.wheelTimer -= dt; if (this.wheelTimer <= 0 && this.pointers.size === 0) { this.grab.active = false; this.grab.twist = 0; } }
    const nodes = this.path.nodes();
    this.beads.step(dt, nodes?.data ?? null, nodes?.stride ?? 4, this.path.asset.nodes.length / 3, this.path.asset.meta.h * 0.42, DEFAULT_PARAMS.gravity);
    this.updateIdle(Math.min(dt, 1 / 60));
    if (nodes) {
      if (!this.righting) this.righting = new Righting(this.path.asset.nodes);
      this.tilt = this.righting.update(nodes.data, nodes.stride, Math.min(dt, 1 / 60), this.grab.active, this.spin);
    }
    this.path.step({ dt: Math.min(dt, 1 / 60), act: this.act, grab: this.grab, beads: this.beads.pos, beadCount: this.beads.count, spin: this.spin });
    this.updateCamera(dt);
    this.writeFrame();
    this.path.render(this.frame, 1.0, this.time);
    this.updateReadouts(dt);
  }

  // ------------------------------------------------------------------------------ camera
  updateCamera(dt: number) {
    const k = 1 - Math.exp(-dt * 8);
    const c = this.cam, g = this.camGoal;
    c.yaw += (g.yaw - c.yaw) * k; c.pitch += (g.pitch - c.pitch) * k; c.zoom += (g.zoom - c.zoom) * k;
    const aspect = this.W / this.H;
    const portrait = aspect < 0.85;
    c.fov = portrait ? 0.62 : 0.48;
    const tv = Math.tan(c.fov / 2), th = tv * aspect;
    // fit the jelly: half-extents seen from this angle (length ~1.16, span ~0.46)
    const halfLen = 0.60, halfH = 0.24;
    const seenLen = halfLen * Math.abs(Math.cos(c.yaw)) + 0.24 * Math.abs(Math.sin(c.yaw));
    let R = Math.max(seenLen / th, halfH / tv) * 1.32 + 0.2;
    const tgt = [c.target[0], c.target[1] + (portrait ? 0.02 : 0), c.target[2]];
    let shiftY = 0;
    const generic = !this.character.camera.legacyFit;
    if ((portrait || generic) && this.rest) {
      // fit the rest-pose bounding box into the free band with an off-centre (lens-shifted) projection
      const [y0, y1] = portrait ? this.band : [-0.62, 0.5]; shiftY = (y0 + y1) / 2; const hy = Math.max(0.2, (y1 - y0) / 2);
      const bx = [Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch)];
      const rt = [bx[2], 0, -bx[0]]; const rl = Math.hypot(rt[0], rt[2]); rt[0] /= rl; rt[2] /= rl;
      const up = [bx[1] * rt[2] - bx[2] * rt[1], bx[2] * rt[0] - bx[0] * rt[2], bx[0] * rt[1] - bx[1] * rt[0]];
      const { lo, hi } = this.rest; const m = portrait ? 0.86 : 0.8; R = 0;
      for (let i = 0; i < 8; i++) {
        const p = [(i & 1 ? hi[0] : lo[0]) - tgt[0], (i & 2 ? hi[1] : lo[1]) - tgt[1], (i & 4 ? hi[2] : lo[2]) - tgt[2]];
        const xr = p[0] * rt[0] + p[2] * rt[2], yu = p[0] * up[0] + p[1] * up[1] + p[2] * up[2], zb = p[0] * bx[0] + p[1] * bx[1] + p[2] * bx[2];
        R = Math.max(R, zb + Math.abs(xr) / (th * m), zb + Math.abs(yu) / (tv * hy * m));
      }
    }
    // short landscape (phones on their side): UI bands eat the top and bottom, so pull back and lift
    if (!portrait && this.H / this.dpr < 520) { R *= 1.3; shiftY = 0.1; }
    R *= c.zoom;
    c.eye = [tgt[0] + R * Math.sin(c.yaw) * Math.cos(c.pitch), tgt[1] + R * Math.sin(c.pitch), tgt[2] + R * Math.cos(c.yaw) * Math.cos(c.pitch)];
    m4.lookAt(this.view, c.eye, tgt, [0, 1, 0]);
    m4.perspective(this.proj, c.fov, aspect, 0.05, 40, this.zeroToOne);
    this.proj[9] = -shiftY; // lens shift: NDC y += shiftY
    m4.mul(this.vp, this.proj, this.view);
    m4.invert(this.ivp, this.vp);
    // key light: ortho box around the jelly
    const L = KEY; const l = Math.hypot(L[0], L[1], L[2]); const Ln = L.map(v => v / l);
    const lv = m4.create(); const lp = m4.create();
    m4.lookAt(lv, [Ln[0] * 3, Ln[1] * 3, Ln[2] * 3], [0, 0, 0], [1, 0, 0]);
    m4.ortho(lp, -0.85, 0.85, -0.85, 0.85, 0.5, 6, this.zeroToOne);
    m4.mul(this.lvp, lp, lv);
  }

  writeFrame() {
    const f = this.frame; const a = this.path.asset; const c = this.colourNow();
    f.set(this.vp, F.viewProj); f.set(this.view, F.view); f.set(this.proj, F.proj); f.set(this.ivp, F.invViewProj); f.set(this.lvp, F.lightVP);
    f.set([this.cam.eye[0], this.cam.eye[1], this.cam.eye[2], this.time], F.camPos);
    f.set([this.W, this.H, 1 / this.W, 1 / this.H], F.res);
    f.set([a.meta.qmin[0], a.meta.qmin[1], a.meta.qmin[2], a.meta.unitCm], F.qmin);
    f.set([a.meta.qext[0], a.meta.qext[1], a.meta.qext[2], 0], F.qext);
    f.set([c.absorb[0], c.absorb[1], c.absorb[2], c.ior ?? 1.36], F.absorb);
    f.set([c.ink?.[0] ?? 13, c.ink?.[1] ?? 0.32, 0, 0], F.extra);
    f.set(c.back, F.backCol); f.set(c.finTip, F.finTipCol); f.set(c.belly, F.bellyCol); f.set(c.glow, F.glowCol);
    f.set([c.floor[0], c.floor[1], c.floor[2], 1], F.studio);
    f.set([this.beads.count, this.grab.twist, 0.05, 40], F.misc);
    f.set(c.bead, F.beadCol);
    f.set(this.beads.pos.subarray(0, MAX_BEADS * 4), F.beads);
    const L = KEY; const l = Math.hypot(L[0], L[1], L[2]);
    f.set([L[0] / l, L[1] / l, L[2] / l, 0], F.lightDir);
    f.set([c.bgTop[0], c.bgTop[1], c.bgTop[2], 1], F.bgTop); f.set([c.bgBot[0], c.bgBot[1], c.bgBot[2], 1], F.bgBot);
  }

  // ------------------------------------------------------------------------------ readouts
  private roT = 0;
  private landmark(name: string, nd: Float32Array, stride: number) {
    const a = this.path.asset; const i = a.meta.landmarks.indexOf(name);
    let x = 0, y = 0, z = 0;
    for (let q = 0; q < 4; q++) { const n = a.s.lmN[4 * i + q], w = a.s.lmW[4 * i + q]; x += nd[n * stride] * w; y += nd[n * stride + 1] * w; z += nd[n * stride + 2] * w; }
    return [x, y, z];
  }
  updateReadouts(dt: number) {
    this.roT += dt; if (this.roT < 0.1) return; this.roT = 0;
    const nd = this.path.nodes(); if (!nd) return;
    const a = this.path.asset; const { data, stride } = nd; const T = a.tets;
    let v = 0;
    for (let t = 0; t < T.length; t += 4) {
      const i0 = T[t] * stride, i1 = T[t + 1] * stride, i2 = T[t + 2] * stride, i3 = T[t + 3] * stride;
      const ax = data[i1] - data[i0], ay = data[i1 + 1] - data[i0 + 1], az = data[i1 + 2] - data[i0 + 2];
      const bx = data[i2] - data[i0], by = data[i2 + 1] - data[i0 + 1], bz = data[i2 + 2] - data[i0 + 2];
      const cx = data[i3] - data[i0], cy = data[i3 + 1] - data[i0 + 1], cz = data[i3 + 2] - data[i0 + 2];
      v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    }
    const u = a.meta.unitCm;
    const ml = v * this.volRatio * u * u * u;
    this.readouts = {
      volumeMl: ml, massG: ml * 1.04,
      metrics: this.metrics.map(m => { const p = this.landmark(m.a, data, stride), q = this.landmark(m.b, data, stride); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) * u; }),
    };
    this.onReadouts?.(this.readouts);
  }

  // ------------------------------------------------------------------------------ input
  pointers = new Map<number, { x: number; y: number }>();
  mode: 'none' | 'grab' | 'orbit' | 'pinch' | 'twist' = 'none';
  private grabPlane = { p: [0, 0, 0], n: [0, 0, 1] };
  private twistStart = 0; private twistBase = 0; private pinchStart = 0; private zoomStart = 1;
  private orbitStart = { x: 0, y: 0, yaw: 0, pitch: 0 };
  interacted = false;

  ray(cx: number, cy: number) {
    const r = this.canvas.getBoundingClientRect();
    const nx = ((cx - r.left) / r.width) * 2 - 1, ny = -(((cy - r.top) / r.height) * 2 - 1);
    const z0 = this.zeroToOne ? 0 : -1;
    const a = m4.transformPoint(this.ivp, nx, ny, z0), b = m4.transformPoint(this.ivp, nx, ny, 1);
    const ro = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], e = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
    const d = [e[0] - ro[0], e[1] - ro[1], e[2] - ro[2]]; const l = Math.hypot(d[0], d[1], d[2]);
    return { ro, rd: [d[0] / l, d[1] / l, d[2] / l] };
  }
  pick(cx: number, cy: number) {
    const nd = this.path.nodes(); if (!nd) return null;
    const { ro, rd } = this.ray(cx, cy); const { data, stride } = nd;
    const N = this.path.asset.nodes.length / 3; const thr = this.path.asset.meta.h * 0.9 + 0.006;
    let best = -1, bt = 1e9;
    for (let i = 0; i < N; i++) {
      const o = i * stride; const dx = data[o] - ro[0], dy = data[o + 1] - ro[1], dz = data[o + 2] - ro[2];
      const t = dx * rd[0] + dy * rd[1] + dz * rd[2]; if (t <= 0) continue;
      const px = dx - rd[0] * t, py = dy - rd[1] * t, pz = dz - rd[2] * t;
      const d = Math.hypot(px, py, pz);
      if (d < thr && t - (thr - d) < bt) { bt = t - (thr - d) * 0.5; best = i; }
    }
    if (best < 0) return null;
    const o = best * stride;
    return { node: best, p: [data[o], data[o + 1], data[o + 2]] };
  }
  private updateIdle(dt: number) {
    const id = this.idle; if (!id) return;
    const userBusy = this.pointers.size > 0 || this.wheelTimer > 0 || (this.grab.active && !this.autoGrab);
    if (userBusy) { this.autoGrab = false; this.idleT = 0; return; }
    this.idleT += dt;
    const ph = (this.idleT + (id.offset ?? 0)) % id.period;
    if (ph < id.duration) {
      const u = ph / id.duration; const e = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.25)), 2);
      if (!this.autoGrab) {
        const nd = this.path.nodes(); if (!nd) return;
        const a = this.path.asset.nodes; let bi = 0, bd = 1e9;
        for (let i = 0; i < a.length / 3; i++) { const d = (a[3 * i] - id.at[0]) ** 2 + (a[3 * i + 1] - id.at[1]) ** 2 + (a[3 * i + 2] - id.at[2]) ** 2; if (d < bd) { bd = d; bi = i; } }
        const o = bi * nd.stride; const p = [nd.data[o], nd.data[o + 1], nd.data[o + 2]];
        this.startGrab(bi, p, id.radius); this.autoP0 = p; this.autoGrab = true;
      }
      for (let k = 0; k < 3; k++) this.grab.target[k] = this.autoP0[k] + id.lift[k] * e;
    } else if (this.autoGrab) { this.autoGrab = false; this.grab.active = false; }
  }
  startGrab(node: number, p: number[], radius: number) {
    const nd = this.path.nodes()!; const { data, stride } = nd;
    const N = this.path.asset.nodes.length / 3;
    const cand: [number, number][] = [];
    for (let i = 0; i < N; i++) {
      const o = i * stride; const d = Math.hypot(data[o] - p[0], data[o + 1] - p[1], data[o + 2] - p[2]);
      if (d < radius) cand.push([d, i]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    const g = this.grab; g.count = Math.min(cand.length, MAX_GRAB);
    for (let j = 0; j < g.count; j++) {
      const [d, i] = cand[j]; const o = i * stride;
      g.idx[j] = i; g.wt[j] = Math.pow(1 - d / radius, 1.5);
      g.off[3 * j] = data[o] - p[0]; g.off[3 * j + 1] = data[o + 1] - p[1]; g.off[3 * j + 2] = data[o + 2] - p[2];
    }
    g.target.set(p); g.twist = 0;
    const f = [this.cam.eye[0] - p[0], this.cam.eye[1] - p[1], this.cam.eye[2] - p[2]]; const l = Math.hypot(f[0], f[1], f[2]);
    this.grabPlane = { p: [...p], n: [f[0] / l, f[1] / l, f[2] / l] };
    g.axis.set(this.grabPlane.n);
    g.active = true;
  }
  moveGrab(cx: number, cy: number) {
    const { ro, rd } = this.ray(cx, cy); const { p, n } = this.grabPlane;
    const den = rd[0] * n[0] + rd[1] * n[1] + rd[2] * n[2]; if (Math.abs(den) < 1e-5) return;
    const t = ((p[0] - ro[0]) * n[0] + (p[1] - ro[1]) * n[1] + (p[2] - ro[2]) * n[2]) / den;
    let x = ro[0] + rd[0] * t, y = ro[1] + rd[1] * t, z = ro[2] + rd[2] * t;
    // limit stretch so the jelly can't be torn apart
    const dx = x - p[0], dy = y - p[1], dz = z - p[2]; const d = Math.hypot(dx, dy, dz); const max = 0.32;
    if (d > max) { const s = max / d; x = p[0] + dx * s; y = p[1] + dy * s; z = p[2] + dz * s; }
    this.grab.target.set([x, Math.max(y, 0.005), z]);
  }
  private firstInteract() { if (!this.interacted) { this.interacted = true; this.onFirstInteract?.(); } }

  bindInput() {
    const el = this.canvas;
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.firstInteract();
      if (this.pointers.size === 1) {
        const hit = this.pick(e.clientX, e.clientY);
        if (hit) { this.mode = 'grab'; this.startGrab(hit.node, hit.p, 0.075); }
        else { this.mode = 'orbit'; this.orbitStart = { x: e.clientX, y: e.clientY, yaw: this.camGoal.yaw, pitch: this.camGoal.pitch }; }
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        if (this.mode === 'grab') { this.mode = 'twist'; this.twistStart = Math.atan2(b.y - a.y, b.x - a.x); this.twistBase = this.grab.twist; }
        else { this.mode = 'pinch'; this.pinchStart = Math.hypot(b.x - a.x, b.y - a.y); this.zoomStart = this.camGoal.zoom; this.twistStart = Math.atan2(b.y - a.y, b.x - a.x); this.orbitStart.yaw = this.camGoal.yaw; }
      }
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const ps = [...this.pointers.values()];
      if (this.mode === 'grab') this.moveGrab(e.clientX, e.clientY);
      else if (this.mode === 'orbit') {
        const s = this.orbitStart;
        this.camGoal.yaw = s.yaw - (e.clientX - s.x) * 0.006;
        this.camGoal.pitch = Math.min(1.25, Math.max(0.08, s.pitch + (e.clientY - s.y) * 0.004));
      } else if (this.mode === 'twist' && ps.length >= 2) {
        const ang = Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x);
        let d = ang - this.twistStart; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        this.grab.twist = Math.max(-2.2, Math.min(2.2, this.twistBase - d));
        this.moveGrab(ps[0].x, ps[0].y);
      } else if (this.mode === 'pinch' && ps.length >= 2) {
        const d = Math.hypot(ps[1].x - ps[0].x, ps[1].y - ps[0].y);
        this.camGoal.zoom = Math.min(1.6, Math.max(0.45, this.zoomStart * this.pinchStart / Math.max(d, 1)));
      }
    });
    const up = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) { this.mode = 'none'; this.grab.active = false; this.grab.twist = 0; }
      else if (this.mode === 'twist') { this.mode = 'grab'; }
      else if (this.mode === 'pinch') { this.mode = 'none'; }
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => {
      e.preventDefault(); this.firstInteract();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if (this.mode === 'grab' || this.mode === 'twist') { this.grab.twist = Math.max(-2.2, Math.min(2.2, this.grab.twist + dy * 0.004)); return; }
      if (!this.grab.active) {
        const hit = this.pick(e.clientX, e.clientY);
        if (!hit) { this.camGoal.zoom = Math.min(1.6, Math.max(0.45, this.camGoal.zoom * Math.exp(dy * 0.001))); return; }
        this.startGrab(hit.node, hit.p, 0.11);
      }
      this.grab.twist = Math.max(-2.2, Math.min(2.2, this.grab.twist + dy * 0.004));
      this.wheelTimer = 0.7;
    }, { passive: false });
  }

  /** Self-check helper: paint the last WebGPU frame into a 2D overlay so page screenshots include it. */
  /** Self-check helper: freeze the loop and let the GPU drain so a page screenshot can't starve. */
  async debugFreeze(on: boolean) {
    if (on) { await this.debugCapture(); this.stop(); await (this.path as any).idle?.(); }
    else { await this.debugCapture(false); this.start(); }
  }
  async debugCapture(on = true) {
    document.getElementById('gpushot')?.remove();
    const p = this.path as any; if (!on || !p.capture) return false;
    const img: ImageData = await p.capture();
    const c = document.createElement('canvas'); c.id = 'gpushot'; c.width = img.width; c.height = img.height;
    c.getContext('2d')!.putImageData(img, 0, 0);
    const cs = getComputedStyle(this.canvas); const r = this.canvas.getBoundingClientRect();
    c.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:${cs.zIndex};pointer-events:none`;
    this.canvas.after(c); return true;
  }
}
