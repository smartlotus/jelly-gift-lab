// Stage 2 3D viewer (workstream B, M3). ONE transparent full-screen WebGL canvas over the pixel shop.
//  - display: every visible exhibit is rendered into its own scissored viewport that follows a pixel-world anchor
//    (models "stand" on the pixel plinths / stick to the pixel fridge), slowly turning.
//  - inspect: the chosen model's viewport grows to fill the screen; OrbitControls (drag / pinch / wheel, damped),
//    double-tap reset, idle auto-turn, split-by-colour (exploded AMS parts), solo one filament colour, tap = jelly squish.
// Look: NeutralToneMapping + RoomEnvironment PMREM (procedural, no HDR file) + a warm key light with soft PCF shadows,
// matte-PLA material (rough, faint sheen) with 0.2 mm print layer lines that fade in only when you zoom close.
// All models are normalised to a radius-1 sphere centred at the origin, so one camera/light rig fits all.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, MeshPhysicalMaterial, MeshBasicMaterial, ShadowMaterial, PMREMGenerator,
  DirectionalLight, NeutralToneMapping, PlaneGeometry, CanvasTexture, Box3, Vector3, Matrix4, PCFShadowMap, MathUtils,
  Color, Object3D, TOUCH, type Texture, type Material,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { asset } from '../../shared/flow';
import { EXHIBITS, PAIR_DX, partKey, type ExhibitId } from './exhibits';

export interface Rect { x: number; y: number; w: number; h: number }
export interface Slot { id: ExhibitId; rect: Rect }
interface Part { mesh: Mesh; key: string; mat: MeshPhysicalMaterial; home: Vector3; dir: Vector3; op: number }
interface Model {
  id: ExhibitId; magnet: boolean; root: Group; print: Object3D; parts: Part[];
  baseFrac: number; floor: Mesh; blob: Mesh; wall?: Mesh; wallBlob?: Mesh;
  printInv: { value: Matrix4 }; spin: number; split: number; splitT: number; solo: string | null;
  sq: number; sqv: number;
}
type Mode = 'display' | 'opening' | 'inspect' | 'closing';
interface Pose { az: number; el: number; d: number; m: number }

const D = 4.2;                 // display camera distance (radius-1 model)
const DISPLAY_M = 1.0, INSPECT_M = 1.1;
const LAYER = 1 / 0.002;       // 0.2 mm layers; GLB unit = 10 cm
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const lerp = MathUtils.lerp;
const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function radialTex(inner = 'rgba(70,40,40,0.55)') {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(0.45, 'rgba(70,40,40,0.25)'); gr.addColorStop(1, 'rgba(70,40,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new CanvasTexture(c);
}

export class Viewer {
  readonly renderer: WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  private scene = new Scene();
  private cam = new PerspectiveCamera(28, 1, 0.05, 50);
  private icam = new PerspectiveCamera(28, 1, 0.05, 50);
  private controls: OrbitControls;
  private key: DirectionalLight;
  private models = new Map<ExhibitId, Model>();
  private loading = new Map<ExhibitId, Promise<Model>>();
  private prog = new Map<ExhibitId, number>();
  private loader: GLTFLoader;
  private blobTex = radialTex();
  mode: Mode = 'display';
  current: ExhibitId | null = null;
  private k = 0;                         // open/close anim progress
  private from: () => Rect = () => ({ x: 0, y: 0, w: 1, h: 1 });
  inspectRect: () => Rect = () => ({ x: 0, y: innerHeight * 0.1, w: innerWidth, h: innerHeight * 0.68 });
  private poseA: Pose = { az: 0, el: 0, d: D, m: 1 };
  private tween: { t: number; dur: number; a: Pose; b: Pose; spinA: number; spinB: number } | null = null;
  autoSpin = true;
  /** lighting moods (inspect "Light" button): studio · window · evening */
  mood = 0;
  private moodT = { k: new Color('#fff0dc'), kp: new Vector3(-2.2, 3.6, 3.0), ki: 1.85, env: 0.5, exp: 0.94 };
  private static MOODS = [
    { k: '#fff0dc', kp: [-2.2, 3.6, 3.0], ki: 1.85, env: 0.5, exp: 0.94 },
    { k: '#eef4ff', kp: [3.4, 2.2, 1.2], ki: 2.3, env: 0.38, exp: 0.92 },
    { k: '#ffc89a', kp: [-3.2, 1.3, 2.0], ki: 2.0, env: 0.3, exp: 0.9 },
  ];
  cycleMood() { this.mood = (this.mood + 1) % Viewer.MOODS.length; this.onChange(); return this.mood; }
  private stepMood(dt: number) {
    const m = Viewer.MOODS[this.mode === 'display' ? 0 : this.mood], T = this.moodT, a = Math.min(1, dt * 4);
    T.k.lerp(new Color(m.k), a); T.kp.lerp(new Vector3(m.kp[0], m.kp[1], m.kp[2]), a); T.ki += (m.ki - T.ki) * a; T.env += (m.env - T.env) * a; T.exp += (m.exp - T.exp) * a;
    this.key.color.copy(T.k); this.key.position.copy(T.kp); this.key.intensity = T.ki; this.scene.environmentIntensity = T.env; this.renderer.toneMappingExposure = T.exp;
  }
  private lastTouch = 0;
  private clock = performance.now();
  onChange: () => void = () => {};       // UI hook (split/solo/spin state changed)
  onClosed: () => void = () => {};
  onJoin: () => void = () => {};
  /** couple set: slide together when the cat comes close, drift apart when she leaves (display mode only) */
  setPairJoined(j: boolean) { const m = this.models.get('pair'); if (m && !(this.mode !== 'display' && this.current === 'pair')) m.split = j ? 0 : 1; }

  constructor(host: HTMLElement) {
    const r = this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.setSize(innerWidth, innerHeight);
    r.setClearColor(0x000000, 0); r.autoClear = false; r.toneMapping = NeutralToneMapping; r.toneMappingExposure = 0.94;
    r.shadowMap.enabled = true; r.shadowMap.type = PCFShadowMap;
    this.canvas = r.domElement; this.canvas.className = 'shop-gl'; host.appendChild(this.canvas);
    const pm = new PMREMGenerator(r); this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; this.scene.environmentIntensity = 0.5;
    const k = this.key = new DirectionalLight(new Color('#fff0dc'), 1.85);
    k.position.set(-2.2, 3.6, 3.0); k.castShadow = true;
    const sc = k.shadow.camera; sc.left = sc.bottom = -1.5; sc.right = sc.top = 1.5; sc.near = 1; sc.far = 10;
    const small = matchMedia('(pointer: coarse)').matches; k.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048); k.shadow.radius = 3.5; k.shadow.bias = -0.0004; k.shadow.normalBias = 0.012;
    this.scene.add(k, k.target);
    const rim = new DirectionalLight(new Color('#ffd9e2'), 0.55); rim.position.set(2.5, 1.5, -3); this.scene.add(rim);
    this.loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const c = this.controls = new OrbitControls(this.icam, this.canvas);
    c.enablePan = false; c.enableDamping = true; c.dampingFactor = 0.085; c.rotateSpeed = 0.85; c.zoomSpeed = 0.9;
    c.minDistance = 1.9; c.maxDistance = 8.5; c.minPolarAngle = 0.12; c.maxPolarAngle = Math.PI * 0.64;
    c.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }; c.autoRotateSpeed = 1.4; c.enabled = false;
    c.addEventListener('start', () => { this.lastTouch = performance.now(); this.tween = null; });
    c.addEventListener('change', () => { this.lastTouch = Math.max(this.lastTouch, performance.now() - 3600); });
    this.bindTaps();
    window.addEventListener('resize', () => r.setSize(innerWidth, innerHeight));
  }

  // ---------- loading ----------
  progress(id: ExhibitId) { return this.models.has(id) ? 1 : this.prog.get(id) ?? 0; }
  ready(id: ExhibitId) { return this.models.has(id); }
  model(id: ExhibitId) { return this.models.get(id); }
  load(id: ExhibitId): Promise<Model> {
    let p = this.loading.get(id); if (p) return p;
    this.prog.set(id, 0.02);
    if (id === 'pair') {
      const pr = [0.02, 0.02], one = (f: string, i: number) => new Promise<Object3D>((res, rej) => this.loader.load(asset(`models/${f}.glb`), g => res(g.scene),
        e => { if (e.total) { pr[i] = e.loaded / e.total; this.prog.set(id, Math.max(0.02, (pr[0] + pr[1]) / 2) * 0.95); } }, rej));
      p = Promise.all([one('pair-pig', 0), one('pair-cat', 1)]).then(([a, b]) => {
        const grp = new Group(); b.position.x = PAIR_DX; b.userData.side = 1; a.userData.side = -1; grp.add(a, b);
        const m = this.prepare(id, grp);
        for (const pt of m.parts) { let o: Object3D | null = pt.mesh, side = 0; while (o && !side) { side = o.userData.side ?? 0; o = o.parent; } pt.dir.set(side * 0.11, 0, 0); }
        m.split = 1; m.splitT = 1; this.models.set(id, m); this.prog.set(id, 1); this.warm(m); return m;
      });
      this.loading.set(id, p); return p;
    }
    p = new Promise<Model>((res, rej) => this.loader.load(asset(`models/${id}.glb`), g => {
      const m = this.prepare(id, g.scene); this.models.set(id, m); this.prog.set(id, 1); this.warm(m); res(m);
    }, e => { if (e.total) this.prog.set(id, Math.max(0.02, e.loaded / e.total) * 0.95); }, rej));
    this.loading.set(id, p); return p;
  }

  /** compile the model's shader programs right after it loads (during the title card for No.01), so its first
   *  appearance on screen doesn't hitch. Display grounds + inspect grounds are both compiled. */
  private warm(m: Model) {
    try {
      m.root.visible = true;
      this.renderer.compile(this.scene, this.cam);
      this.setGrounds(m, true); this.renderer.compile(this.scene, this.cam); this.setGrounds(m, false);
    } catch { /* best effort */ } finally { m.root.visible = false; }
  }
  private prepare(id: ExhibitId, gs: Object3D): Model {
    const magnet = id.startsWith('magnet');
    const root = new Group(), norm = new Group(), orient = new Group();
    orient.add(gs); norm.add(orient); root.add(norm); this.scene.add(root); root.visible = false;
    if (magnet) orient.rotation.x = Math.PI / 2;                  // relief lies flat on the bed (print up = +Y) -> face the viewer
    root.updateMatrixWorld(true);
    const box = new Box3().setFromObject(orient), c = box.getCenter(new Vector3()), sz = box.getSize(new Vector3());
    const s = 1 / (sz.length() / 2);
    norm.scale.setScalar(s); const baseY = (box.min.y - c.y) * s;
    norm.position.set(-c.x * s, -c.y * s - baseY, -c.z * s);         // pivot (root origin) = centre of the base
    root.position.y = baseY;
    const printInv = { value: new Matrix4() };
    // parts: one material per colour so we can solo / ghost them; layer lines injected
    gs.updateMatrixWorld(true);
    const gsInv = gs.matrixWorld.clone().invert();
    const meshes: Mesh[] = []; gs.traverse(o => { if ((o as Mesh).isMesh) meshes.push(o as Mesh); });
    const pbox = new Box3().setFromObject(gs).applyMatrix4(gsInv), pc = pbox.getCenter(new Vector3()), R = pbox.getSize(new Vector3()).length() / 2;
    const parts: Part[] = meshes.map(mesh => {
      const src = mesh.material as Material & { map?: Texture | null; roughness?: number; metalness?: number; side: number };
      const metal = (src.metalness ?? 0) > 0.2;
      const mat = new MeshPhysicalMaterial({
        map: src.map ?? null, roughness: metal ? 0.36 : 0.62, metalness: metal ? 0.55 : 0,
        sheen: metal ? 0 : 0.22, sheenRoughness: 0.85, sheenColor: new Color('#ffffff'), specularIntensity: metal ? 0.8 : 0.45,
        side: src.side,
      });
      mat.onBeforeCompile = sh => {
        sh.uniforms.uPrintInv = printInv;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform mat4 uPrintInv; varying float vLayer;')
          .replace('#include <project_vertex>', `#include <project_vertex>\nvLayer = (uPrintInv * modelMatrix * vec4(transformed, 1.0)).y * ${LAYER.toFixed(1)};`);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vLayer;')
          .replace('#include <map_fragment>', `#include <map_fragment>
            float lw = fwidth(vLayer); float lf = 1.0 - smoothstep(0.28, 0.85, lw); float ll = 0.5 + 0.5 * cos(6.2831853 * vLayer);
            diffuseColor.rgb *= 1.0 - 0.07 * lf * ll;`)
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + 0.12 * lf * (ll - 0.5), 0.0, 1.0);');
      };
      mat.customProgramCacheKey = () => 'pla-layers';
      mesh.material = mat; mesh.castShadow = true; mesh.receiveShadow = true;
      const b = new Box3().setFromObject(mesh).applyMatrix4(gsInv), mc = b.getCenter(new Vector3());
      return { mesh, key: partKey(mesh.name), mat, home: mesh.position.clone(), dir: mc.sub(pc), op: 1 };
    });
    // explode directions (in GLB/print space: +Y = print up)
    if (magnet) {
      const order = [...parts].sort((a, b) => a.dir.y - b.dir.y);
      order.forEach((p, i) => p.dir.set(p.dir.x * 0.18, R * 0.05 + (i / Math.max(1, order.length - 1)) * R * 0.5, p.dir.z * 0.18));
      order[0].dir.set(0, 0, 0);                                     // plate stays
    } else {
      parts.forEach(p => { const l = p.dir.length() || 1; p.dir.multiplyScalar(0.55).addScaledVector(p.dir, (R * 0.22) / l); });
    }
    // contact shadows: real (ShadowMaterial) + soft blob
    const floor = new Mesh(new PlaneGeometry(7, 7), new ShadowMaterial({ opacity: 0.2, color: new Color('#3a2226') }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; floor.receiveShadow = true; root.add(floor);
    const blob = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: this.blobTex, transparent: true, depthWrite: false, opacity: 0.85 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.003; blob.scale.set(sz.x * s * 1.25, sz.z * s * 1.6, 1); blob.renderOrder = -1; root.add(blob);
    let wall: Mesh | undefined, wallBlob: Mesh | undefined;
    if (magnet) {
      const back = (box.min.z - c.z) * s;
      wall = new Mesh(new PlaneGeometry(7, 7), new ShadowMaterial({ opacity: 0.22, color: new Color('#5a2a35') }));
      wall.position.set(0, -baseY, back - 0.004); wall.receiveShadow = true; root.add(wall);
      wallBlob = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: this.blobTex, transparent: true, depthWrite: false, opacity: 0.5 }));
      wallBlob.position.set(0.04, -baseY - 0.05, back - 0.003); wallBlob.scale.set(sz.x * s * 1.25, sz.y * s * 1.3, 1); root.add(wallBlob);
    }
    const m: Model = { id, magnet, root, print: gs, parts, baseFrac: -baseY, floor, blob, wall, wallBlob, printInv, spin: magnet ? 0 : 0.5, split: 0, splitT: 0, solo: null, sq: 0, sqv: 0 };
    this.setGrounds(m, false);
    return m;
  }
  private setGrounds(m: Model, inspecting: boolean) {
    const wallMode = m.magnet && !inspecting;
    m.floor.visible = m.blob.visible = !wallMode;
    if (m.wall) m.wall.visible = m.wallBlob!.visible = wallMode;
  }

  /** where the model's base sits inside its square display box, as a fraction of the box half-height below centre */
  baseOffset(id: ExhibitId) {
    const m = this.models.get(id); const bf = m ? m.baseFrac : 0.55;
    const el = m?.magnet ? 0.05 : 0.2;
    return (bf * Math.cos(el) * Math.sqrt(D * D - 1)) / (DISPLAY_M * (D + bf * Math.sin(el)));
  }

  // ---------- per-frame ----------
  private place(cam: PerspectiveCamera, rect: Rect, p: Pose) {
    const aspect = rect.w / rect.h; cam.aspect = aspect;
    const t = p.m / Math.sqrt(D * D - 1);
    cam.fov = MathUtils.radToDeg(2 * Math.atan(aspect < 1 ? t / aspect : t)); cam.updateProjectionMatrix();
    const ce = Math.cos(p.el); cam.position.set(Math.sin(p.az) * ce * p.d, Math.sin(p.el) * p.d, Math.cos(p.az) * ce * p.d);
    cam.lookAt(0, 0, 0);
  }
  private draw(m: Model, rect: Rect, cam: PerspectiveCamera) {
    const r = this.renderer, H = innerHeight;
    const x = Math.round(rect.x), y = Math.round(H - rect.y - rect.h), w = Math.round(rect.w), h = Math.round(rect.h);
    if (w < 2 || h < 2 || x > innerWidth || y > H || x + w < 0 || y + h < 0) return;
    m.root.visible = true; m.root.updateMatrixWorld(true);
    m.printInv.value.copy(m.print.matrixWorld).invert();
    r.setViewport(x, y, w, h); r.setScissor(x, y, w, h); r.clearDepth();   // boxes may overlap (the two fridge magnets): later slot wins cleanly
    r.render(this.scene, cam); m.root.visible = false;
  }
  private step(m: Model, dt: number, display: boolean) {
    if (display) m.spin = m.magnet ? Math.sin(performance.now() / 1000 * 0.55 + (m.id === 'magnet-cat' ? 1.7 : 0)) * 0.32 : m.spin + dt * 0.32;
    const was = m.splitT;
    m.splitT += ((m.split ? 1 : 0) - m.splitT) * Math.min(1, dt * (m.id === 'pair' ? 2.6 : 5.5));
    if (m.id === 'pair' && was > 0.04 && m.splitT <= 0.04) { m.sqv += 2.6; this.onJoin(); }   // click! the dovetail closes
    const e = ease(MathUtils.clamp(m.splitT, 0, 1));
    for (const p of m.parts) {
      p.mesh.position.copy(p.home).addScaledVector(p.dir, e / p.mesh.parent!.scale.x);
      const target = m.solo && m.solo !== p.key ? 0.1 : 1;
      if (Math.abs(p.op - target) > 0.002) {
        p.op += (target - p.op) * Math.min(1, dt * 8);
        const tr = p.op < 0.995; if (tr !== p.mat.transparent) { p.mat.transparent = tr; p.mat.depthWrite = !tr; p.mat.needsUpdate = true; }
        p.mat.opacity = p.op; p.mesh.castShadow = p.op > 0.5;
      }
    }
    // jelly squish (spring around the base pivot)
    m.sqv += (-m.sq * 260 - m.sqv * 9) * dt; m.sq += m.sqv * dt;
    m.root.scale.set(1 + m.sq * 0.5, 1 - m.sq, 1 + m.sq * 0.5);
    m.root.rotation.y = m.spin;
  }
  /** render a frame. slots = exhibits currently on screen (display mode). */
  render(slots: Slot[]) {
    const now = performance.now(), dt = Math.min(0.05, (now - this.clock) / 1000); this.clock = now;
    const r = this.renderer; this.stepMood(dt);
    r.setScissorTest(false); r.setViewport(0, 0, innerWidth, innerHeight); r.clear();
    r.setScissorTest(true);
    if (this.mode === 'display') {
      for (const s of slots) { const m = this.models.get(s.id); if (!m) continue; this.step(m, dt, true); this.place(this.cam, s.rect, { az: 0, el: m.magnet ? 0.05 : 0.2, d: D, m: DISPLAY_M }); this.draw(m, s.rect, this.cam); }
      return;
    }
    const m = this.current ? this.models.get(this.current) : undefined; if (!m) return;
    this.step(m, dt, false);
    const to = this.inspectRect();
    if (this.mode === 'opening' || this.mode === 'closing') {
      this.k = Math.min(1, this.k + dt / 0.62);
      const e = ease(this.k), a = this.from(), kk = this.mode === 'opening' ? e : 1 - e;
      const rect = { x: lerp(a.x, to.x, kk), y: lerp(a.y, to.y, kk), w: lerp(a.w, to.w, kk), h: lerp(a.h, to.h, kk) };
      const disp: Pose = { az: 0, el: m.magnet ? 0.05 : 0.2, d: D, m: DISPLAY_M };
      const p0 = this.mode === 'opening' ? disp : this.poseA, p1 = this.mode === 'opening' ? { ...disp, el: m.magnet ? 0.12 : 0.26, m: INSPECT_M } : disp;
      const ee = this.mode === 'opening' ? e : e;
      const pose = { az: lerp(p0.az, p1.az, ee), el: lerp(p0.el, p1.el, ee), d: lerp(p0.d, p1.d, ee), m: lerp(p0.m, p1.m, ee) };
      this.place(this.icam, rect, pose); this.draw(m, rect, this.icam);
      if (this.k >= 1) {
        if (this.mode === 'opening') { this.mode = 'inspect'; this.curM = INSPECT_M; this.controls.enabled = true; this.controls.update(); this.lastTouch = now; }
        else { this.mode = 'display'; this.setGrounds(m, false); m.split = 0; m.splitT = 0; m.solo = null; m.parts.forEach(p => { p.op = 1; p.mat.opacity = 1; p.mat.transparent = false; p.mat.depthWrite = true; p.mat.needsUpdate = true; p.mesh.castShadow = true; }); this.current = null; this.onClosed(); }
      }
      return;
    }
    // inspect
    const c = this.controls;
    if (this.tween) {
      const tw = this.tween; tw.t = Math.min(1, tw.t + dt / tw.dur); const e = ease(tw.t);
      const pose = { az: tw.a.az + wrapPi(tw.b.az - tw.a.az) * e, el: lerp(tw.a.el, tw.b.el, e), d: lerp(tw.a.d, tw.b.d, e), m: INSPECT_M };
      m.spin = lerp(tw.spinA, tw.spinB, e);
      this.place(this.icam, to, pose); c.update();
      if (tw.t >= 1) this.tween = null;
    } else {
      c.autoRotate = this.autoSpin && now - this.lastTouch > 3800;
      const aspect = to.w / to.h; this.icam.aspect = aspect;
      const t = INSPECT_M / Math.sqrt(D * D - 1); this.icam.fov = MathUtils.radToDeg(2 * Math.atan(aspect < 1 ? t / aspect : t)); this.icam.updateProjectionMatrix();
      c.update(dt);
    }
    this.draw(m, to, this.icam);
  }
  private curM = INSPECT_M;
  private pose(): Pose {
    const p = this.icam.position, d = p.length();
    return { az: Math.atan2(p.x, p.z), el: Math.asin(MathUtils.clamp(p.y / d, -1, 1)), d, m: this.curM };
  }

  // ---------- inspect API ----------
  async open(id: ExhibitId, from: () => Rect) {
    const m = await this.load(id);
    if (this.mode !== 'display') return;
    this.current = id; this.from = from; this.k = 0; this.mode = 'opening'; this.tween = null;
    this.setGrounds(m, true); this.canvas.classList.add('on'); this.onChange();
  }
  close(to: () => Rect) {
    if (this.mode !== 'inspect' && this.mode !== 'opening') return;
    this.poseA = this.mode === 'inspect' ? this.pose() : { az: 0, el: 0.2, d: D, m: INSPECT_M };
    this.poseA.az = wrapPi(this.poseA.az);
    this.from = to; this.k = 0; this.mode = 'closing'; this.controls.enabled = false; this.controls.autoRotate = false;
    const m = this.current ? this.models.get(this.current) : null; if (m) m.split = 0;
    this.canvas.classList.remove('on');
  }
  /** browse to another exhibit while inspecting */
  async show(id: ExhibitId) {
    if (this.mode !== 'inspect' || id === this.current) return;
    const m = await this.load(id); const old = this.current ? this.models.get(this.current) : null;
    if (old) { old.split = 0; old.splitT = 0; old.solo = null; old.parts.forEach(p => { p.op = 1; p.mat.opacity = 1; p.mat.transparent = false; p.mat.depthWrite = true; p.mat.needsUpdate = true; p.mesh.castShadow = true; }); this.setGrounds(old, false); }
    this.current = id; this.setGrounds(m, true); m.sqv = -3.5;
    this.reset(0.01); this.onChange();
  }
  reset(dur = 0.7) {
    const m = this.current ? this.models.get(this.current) : null; if (!m || this.mode !== 'inspect') return;
    const hero = m.magnet ? 0 : -0.45;
    const spinB = m.spin + wrapPi(hero - m.spin);
    this.tween = { t: 0, dur, a: this.pose(), b: { az: 0, el: m.magnet ? 0.12 : 0.26, d: D, m: INSPECT_M }, spinA: m.spin, spinB };
    this.lastTouch = performance.now();
  }
  toggleSplit() {
    const m = this.current ? this.models.get(this.current) : null; if (!m) return false;
    m.split = m.split ? 0 : 1; this.lastTouch = performance.now() - 2000;
    if (m.split && m.magnet && this.mode === 'inspect') {           // show the stacked layers from a three-quarter angle
      this.tween = { t: 0, dur: 0.9, a: this.pose(), b: { az: 0.85, el: 0.42, d: D * 1.08, m: INSPECT_M }, spinA: m.spin, spinB: m.spin };
    }
    this.onChange(); return !!m.split;
  }
  split() { const m = this.current ? this.models.get(this.current) : null; return !!m?.split; }
  solo(key: string | null) { const m = this.current ? this.models.get(this.current) : null; if (!m) return; m.solo = m.solo === key ? null : key; this.lastTouch = performance.now() - 2000; this.onChange(); }
  soloKey() { const m = this.current ? this.models.get(this.current) : null; return m?.solo ?? null; }
  partKeys(id: ExhibitId) { const m = this.models.get(id); return m ? [...new Set(m.parts.map(p => p.key))] : []; }
  squish(id = this.current) { const m = id ? this.models.get(id) : null; if (m) m.sqv += 4.2; }

  private bindTaps() {
    let down: { x: number; y: number; t: number } | null = null, lastTap = 0, pointers = 0;
    this.canvas.addEventListener('pointerdown', e => { pointers++; down = pointers === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; });
    const up = (e: PointerEvent) => {
      pointers = Math.max(0, pointers - 1);
      if (!down || this.mode !== 'inspect') { down = null; return; }
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
      if (moved > 8 || dt > 300) return;
      const now = performance.now();
      if (now - lastTap < 320) { lastTap = 0; this.reset(); } else { lastTap = now; this.squish(); }
    };
    this.canvas.addEventListener('pointerup', up); this.canvas.addEventListener('pointercancel', () => { pointers = Math.max(0, pointers - 1); down = null; });
  }
}
export { EXHIBITS };
