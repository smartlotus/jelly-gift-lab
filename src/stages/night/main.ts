// Stage 3 · Night (v03f: the branching night). First-person blocky (Minecraft-STYLE) found-footage walk, now a small map:
// from the fork three ways (forest / the old house / the graveyard) meet again at the gate clearing; the gate wants our
// day one (note pieces on each route), then three endings: caught at the dead end, the last bus, and — with all five
// hidden "??" stickers — the tree house. Hold to walk along the path, drag to look, tap a "??" to pick it up; choices
// at junctions, "turn back" any time, a camcorder map with fast-forward to visited places. Progress is saved
// (localStorage). Every ending flips to the pastel kawaii page -> /jelly/. Map + routes: map.ts; puzzles: puzzles.ts.
import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Color, DirectionalLight, Float32BufferAttribute, FogExp2, Group, HemisphereLight, LinearFilter,
  Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, PointLight, Points, PointsMaterial, Raycaster, Scene, Sprite, SpriteMaterial, Vector2, Vector3, WebGLRenderTarget, WebGLRenderer,
} from 'three';
import { markReached, params, dev, prefetchNext } from '../../shared/flow';
import { register, t, apply, lang, onLang } from '../../shared/i18n';
import { mountChrome, startCard } from '../../shared/chrome';
import { soundOn, setSound, unlock, onSound } from '../../shared/audio';
import { irisIn } from '../../shared/transition';
import { hold, progress as curtainProgress } from '../../shared/curtain';
import * as dict from './dict';
import { getAtlas } from './textures';
import { buildWorld } from './world';
import { EDGE, EDGES, NODES, at, yawAt, exits, exitYaw, type Edge, type NodeId } from './map';
import { makePig, qqTexture, glow } from './pig';
import { makeHand } from './hand';
import { makePost } from './post';
import { makeHud } from './hud';
import { sfx, pzSfx, night } from './sfx';
import { showKawaii, type Ending } from './kawaii';
import { mushrooms, trail, gate as buttLock, musicBox, candles, codeLock, foundCard } from './puzzles';
import { makeProps, beside } from './props';
import { makeUI, openMap } from './ui';
import { load, store, fresh, hasProgress, type Save } from './save';
import './style.css';

declare global { interface Window { __pause?: boolean; __steps?: number; __night?: unknown } }
register(dict); mountChrome({ theme: 'dark' }); markReached();
const host = document.getElementById('game')!;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer: coarse)').matches;
const at0 = params.get('at');
const EYE = 1.62, WALK = 2.05;
const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

if (at0 === 'kawaii') showKawaii(document.body, (params.get('end') as Ending) || 'caught'); else void boot();

async function boot() {
  let renderer: WebGLRenderer;
  try { renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }); }
  catch { void startCard('night.kicker', 'night.title', 'night.sub').then(() => showKawaii()); return; }
  const release = hold(); curtainProgress(0.05);
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight); renderer.autoClear = false;
  const cv = renderer.domElement; cv.className = 'n-canvas'; cv.setAttribute('role', 'img'); cv.dataset.i18nAria = 'night.canvas'; host.appendChild(cv);
  const black = document.createElement('div'); black.className = 'n-black'; host.appendChild(black);
  const hint = document.createElement('p'); hint.className = 'n-hint'; hint.dataset.i18n = touch ? 'night.hint.touch' : 'night.hint.key'; host.appendChild(hint);
  const say = document.createElement('p'); say.className = 'n-say'; host.appendChild(say);
  apply(host);
  const hud = makeHud(host); const ui = makeUI(host);
  let fpsEl: HTMLElement | null = null; if (dev) { fpsEl = document.createElement('div'); fpsEl.className = 'n-fps'; host.appendChild(fpsEl); }

  // ---- save ----------------------------------------------------------------------------------------------------------
  const prev = load();
  let S: Save = prev ?? fresh();
  if (params.has('fresh')) S = fresh(S.endings);
  const give = params.get('give');
  if (give) { S.notes = [true, true, true]; S.candle = true; if (give === 'all') S.stickers = ['st1', 'st2', 'st3', 'st4', 'st5']; S.solved = ['mush', 'trail', 'music', 'candles', 'grate', 'code']; S.nodes = Object.keys(NODES); S.edges = EDGES.map(e => e.id); }
  const save = () => store(S);
  const has = (k: string) => S.solved.includes(k);
  const solve = (k: string) => { if (!has(k)) S.solved.push(k); save(); };

  // ---- world -------------------------------------------------------------------------------------------------------
  const scene = new Scene(); const FOG = new Color('#070a12'); const fog = new FogExp2(FOG, 0.1);
  scene.background = FOG; scene.fog = fog;
  const cam = new PerspectiveCamera(70, 1, 0.05, 140); cam.rotation.order = 'YXZ';
  const world = await buildWorld(getAtlas(), p => curtainProgress(0.05 + p * 0.9)); scene.add(world.group);
  scene.add(new HemisphereLight('#34446f', '#0b0d12', 0.5));
  const moonL = new DirectionalLight('#9fb3e6', 0.22); moonL.position.set(-0.5, 1, -0.6); scene.add(moonL);
  const torch = new PointLight('#ffb35c', 14, 15, 1.35); scene.add(torch);
  const lamp = new PointLight('#ffc27a', 0, 12, 1.4); scene.add(lamp);
  const sky = new Group(); scene.add(sky);
  const moon = new Mesh(new PlaneGeometry(7, 7), new MeshBasicMaterial({ color: '#e9ecf4', fog: false })); moon.position.set(-26, 44, -92); moon.lookAt(0, 0, 0); sky.add(moon);
  const mh = glow('170,190,240', 40, 0.35); mh.position.copy(moon.position); sky.add(mh);
  { const n = 420, p = new Float32Array(n * 3); let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, e = 0.12 + r() * 1.3, R = 110; p.set([Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R], i * 3); }
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(p, 3));
    sky.add(new Points(g, new PointsMaterial({ color: '#c9d4f0', size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 }))); }
  // fireflies along the outdoor paths (only the ones near the camera are updated)
  const FF = 160, ffBase: number[][] = [], ffPos = new Float32Array(FF * 3), ffCol = new Float32Array(FF * 3);
  { const out = EDGES.filter(e => e.theme !== 'house' && e.theme !== 'tunnel'); for (let i = 0; i < FF; i++) { const e = out[i % out.length]; const [x, z] = at(e, Math.random() * e.len); ffBase.push([x + (Math.random() - 0.5) * 9, z + (Math.random() - 0.5) * 9, 0.4 + Math.random() * 2.2, Math.random() * 10]); } }
  const ffGeo = new BufferGeometry(); ffGeo.setAttribute('position', new Float32BufferAttribute(ffPos, 3)); ffGeo.setAttribute('color', new Float32BufferAttribute(ffCol, 3));
  const dotC = document.createElement('canvas'); dotC.width = dotC.height = 32; { const g = dotC.getContext('2d')!; const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }
  const fireflies = new Points(ffGeo, new PointsMaterial({ size: 0.22, map: new CanvasTexture(dotC), vertexColors: true, blending: AdditiveBlending, depthWrite: false, transparent: true }));
  fireflies.frustumCulled = false; scene.add(fireflies);

  const props = makeProps(scene, lang); onLang(l => props.setLang(l));
  const pig = makePig(); scene.add(pig.root);
  const glimpse = new Sprite(new SpriteMaterial({ map: qqTexture(), transparent: true, opacity: 0 })); glimpse.scale.set(0.8, 0.42, 1); glimpse.visible = false; scene.add(glimpse);
  const hand = makeHand(); const post = makePost();
  const rt = new WebGLRenderTarget(2, 2, { minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: true });
  // restore world state from the save
  if (has('music')) props.musicDoor.open(); if (has('candles')) props.cryptDoor.open(); if (has('grate')) props.grate.open(); if (has('code')) props.gate.open();
  if (S.stickers.length >= 5) props.unlockTree(true);
  for (const id of S.stickers) props.take(id);
  if (S.notes[0]) props.take('noteA'); if (S.notes[1]) props.take('noteB'); else if (has('music')) props.show('noteB');
  if (S.notes[2]) props.take('noteC'); else if (has('candles')) props.show('noteC'); if (S.candle) props.take('candle'); else if (has('candles')) props.show('candle');
  const syncInv = () => ui.setInv(S.notes, S.candle, S.stickers.length); syncInv();

  const resize = () => {
    const w = innerWidth, h = innerHeight, a = w / h;
    renderer.setSize(w, h);
    const rh = Math.round(Math.min(560, Math.max(260, h * Math.min(devicePixelRatio || 1, 2) * 0.62)));
    rt.setSize(Math.round(rh * a), rh);
    cam.aspect = a; cam.fov = a < 0.75 ? 82 : a < 1.2 ? 76 : 68; cam.updateProjectionMatrix(); hand.resize(a);
    post.u.uRes.value.set(w * DPR, h * DPR);
  };
  resize(); window.addEventListener('resize', resize);

  // ---- input -------------------------------------------------------------------------------------------------------
  const ptrs = new Map<number, { x: number; y: number; x0: number; y0: number; t0: number }>(); const keys = new Set<string>();
  let yawOff = 0, pitch = 0, lastLook = -9;
  const ray = new Raycaster(), ndc = new Vector2();
  cv.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() }); cv.setPointerCapture(e.pointerId); unlock(); });
  cv.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const k = 4.2 / Math.min(innerWidth, innerHeight * 1.4);
    const lock = phase === 'face' || phase === 'turn' || phase === 'scene';
    yawOff += (e.clientX - p.x) * k * (lock ? 0 : 1); pitch = Math.max(-0.6, Math.min(0.5, pitch + (e.clientY - p.y) * k * 0.8 * (lock ? 0 : 1)));
    p.x = e.clientX; p.y = e.clientY; lastLook = T;
  });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  const up = (e: PointerEvent) => {
    const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId);
    if (p && e.type === 'pointerup' && performance.now() - p.t0 < 320 && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 12) tap(e.clientX, e.clientY);
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', up);
  window.addEventListener('keydown', e => { keys.add(e.code); if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (phase === 'node' && /^Digit[1-4]$/.test(e.code)) { const b = document.querySelectorAll<HTMLButtonElement>('.nv-c')[+e.code.slice(5) - 1]; b?.click(); }
    if (e.code === 'KeyM') openTheMap(); if (e.code === 'KeyB' && phase === 'walk') turnBack(); });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); ptrs.clear(); });
  const walking = () => ptrs.size > 0 || keys.has('KeyW') || keys.has('ArrowUp') || keys.has('Space');

  // tap a "??" sticker to pick it up
  function tap(x: number, y: number) {
    if (phase !== 'walk' && phase !== 'node') return;
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
    let best: string | null = null, bd = 9.5;
    for (const p of props.pickups.values()) { if (p.kind !== 'sticker' || p.taken || !p.obj.visible) continue;
      const d = p.pos.distanceTo(cam.position); if (d > bd) continue;
      const v = p.pos.clone().sub(ray.ray.origin); const along = v.dot(ray.ray.direction); if (along < 0) continue;
      const off = v.sub(ray.ray.direction.clone().multiplyScalar(along)).length(); if (off < 0.55 + d * 0.06) { best = p.id; bd = d; } }
    if (!best) return;
    props.take(best); S.stickers.push(best); save(); syncInv(); ui.bump('st'); night.sparkle();
    const n = S.stickers.length; ui.toast(t(n >= 5 ? 'night.st.all' : 'night.st.got').replace('{n}', String(n)), 3200);
    if (n >= 5) props.unlockTree();
  }

  // ---- state -------------------------------------------------------------------------------------------------------
  type Phase = 'card' | 'boot' | 'walk' | 'node' | 'puzzle' | 'scene' | 'chase' | 'dead' | 'turn' | 'face' | 'static' | 'done';
  let phase: Phase = 'card', T = 0, pt = 0, speed = 0, bob = 0, lastStepHalf = 0, shake = 0, tension = 0, idle = 0, noInput = 0;
  let cur: { e: Edge; s: number; dir: 1 | -1 } = { e: EDGE.s, s: 0.6, dir: 1 }; let node: NodeId | null = null;
  let camYaw = 0, torchOff: [number, number][] = [], pigGap = 99, crossT = -1, crossAt: [number, number, number, number] = [0, 0, 0, 0], glimpseT = -1, heavyT = 0, beatT = 0, turnFrom = 0, flipped = false, ffT = -1, sceneT = 0;
  let stalk = false, ending: Ending | null = null;
  const setPhase = (p: Phase) => { phase = p; pt = 0; };
  const sayIt = (key: string, soft = false) => { say.textContent = t(key); say.className = 'n-say' + (soft ? ' soft' : ''); void say.offsetWidth; say.classList.add('on'); };
  const pos = () => at(cur.e, cur.s);

  function placeAt(n: NodeId) {
    const ex = exits(n)[0]; cur = { e: ex.e, s: ex.s, dir: ex.dir }; camYaw = yawAt(cur.e, cur.s, cur.dir);
  }
  // dev / resume start
  const startNode: NodeId | null = at0 && at0 in NODES ? at0 as NodeId : (!params.has('fresh') && hasProgress(prev) ? S.node : null);
  if (startNode) placeAt(startNode); else camYaw = yawAt(cur.e, cur.s, 1);

  // ---- junctions -----------------------------------------------------------------------------------------------------
  const lockedTree = () => S.stickers.length < 5;
  function arrive(n: NodeId, fromEdge: Edge | null) {
    node = n; speed = 0; S.node = n; if (!S.nodes.includes(n)) S.nodes.push(n); save();
    const first = (k: string) => { if (S.scares.includes(k)) return false; S.scares.push(k); save(); return true; };
    if (n === 'W1' && !has('trail')) { runPuzzle('trail', trail, () => offer(n, fromEdge)); return; }
    if (n === 'W2') { if (first('owl')) { props.scare.owl(); night.ooo(); sayIt('night.sc.owl', true); }
      if (!S.notes[0]) { setTimeout(() => takeNote(0, 'noteA'), first('owlwait') ? 2600 : 200); } }
    if (n === 'H2') { if (first('cup')) { setPhase('scene'); props.scare.cupboard(); night.horn(); sayIt('night.sc.cup', true); setTimeout(() => arrive(n, fromEdge), 3600); return; }
      if (!has('music')) { runPuzzle('music', musicBox, () => { props.musicDoor.open(); pzSfx.creak(); props.show('noteB'); setTimeout(() => takeNote(1, 'noteB'), 600); offer(n, fromEdge); }); return; } }
    if (n === 'E2' && !has('candles')) { runPuzzle('candles', candles, () => { props.cryptDoor.open(); pzSfx.creak(); props.show('noteC'); props.show('candle');
      setTimeout(() => { takeNote(2, 'noteC'); setTimeout(() => { S.candle = true; save(); props.take('candle'); syncInv(); ui.bump('candle'); night.pickup(); ui.toast(t('night.got.candle'), 3200); }, 3600); }, 900); offer(n, fromEdge); }); return; }
    if (n === 'BUS') { endBus(); return; }
    if (n === 'TREE') { endTree(); return; }
    if (n === 'G2' && !S.nodes.includes('G2x')) { S.nodes.push('G2x'); sayIt('night.g2', true); }
    offer(n, fromEdge);
  }
  function takeNote(i: 0 | 1 | 2, id: string) {
    if (S.notes[i]) return; S.notes[i] = true; save(); props.take(id); syncInv(); ui.bump('notes'); night.pickup();
    const digits = ['0 5 _ _', '_ _ 0 _', '_ _ _ 3'][i];
    const was = phase; setPhase('puzzle');
    void foundCard('night.got.note', `<b>${digits}</b><small>${t('night.got.note.' + i)}</small>`).then(() => { if (phase === 'puzzle') setPhase(was === 'puzzle' ? 'node' : was); });
  }
  function offer(n: NodeId, fromEdge: Edge | null) {
    const list = exits(n);
    // pass-through: two ways, not a stop -> keep walking
    if (!NODES[n].stop && list.length === 2 && fromEdge) {
      const next = list.find(x => !(x.e === fromEdge && ((x.dir === 1 && cur.dir === -1) || (x.dir === -1 && cur.dir === 1)))) ?? list[0];
      cur = { e: next.e, s: next.s, dir: next.dir }; node = null; setPhase('walk'); return;
    }
    setPhase('node'); ui.setBack(false);
    const face = camYaw;
    ui.showChoices(list.map((x, i) => {
      const key = `${x.e.id}:${x.dir}:${i}`;
      const back = fromEdge && x.e === fromEdge && x.dir === -cur.dir && x.e.a !== x.e.b;
      const lbl = t(`night.go.${x.e.id}.${x.dir}`);
      return { key, label: lbl, back: !!back, ang: angDiff(exitYaw(x), face), locked: (x.e.id === 'tree' && lockedTree()) || (x.e.id === 'tun' && !S.candle),
        glow: (n === 'W1' && x.e.id === 'w12') || (x.e.id === 'tree' && !lockedTree()) };
    }), key => {
      const [id, d] = key.split(':'); const e = EDGE[id], dir = (+d) as 1 | -1;
      ui.hideChoices(); cur = { e, s: dir === 1 ? 0 : e.len, dir }; node = null; idle = 0; noInput = 0; setPhase('walk'); ui.setBack(true, turnBack);
      if (!S.edges.includes(id)) { S.edges.push(id); save(); }
      area();
    });
  }
  function turnBack() { if (phase !== 'walk') return; cur.dir = (-cur.dir) as 1 | -1; yawOff = 0; ui.toast(t('night.ui.turned'), 1400); }
  function runPuzzle(k: string, run: () => Promise<unknown>, then: () => void) {
    setPhase('puzzle'); ui.hideChoices(); ui.setBack(false); hint.classList.remove('on'); ptrs.clear(); keys.clear();
    void run().then(() => { solve(k); keys.clear(); ptrs.clear(); noInput = 0; setPhase('walk'); then(); });
  }
  const area = () => { night.area(cur.e.theme); };

  // locks on the paths: [edge, s, ok, what happens when blocked]
  type Lock = { e: string; s: number; ok: () => boolean; block: () => void };
  const doorS = (() => { const e = EDGE.h23; let s = 0; for (; s < e.len; s += 0.25) if (at(e, s)[1] <= -88.6) break; return s; })();
  const bounce = (key: string) => { sayIt(key, true); cur.dir = (-cur.dir) as 1 | -1; speed = 0; };
  const LOCKS: Lock[] = [
    { e: 'h23', s: doorS, ok: () => has('music'), block: () => bounce('night.lock.door') },
    { e: 'tun', s: 4, ok: () => S.candle, block: () => bounce('night.lock.dark') },
    { e: 'tun', s: EDGE.tun.len - 4, ok: () => S.candle, block: () => bounce('night.lock.dark') },
    { e: 'tun', s: 20, ok: () => has('grate'), block: () => runPuzzle('grate', buttLock, () => { props.grate.open(); pzSfx.creak(); }) },
    { e: 'gg', s: 4.6, ok: () => has('code'), block: () => runPuzzle('code', () => codeLock([S.notes[0], S.notes[0], S.notes[1], S.notes[2]]), () => { props.gate.open(); pzSfx.creak(); prefetchNext(); }) },
    { e: 'tree', s: 3.2, ok: () => !lockedTree(), block: () => { ui.toast(t('night.lock.tree').replace('{n}', String(S.stickers.length)), 3400); bounce('night.lock.tree.say'); } },
  ];
  // one-shot beats along the paths: [edge, s, dir or 0, id, fn]
  const BEATS: [string, number, number, string, () => void][] = [
    ['s', 15, 1, 'mush', () => { if (!has('mush')) runPuzzle('mush', mushrooms, () => {}); }],
    ['s', 27, 1, 'qq', () => { glimpseT = 0; const [gx, gz] = beside(cur.e, cur.s + 9, -4.3); glimpse.position.set(gx, 2.3, gz); glimpse.visible = true; sfx.rustle(); }],
    ['s', 34, 1, 'flick', () => { torchOff = [[T, T + 0.12], [T + 0.22, T + 0.82]]; sfx.torchOut(); }],
    ['s', 39, 1, 'cross1', () => cross()],
    ['h01', 7.5, 1, 'portrait', () => { props.scare.portrait(); setTimeout(() => { night.boing(); sayIt('night.sc.portrait', true); shake = 0.6; }, 900); }],
    ['e12', 11, 1, 'ghost', () => { props.scare.ghost(); night.ooo(); setTimeout(() => sayIt('night.sc.ghost', true), 1900); }],
    ['tun', 9, 1, 'bats', () => { props.scare.bats(); night.flutter(); setTimeout(() => sayIt('night.sc.bats', true), 1500); }],
    ['w2g', 22, 1, 'cross2', () => cross()],
    ['h3g', 18, 1, 'stalk', () => { stalk = true; pigGap = 17; pig.root.visible = true; pig.setEyes(0.4); sfx.grunt(0.08); }],
    ['w2g', 40, 1, 'stalk2', () => { stalk = true; pigGap = 17; pig.root.visible = true; pig.setEyes(0.4); sfx.grunt(0.08); }],
    ['end', 6, 1, 'chase', () => startChase()],
  ];
  function cross() { crossT = 0; const ahead = cur.s + 15 * cur.dir; const [ax, az] = beside(cur.e, ahead, -7), [bx, bz] = beside(cur.e, ahead, 7); crossAt = [ax, az, bx, bz]; sfx.heavyStep(0.12); }

  const startChase = () => {
    setPhase('chase'); tension = 1; sayIt('night.run'); prefetchNext(); sfx.crickets(false); sfx.wind(0.16); ui.setBack(false); ui.hideAll(true);
    stalk = true; pigGap = 13; pig.root.visible = true; pig.setEyes(1);
  };
  function endBus() {
    setPhase('scene'); sceneT = 0; ending = 'bus'; ui.hideAll(true); ui.setBack(false); props.busArrive(); night.engine(true); prefetchNext();
    setTimeout(() => { night.engine(false); sayIt('night.end.bus.say', true); }, 5200);
    setTimeout(() => { setPhase('static'); sfx.staticBurst(); }, 8200);
  }
  function endTree() {
    setPhase('scene'); sceneT = 0; ending = 'best'; ui.hideAll(true); ui.setBack(false); props.treeScene(); night.sparkle(); prefetchNext();
    setTimeout(() => sayIt('night.end.best.say', true), 3200);
    setTimeout(() => { night.sparkle(); flip(); }, 8000);
  }

  // ---- update -----------------------------------------------------------------------------------------------------
  function update(dt: number) {
    pt += dt;
    if (phase === 'card') return;
    if (phase === 'boot') { if (pt > 1.1) { setPhase('walk'); hint.classList.add('on'); ui.setBack(true, turnBack); area(); if (startNode && startNode !== 'S') arrive(startNode, null); } return; }
    T += dt; props.update(dt, T); night.tick(T);
    if (ffT >= 0) { ffT += dt; if (ffT > 0.9) ffT = -1; }
    if (phase === 'puzzle') { speed *= Math.max(0, 1 - dt * 6); sfx.tick(T, tension); return; }
    // walking
    let target = 0;
    if (phase === 'walk') { noInput = walking() ? 0 : noInput + dt; target = walking() ? WALK : noInput > 12 ? WALK * 0.55 : 0; }
    if (phase === 'chase') target = Math.max(4.2, (cur.e.len - 2.4 - cur.s) / 8);
    speed += (target - speed) * Math.min(1, dt * (phase === 'chase' ? 3 : 5));
    if (phase === 'walk' || phase === 'chase') {
      const s0 = cur.s; let s1 = cur.s + speed * dt * cur.dir;
      for (const L of LOCKS) if (L.e === cur.e.id && !L.ok()) {
        const stopAt = L.s - 1.1 * cur.dir;
        if ((cur.dir === 1 && s0 <= stopAt + 0.01 && s1 >= stopAt) || (cur.dir === -1 && s0 >= stopAt - 0.01 && s1 <= stopAt)) { s1 = stopAt; cur.s = s1; L.block(); return; }
      }
      for (const [eid, bs, bd, id, fn] of BEATS) if (eid === cur.e.id && (bd === 0 || bd === cur.dir) && !S.scares.includes(id) && ((s0 < bs && s1 >= bs) || (s0 > bs && s1 <= bs))) { S.scares.push(id); save(); fn(); if ((phase as Phase) === 'puzzle' || (phase as Phase) === 'chase') { cur.s = s1; return; } }
      cur.s = s1;
      if (phase === 'chase' && cur.s >= cur.e.len - 2.4) { cur.s = cur.e.len - 2.4; setPhase('dead'); sayIt('night.dead', true); }
      else if ((cur.dir === 1 && cur.s >= cur.e.len) || (cur.dir === -1 && cur.s <= 0)) { const n = cur.dir === 1 ? cur.e.b : cur.e.a; cur.s = Math.max(0, Math.min(cur.e.len, cur.s)); arrive(n, cur.e); }
    }
    bob += speed * dt * 3.3;
    const half = Math.floor(bob / Math.PI); if (half !== lastStepHalf && speed > 0.3) { lastStepHalf = half; sfx.step(phase === 'chase'); }
    if (keys.has('ArrowLeft') || keys.has('KeyA')) { yawOff += dt * 1.8; lastLook = T; }
    if (keys.has('ArrowRight') || keys.has('KeyD')) { yawOff -= dt * 1.8; lastLook = T; }
    if (phase !== 'turn' && phase !== 'face' && phase !== 'static' && phase !== 'node' && ptrs.size === 0 && T - lastLook > 1.2) {
      yawOff = Math.atan2(Math.sin(yawOff), Math.cos(yawOff)); yawOff -= yawOff * Math.min(1, dt * 1.6); pitch -= pitch * Math.min(1, dt * 1.6);
    }
    // the camera turns smoothly onto the path direction
    const want = yawAt(cur.e, cur.s, cur.dir); camYaw += angDiff(want, camYaw) * Math.min(1, dt * (phase === 'chase' ? 8 : 4.5));
    if (phase === 'walk') { if (speed > 0.5) { idle = 0; if (T > 4) hint.classList.remove('on'); } else if ((idle += dt) > 7) hint.classList.add('on'); } else hint.classList.remove('on');

    if (glimpseT >= 0) { glimpseT += dt; const m = glimpse.material; m.opacity = glimpseT < 0.25 ? glimpseT / 0.25 : Math.max(0, 1 - (glimpseT - 1.1) / 0.3); glimpse.position.y = 2.3 + Math.sin(glimpseT * 5) * 0.05; if (glimpseT > 1.4) { glimpseT = -1; glimpse.visible = false; } }
    // the shape crossing the path ahead (it is the pig, dimly)
    if (crossT >= 0) {
      crossT += dt; const k = Math.min(1, crossT / 2.6); const ease = k < 0.45 ? k / 0.45 * 0.5 : k < 0.6 ? 0.5 : 0.5 + (k - 0.6) / 0.4 * 0.5;
      pig.root.visible = true; pig.setEyes(k > 0.45 && k < 0.6 ? 0.9 : 0.25);
      pig.root.position.set(crossAt[0] + (crossAt[2] - crossAt[0]) * ease, 0, crossAt[1] + (crossAt[3] - crossAt[1]) * ease);
      pig.root.rotation.y = k > 0.45 && k < 0.6 ? camYaw + Math.PI : Math.atan2(crossAt[2] - crossAt[0], crossAt[3] - crossAt[1]); pig.animate(dt, k > 0.45 && k < 0.6 ? 0 : 3, 0.2, T);
      if (crossT > 2.6) { crossT = -1; if (!stalk) pig.root.visible = false; }
    }
    // stalking / chasing pig behind the camera
    if (stalk && crossT < 0 && (phase === 'walk' || phase === 'chase' || phase === 'dead' || phase === 'node')) {
      const gapTarget = phase === 'chase' ? 3.2 + 9 * Math.max(0, (cur.e.len - 2.4 - cur.s) / (cur.e.len - 8)) : phase === 'dead' ? 1.4 : 15;
      pigGap += (gapTarget - pigGap) * Math.min(1, dt * (phase === 'dead' ? 1.6 : 0.8));
      const ps = cur.s - pigGap * cur.dir; const [px, pz] = at(cur.e, ps); const [cx, cz] = pos();
      pig.root.position.set(px, 0, pz); pig.root.rotation.y = Math.atan2(cx - px, cz - pz);
      pig.animate(dt, phase === 'chase' ? 4 : speed > 0.3 ? 1.2 : 0, 1, T);
      heavyT += dt; const every = phase === 'chase' ? 0.36 : 0.85;
      if (heavyT > every && (phase !== 'walk' || speed > 0.3)) { heavyT = 0; sfx.heavyStep(phase === 'walk' ? 0.07 : 0.16 + (1 - pigGap / 13) * 0.12); }
      // the stalker gives up when you reach a junction (it is shy)
      if (phase === 'node' && pigGap > 12) { stalk = false; pig.root.visible = false; }
    }
    if (phase === 'chase' || phase === 'dead') { beatT += dt; if (beatT > (phase === 'dead' ? 0.5 : 0.62)) { beatT = 0; sfx.heartbeat(0.22); } }
    if (phase === 'chase') shake = reduce ? 0.2 : 0.8;
    if (phase === 'dead') { shake = reduce ? 0.1 : 0.35; if (pt > 1.5) { setPhase('turn'); turnFrom = yawOff; sfx.grunt(0.14); } }
    if (phase === 'turn') {
      const k = Math.min(1, pt / 0.48), e = k * k * (3 - 2 * k);
      const back = Math.PI * (turnFrom > 0 ? 1 : -1);
      yawOff = turnFrom + (back - turnFrom) * e; pitch += (0.08 - pitch) * Math.min(1, dt * 8);
      if (k >= 1) { setPhase('face'); sfx.heavyStep(0.3); }
    }
    if (phase === 'turn' || phase === 'face') {
      const fill = 0.66 / (Math.tan((cam.fov * Math.PI) / 360) * Math.min(cam.aspect, 1.25)) + 0.46;
      const lean = phase === 'face' ? fill - Math.min(0.08, pt * 0.3) : fill + 0.8 - Math.min(1, pt / 0.48) * 0.8;
      const by = camYaw + (phase === 'turn' ? Math.PI * (turnFrom > 0 ? 1 : -1) : yawOff); fwd.set(-Math.sin(by), 0, -Math.cos(by));
      const [cx, cz] = pos();
      pig.root.position.set(cx + fwd.x * lean, EYE - 2.54 + 0.05, cz + fwd.z * lean);
      pig.root.rotation.y = Math.atan2(-fwd.x, -fwd.z); pig.root.visible = true; pig.setEyes(1.2); pig.animate(dt, 0, 1, T);
    }
    if (phase === 'face' && pt > 0.25) { ending = 'caught'; setPhase('static'); sfx.staticBurst(); }
    if (phase === 'static' && pt > 0.35) flip();
    if (phase === 'scene') sceneT += dt;
    if (phase !== 'chase' && phase !== 'dead') shake *= Math.max(0, 1 - dt * 6);
    sfx.tick(T, tension);
  }
  const fwd = new Vector3();

  function flip() {
    if (flipped) return; flipped = true; const end = ending ?? 'caught';
    if (!S.endings.includes(end)) S.endings.push(end); S.node = 'G2'; save();
    setPhase('done'); ui.hideAll(true);
    showKawaii(document.body, end, { endings: S.endings.length, stickers: S.stickers.length });
    requestAnimationFrame(() => requestAnimationFrame(() => { stop(); host.remove(); renderer.dispose(); rt.dispose(); renderer.forceContextLoss(); }));
  }

  // ---- the map + fast-forward ----------------------------------------------------------------------------------------
  function openTheMap() {
    if (phase === 'card' || phase === 'boot' || phase === 'puzzle' || phase === 'chase' || phase === 'dead' || phase === 'turn' || phase === 'face' || phase === 'static' || phase === 'done' || phase === 'scene') return;
    const [x, z] = pos(); const canGo = phase === 'node' || phase === 'walk';
    openMap({ x, z }, S.nodes, S.edges, canGo, n => {
      if (n === node) return; ffT = 0; night.flutter(); ui.hideChoices(); stalk = false; pig.root.visible = false;
      setTimeout(() => { placeAt(n); const ex = exits(n)[0]; arrive(n, null); void ex; ui.toast(t('night.ui.ff'), 1400); }, 450);
    }, { tree: !lockedTree() });
  }
  ui.setMap(openTheMap);

  // ---- render -----------------------------------------------------------------------------------------------------
  const FOGS: Record<string, [string, number]> = { forest: ['#070a12', 0.1], house: ['#0a0809', 0.12], grave: ['#0f121a', 0.085], tunnel: ['#030305', 0.16], clear: ['#070a12', 0.09], road: ['#0a0d16', 0.07], pink: ['#120a10', 0.075], end: ['#070a12', 0.1] };
  const fogC = new Color(), fogT = new Color();
  function render() {
    const tt = performance.now() / 1000;
    const [px, pz] = pos();
    const bobA = Math.min(1, speed / WALK) * (reduce ? 0.3 : 1);
    const sh = shake * 0.02;
    cam.position.set(px + Math.cos(bob) * 0.03 * bobA + (Math.random() - 0.5) * sh, EYE + Math.abs(Math.sin(bob)) * 0.055 * bobA + (Math.random() - 0.5) * sh, pz);
    const drift = reduce ? 0 : 1;
    cam.rotation.set(pitch + Math.sin(tt * 0.9) * 0.008 * drift + Math.sin(bob * 2) * 0.006 * bobA, camYaw + yawOff + Math.sin(tt * 0.63) * 0.012 * drift, Math.sin(tt * 0.77) * 0.006 * drift + Math.sin(bob) * 0.008 * bobA);
    sky.position.copy(cam.position);
    world.cull(px, pz);
    // fog by area (eased)
    const [fc, fd] = FOGS[cur.e.theme] ?? FOGS.forest; fogT.set(fc); fogC.copy(fog.color).lerp(fogT, 0.04); fog.color.copy(fogC); (scene.background as Color).copy(fogC); fog.density += (fd - fog.density) * 0.04;
    // torch + the nearest lamp
    const flick = reduce ? 0.5 : 0.5 + 0.25 * Math.sin(tt * 13.1) + 0.18 * Math.sin(tt * 27.7 + 1) + 0.12 * Math.sin(tt * 5.3);
    const lit = !torchOff.some(([a, b]) => T >= a && T < b);
    const by = camYaw + yawOff; fwd.set(-Math.sin(by), 0, -Math.cos(by));
    const close = phase === 'turn' || phase === 'face' || phase === 'static';
    const tf = close ? 0.1 : 0.6, ts = close ? 0.15 : 0.35;
    torch.position.set(cam.position.x + fwd.x * tf - fwd.z * ts, EYE + (close ? -0.35 : 0.1), cam.position.z + fwd.z * tf + fwd.x * ts);
    torch.intensity = lit ? (close ? 4 : 11) + flick * (close ? 2 : 6) : 0.0;
    let bl = null as null | [number, number, number, string, number], bd = 18;
    for (const L of props.lamps) { const d = Math.hypot(L[0] - px, L[2] - pz); if (d < bd) { bd = d; bl = L; } }
    if (bl && !(bl[4] === 8 && lockedTree() && ending !== 'best')) { lamp.position.set(bl[0], bl[1], bl[2]); lamp.color.set(bl[3]); lamp.intensity = bl[4] * Math.min(1, (18 - bd) / 6) * (0.85 + 0.15 * Math.sin(tt * 7)); } else lamp.intensity = 0;
    if (phase === 'scene' && ending === 'bus' && props.busHere) { lamp.position.set(-30, 2, -172); lamp.color.set('#ffe9b8'); lamp.intensity = 12; }
    // fireflies near the camera
    for (let i = 0; i < FF; i++) { const [fx, fz, fy, ph] = ffBase[i]; const near = Math.abs(fx - px) < 30 && Math.abs(fz - pz) < 30;
      ffPos[i * 3] = fx + Math.sin(tt * 0.5 + ph) * 0.6; ffPos[i * 3 + 1] = fy + Math.sin(tt * 0.8 + ph * 2) * 0.3; ffPos[i * 3 + 2] = fz + Math.cos(tt * 0.4 + ph) * 0.6;
      const b = near ? Math.max(0, Math.sin(tt * 1.7 + ph * 3)) * (cur.e.theme === 'grave' ? 0.4 : 1) : 0; ffCol[i * 3] = b * 0.85; ffCol[i * 3 + 1] = b; ffCol[i * 3 + 2] = b * 0.45; }
    ffGeo.attributes.position.needsUpdate = true; ffGeo.attributes.color.needsUpdate = true;
    hand.update(tt, bob, bobA * (phase === 'chase' ? 1.8 : 1), flick, lit, Math.sin(yawOff) * 0.2);
    const u = post.u; u.uTime.value = tt;
    const bootK = phase === 'card' ? 0 : phase === 'boot' ? Math.min(1, pt / 1.1) : 1;
    const ff = ffT >= 0 ? Math.sin(Math.min(1, ffT / 0.9) * Math.PI) : 0;
    u.uNoise.value = phase === 'boot' ? Math.max(0, 1 - pt / 0.7) : phase === 'static' ? 1 : phase === 'face' ? 0.15 : Math.max(ff * 0.6, (lit ? 0 : 0.12) + (phase === 'chase' ? 0.04 : 0));
    u.uTear.value = phase === 'static' ? 1 : phase === 'face' ? 0.5 : phase === 'turn' ? 0.35 : phase === 'chase' ? 0.12 : ff * 0.7;
    u.uRed.value = phase === 'face' ? 0.35 : phase === 'chase' || phase === 'dead' ? 0.1 : 0;
    u.uBlack.value = phase === 'card' ? 0.55 : phase === 'boot' ? Math.max(0, 1 - pt / 0.9) * 0.6 : 0;
    u.uShake.value.set(phase === 'turn' ? (Math.random() - 0.5) * 0.01 : 0, 0);
    renderer.setRenderTarget(rt); renderer.setClearColor(fog.color, 1); renderer.clear();
    renderer.render(scene, cam);
    if (phase !== 'face' && phase !== 'static') { renderer.clearDepth(); renderer.render(hand.scene, hand.cam); }
    renderer.setRenderTarget(null); u.tDiffuse.value = rt.texture; renderer.clear(); renderer.render(post.scene, post.cam);
    hud.draw(T, { rec: phase !== 'card' && phase !== 'boot', low: phase === 'chase' || phase === 'dead' || phase === 'turn', alpha: bootK, ff: ffT >= 0 });
  }

  // ---- loop -------------------------------------------------------------------------------------------------------
  let raf = 0, last = performance.now(), frames = 0, fpsT = last;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (window.__pause) { dt = 0; if (window.__steps) { window.__steps--; dt = 1 / 60; } }
    if (dt > 0) update(dt);
    if (phase !== 'done') render();
    if (fpsEl) { frames++; if (now - fpsT > 500) { const [x, z] = pos(); fpsEl.textContent = `${Math.round(frames * 1000 / (now - fpsT))} fps · ${cur.e.id} ${cur.s.toFixed(1)}/${cur.e.len.toFixed(0)} · (${x.toFixed(0)},${z.toFixed(0)}) · ${phase}`; frames = 0; fpsT = now; } }
  };
  const stop = () => cancelAnimationFrame(raf);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); keys.clear(); ptrs.clear(); } else if (phase !== 'done') { last = performance.now(); raf = requestAnimationFrame(frame); } });
  raf = requestAnimationFrame(frame);
  black.style.opacity = '0';
  (window as unknown as { __night: unknown }).__night = { get phase() { return phase; }, get edge() { return cur.e.id; }, get s() { return cur.s; }, get node() { return node; }, save: () => S, mapXY: (id: string) => (window as unknown as { __mapHits: Record<string, [number, number]> }).__mapHits?.[id], lookAtSticker() { for (const p of props.pickups.values()) { if (p.kind !== 'sticker' || p.taken || !p.obj.visible || p.pos.distanceTo(cam.position) > 8) continue; const dx = p.pos.x - cam.position.x, dz = p.pos.z - cam.position.z; yawOff = angDiff(Math.atan2(-dx, -dz), camYaw); pitch = Math.atan2(p.pos.y - cam.position.y, Math.hypot(dx, dz)); lastLook = T + 3; return p.id; } return null; }, stickersOnScreen() { const r: [number, number][] = []; for (const p of props.pickups.values()) { if (p.kind !== 'sticker' || p.taken || !p.obj.visible || p.pos.distanceTo(cam.position) > 8.5) continue; const v = p.obj.getWorldPosition(new Vector3()).project(cam); if (v.z < 1 && Math.abs(v.x) < 0.9 && Math.abs(v.y) < 0.9) r.push([(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]); } return r; }, goto(n: NodeId) { placeAt(n); arrive(n, null); }, walkTo(e: string, s: number, dir: 1 | -1 = 1) { cur = { e: EDGE[e], s, dir }; camYaw = yawAt(cur.e, s, dir); node = null; ui.hideChoices(); setPhase('walk'); area(); } };
  release(); curtainProgress(1);

  // ---- start card (sound switch + "start over" when there is a save) ---------------------------------------------------
  const begin = () => { setPhase('boot'); sfx.start(); if (at0 === 'chase') { cur = { e: EDGE.end, s: 5.5, dir: 1 }; camYaw = yawAt(cur.e, cur.s, 1); } if (at0 === 'caught') { cur = { e: EDGE.end, s: EDGE.end.len - 2.6, dir: 1 }; camYaw = yawAt(cur.e, cur.s, 1); stalk = true; pig.root.visible = true; pigGap = 3; setPhase('dead'); } };
  if (params.has('skip') || (at0 && at0 !== 'resume')) { void irisIn(); begin(); return; }
  void irisIn();
  const card = startCard('night.kicker', 'night.title', 'night.sub');
  const el = document.querySelector('.gift-card');
  if (el) {
    const p = document.createElement('p'); p.className = 'n-snd';
    p.innerHTML = `<span data-i18n="night.sound"></span><span aria-hidden="true">🎧</span><button type="button" data-i18n="night.sound.on"></button>`;
    const b = p.querySelector('button')!; const sync = () => b.setAttribute('aria-pressed', String(soundOn()));
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', e => { e.stopPropagation(); unlock(); setSound(!soundOn()); sync(); });
    onSound(sync); sync();
    el.insertBefore(p, el.querySelector('.gk-go')); apply(p);
    if (startNode && hasProgress(prev)) {
      const r = document.createElement('p'); r.className = 'n-resume';
      r.innerHTML = `<span>${t('night.resume').replace('{p}', t(`night.place.${startNode}`))}</span><button type="button" data-i18n="night.restart"></button>`;
      const rb = r.querySelector('button')!; rb.addEventListener('pointerdown', e => e.stopPropagation());
      rb.addEventListener('click', e => { e.stopPropagation(); try { localStorage.setItem('gift.night.v3', JSON.stringify(fresh(S.endings))); } catch { /* */ } const u = new URL(location.href); u.searchParams.set('fresh', '1'); location.replace(u.toString()); });
      el.insertBefore(r, el.querySelector('.gk-go')); apply(r);
    }
  }
  void card.then(begin);
}
