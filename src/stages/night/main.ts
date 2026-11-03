// Stage 3 · Night — first-person blocky (Minecraft-STYLE) found-footage walk. Hold to walk along a fixed path, drag to
// look. Scripted ~55 s timeline (distance OR time triggered, so idling still plays it all): sign "don't look back",
// pink block, "??" between trees, torch dies, a blocky shape crosses, heavy steps behind, RUN!, dead end, forced turn,
// pig face 0.25 s, tape static 0.35 s, HARD CUT to the pastel kawaii sticker scene -> /jelly/. docs/GIFT_PLAN.md §5.3.
import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Color, DirectionalLight, Float32BufferAttribute, FogExp2, Group, HemisphereLight, LinearFilter,
  Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, PointLight, Points, PointsMaterial, Scene, Sprite, SpriteMaterial, Vector3, WebGLRenderTarget, WebGLRenderer,
} from 'three';
import { markReached, params, dev, prefetchNext } from '../../shared/flow';
import { register, t, apply, lang, onLang } from '../../shared/i18n';
import { mountChrome, startCard } from '../../shared/chrome';
import { soundOn, setSound, unlock, onSound } from '../../shared/audio';
import { irisIn } from '../../shared/transition';
import * as dict from './dict';
import { getAtlas } from './textures';
import { buildWorld, pathX, pathDir, END_D } from './world';
import { makePig, qqTexture, glow } from './pig';
import { makeHand } from './hand';
import { makePost } from './post';
import { makeHud } from './hud';
import { sfx, pzSfx } from './sfx';
import { showKawaii } from './kawaii';
import { mushrooms, trail, gate as gatePuzzle } from './puzzles';
import { makeGate } from './gate';
import './style.css';

declare global { interface Window { __pause?: boolean; __steps?: number } }
register(dict); mountChrome({ theme: 'dark' }); markReached();
const host = document.getElementById('game')!;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer: coarse)').matches;
const at = params.get('at');

const EYE = 1.62, WALK = 1.75, STOP_D = END_D - 2.4, CHASE_D = 74, CHASE_T = 47;
// light puzzles on the way (distance-triggered; the walk pauses while one is open): mushrooms, the fork, the gate lock
const P_MUSH = 15, P_TRAIL = 52, GATE_D = 70.5, GATE_STOP = GATE_D - 2;

if (at === 'kawaii') { showKawaii(); } else boot();

function boot() {
  let renderer: WebGLRenderer;
  try { renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }); }
  catch { void startCard('night.kicker', 'night.title', 'night.sub').then(() => showKawaii()); return; }
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight); renderer.autoClear = false;
  const cv = renderer.domElement; cv.className = 'n-canvas'; cv.setAttribute('role', 'img'); cv.dataset.i18nAria = 'night.canvas'; host.appendChild(cv); apply(host);
  const black = document.createElement('div'); black.className = 'n-black'; host.appendChild(black);
  const hint = document.createElement('p'); hint.className = 'n-hint'; hint.dataset.i18n = touch ? 'night.hint.touch' : 'night.hint.key'; host.appendChild(hint);
  const say = document.createElement('p'); say.className = 'n-say'; host.appendChild(say);
  apply(host);
  const hud = makeHud(host);
  let fpsEl: HTMLElement | null = null; if (dev) { fpsEl = document.createElement('div'); fpsEl.className = 'n-fps'; host.appendChild(fpsEl); }

  // ---- world -------------------------------------------------------------------------------------------------------
  const scene = new Scene(); const FOG = new Color('#070a12');
  scene.background = FOG; scene.fog = new FogExp2(FOG, 0.1);
  const cam = new PerspectiveCamera(70, 1, 0.05, 140); cam.rotation.order = 'YXZ';
  const world = buildWorld(getAtlas(), lang); scene.add(world.group); onLang(l => world.setSignLang(l));
  scene.add(new HemisphereLight('#34446f', '#0b0d12', 0.5));
  const moonL = new DirectionalLight('#9fb3e6', 0.22); moonL.position.set(-0.5, 1, -0.6); scene.add(moonL);
  const torch = new PointLight('#ffb35c', 14, 15, 1.35); scene.add(torch);
  // sky: square moon + stars follow the camera (infinitely far, no fog)
  const sky = new Group(); scene.add(sky);
  const moon = new Mesh(new PlaneGeometry(7, 7), new MeshBasicMaterial({ color: '#e9ecf4', fog: false })); moon.position.set(-26, 44, -92); moon.lookAt(0, 0, 0); sky.add(moon);
  const mh = glow('170,190,240', 40, 0.35); mh.position.copy(moon.position); sky.add(mh);
  { const n = 420, p = new Float32Array(n * 3); let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, e = 0.12 + r() * 1.3, R = 110; p.set([Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R], i * 3); }
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(p, 3));
    sky.add(new Points(g, new PointsMaterial({ color: '#c9d4f0', size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 }))); }
  // fireflies
  const FF = 46, ffBase: number[][] = [], ffPos = new Float32Array(FF * 3), ffCol = new Float32Array(FF * 3);
  for (let i = 0; i < FF; i++) { const d = Math.random() * (END_D - 10); ffBase.push([d, (Math.random() - 0.5) * 9, 0.4 + Math.random() * 2.2, Math.random() * 10]); }
  const ffGeo = new BufferGeometry(); ffGeo.setAttribute('position', new Float32BufferAttribute(ffPos, 3)); ffGeo.setAttribute('color', new Float32BufferAttribute(ffCol, 3));
  const dotC = document.createElement('canvas'); dotC.width = dotC.height = 32; { const g = dotC.getContext('2d')!; const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }
  const ffMat = new PointsMaterial({ size: 0.22, map: new CanvasTexture(dotC), vertexColors: true, blending: AdditiveBlending, depthWrite: false, transparent: true });
  const fireflies = new Points(ffGeo, ffMat); fireflies.frustumCulled = false; scene.add(fireflies);
  let ffFade = 1;

  const gateObj = makeGate(GATE_D, lang); scene.add(gateObj.root); onLang(l => gateObj.setLang(l));
  const pig = makePig(); scene.add(pig.root);
  const glimpse = new Sprite(new SpriteMaterial({ map: qqTexture(), transparent: true, opacity: 0 })); glimpse.scale.set(0.8, 0.42, 1); glimpse.visible = false; scene.add(glimpse);
  const hand = makeHand(); const post = makePost();
  let rt = new WebGLRenderTarget(2, 2, { minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: true });

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
  const ptrs = new Map<number, { x: number; y: number }>(); const keys = new Set<string>();
  let yawOff = 0, pitch = 0, lastLook = -9;
  cv.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); cv.setPointerCapture(e.pointerId); unlock(); });
  cv.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const k = 4.2 / Math.min(innerWidth, innerHeight * 1.4);
    yawOff += (e.clientX - p.x) * k * (phase === 'face' || phase === 'turn' ? 0 : 1); pitch = Math.max(-0.6, Math.min(0.5, pitch + (e.clientY - p.y) * k * 0.8));
    p.x = e.clientX; p.y = e.clientY; lastLook = T;
  });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  const up = (e: PointerEvent) => { ptrs.delete(e.pointerId); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', up);
  window.addEventListener('keydown', e => { keys.add(e.code); if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault(); });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); ptrs.clear(); });
  const walking = () => ptrs.size > 0 || keys.has('KeyW') || keys.has('ArrowUp') || keys.has('Space');

  // ---- timeline state ------------------------------------------------------------------------------------------------
  type Phase = 'card' | 'boot' | 'puzzle' | 'walk' | 'chase' | 'dead' | 'turn' | 'face' | 'static' | 'done';
  let phase: Phase = 'card', T = 0, pt = 0, d = 0.5, speed = 0, bob = 0, lastStepHalf = 0, shake = 0, tension = 0;
  let torchOff: [number, number][] = [], idle = 0, pigGap = 99, pigD = -99, pigX = 0, crossT = -1, glimpseT = -1, heavyT = 0, beatT = 0, turnFrom = 0, kawaiiShown = false;
  const ev = { qq: false, flick: false, cross: false, behind: false };
  const pz = { mush: false, trail: false, gate: false }; let gateT = -1, noInput = 0;
  const puzzle = (k: keyof typeof pz, run: () => Promise<unknown>) => {
    setPhase('puzzle'); hint.classList.remove('on'); ptrs.clear(); keys.clear();
    void run().then(() => { pz[k] = true; keys.clear(); ptrs.clear(); noInput = 0; if (k === 'gate') { gateT = T; gateObj.open(); pzSfx.creak(); } setPhase('walk'); });
  };
  const setPhase = (p: Phase) => { phase = p; pt = 0; };
  const sayIt = (key: string, soft = false) => { say.textContent = t(key); say.className = 'n-say' + (soft ? ' soft' : ''); void say.offsetWidth; say.classList.add('on'); };

  if (params.get('d')) d = +params.get('d')!;
  if (at === 'trail') { d = P_TRAIL - 1.5; T = 30; pz.mush = true; ev.qq = ev.flick = true; }
  if (at === 'gate') { d = GATE_STOP - 2; T = 40; pz.mush = pz.trail = true; ev.qq = ev.flick = ev.cross = true; }
  if (at === 'chase' || at === 'caught') { pz.mush = pz.trail = pz.gate = true; gateObj.open(); d = at === 'chase' ? CHASE_D - 0.5 : STOP_D - 0.3; T = at === 'chase' ? 44 : 55; ev.qq = ev.flick = ev.cross = true; }

  const pigAlong = (dd: number, xoff = 0) => { pig.root.position.set(pathX(dd) + xoff, 0, -dd); };
  const startChase = () => {
    setPhase('chase'); tension = 1; sayIt('night.run'); prefetchNext(); sfx.crickets(false); sfx.wind(0.16);
    if (!ev.behind) { ev.behind = true; pigGap = 13; }
    pig.root.visible = true; pig.setEyes(1);
  };

  // ---- update -----------------------------------------------------------------------------------------------------
  const fwd = new Vector3();
  function update(dt: number) {
    pt += dt;
    if (phase === 'card') return;
    if (ev.cross) ffFade = Math.max(0, ffFade - dt * 0.5);
    if (phase === 'boot') { if (pt > 1.1) { setPhase('walk'); hint.classList.add('on'); } return; }
    gateObj.update(dt);
    if (phase === 'puzzle') { speed *= Math.max(0, 1 - dt * 6); sfx.tick(T, tension); return; }
    if (phase !== 'done') T += dt;
    // walking / running
    let target = 0;
    // never stuck: after ~9 s without input the camera drifts forward on its own
    if (phase === 'walk') { noInput = walking() ? 0 : noInput + dt; target = walking() ? WALK : noInput > 9 ? WALK * 0.6 : 0; }
    if (phase === 'chase') target = Math.max(4.2, (STOP_D - d) / 8);
    speed += (target - speed) * Math.min(1, dt * (phase === 'chase' ? 3 : 5));
    if (phase === 'walk' || phase === 'chase') d = Math.min(pz.gate ? STOP_D : GATE_STOP, d + speed * dt);
    bob += speed * dt * 3.3;
    const half = Math.floor(bob / Math.PI); if (half !== lastStepHalf && speed > 0.3) { lastStepHalf = half; sfx.step(phase === 'chase'); }
    // look: keys + spring back to the path when not dragging
    if (keys.has('ArrowLeft') || keys.has('KeyA')) { yawOff += dt * 1.8; lastLook = T; }
    if (keys.has('ArrowRight') || keys.has('KeyD')) { yawOff -= dt * 1.8; lastLook = T; }
    if (keys.has('ArrowDown') || keys.has('KeyS')) { yawOff += dt * 3; lastLook = T; }
    if (phase !== 'turn' && phase !== 'face' && phase !== 'static' && ptrs.size === 0 && T - lastLook > 1.2) {
      yawOff = Math.atan2(Math.sin(yawOff), Math.cos(yawOff)); yawOff -= yawOff * Math.min(1, dt * 1.6); pitch -= pitch * Math.min(1, dt * 1.6);
    }
    // hint
    if (phase === 'walk') { if (speed > 0.5) idle = 0, d > 4 && hint.classList.remove('on'); else if ((idle += dt) > 6) hint.classList.add('on'); }
    else hint.classList.remove('on');

    // scripted beats (distance OR time, whichever first)
    if (phase === 'walk') {
      if (!ev.qq && (d > 40 || T > 26)) { ev.qq = true; glimpseT = 0; const gd = d + 9; glimpse.position.set(pathX(gd) - 4.3, 2.3, -gd); glimpse.visible = true; sfx.rustle(); }
      if (!ev.flick && (d > 48 || T > 32)) { ev.flick = true; torchOff = [[T, T + 0.12], [T + 0.22, T + 0.82]]; sfx.torchOut(); }
      if (!ev.cross && (d > 58 || T > 38)) { ev.cross = true; crossT = 0; sfx.crickets(false); sfx.heavyStep(0.12); }
      if (!ev.behind && (d > 67 || T > 43)) { ev.behind = true; pigGap = 17; pig.root.visible = true; pig.setEyes(0.5); sfx.grunt(0.1); heavyT = 0; }
      if (!pz.mush && d >= P_MUSH) { puzzle('mush', mushrooms); return; }
      if (!pz.trail && d >= P_TRAIL) { puzzle('trail', trail); return; }
      if (!pz.gate && d >= GATE_STOP - 0.02) { puzzle('gate', gatePuzzle); return; }
      if (pz.gate && (d >= CHASE_D || T > Math.max(CHASE_T, gateT + 2.2))) startChase();
    }
    if (glimpseT >= 0) { glimpseT += dt; const m = glimpse.material; m.opacity = glimpseT < 0.25 ? glimpseT / 0.25 : Math.max(0, 1 - (glimpseT - 1.1) / 0.3); glimpse.position.y = 2.3 + Math.sin(glimpseT * 5) * 0.05; if (glimpseT > 1.4) { glimpseT = -1; glimpse.visible = false; } }
    // the shape crossing the path ahead (it is the pig, dimly)
    if (crossT >= 0 && phase === 'walk') {
      crossT += dt; const cd = d + 15.5; const k = Math.min(1, crossT / 2.6); const ease = k < 0.45 ? k / 0.45 * 0.5 : k < 0.6 ? 0.5 : 0.5 + (k - 0.6) / 0.4 * 0.5;
      pig.root.visible = true; pig.setEyes(k > 0.45 && k < 0.6 ? 0.9 : 0.25);
      pigAlong(cd, -7 + ease * 14); pig.root.rotation.y = k > 0.45 && k < 0.6 ? 0 : Math.PI / 2; pig.animate(dt, k > 0.45 && k < 0.6 ? 0 : 3, 0.2, T);
      if (crossT > 2.6) { crossT = -1; pig.root.visible = false; }
    }
    // stalking / chasing pig behind the camera
    if (ev.behind && crossT < 0 && (phase === 'walk' || phase === 'chase' || phase === 'dead')) {
      const gapTarget = phase === 'walk' ? 15 : phase === 'chase' ? 3.2 + 9 * Math.max(0, (STOP_D - d) / (STOP_D - CHASE_D)) : 1.4;
      pigGap += (gapTarget - pigGap) * Math.min(1, dt * (phase === 'dead' ? 1.6 : 0.8));
      pigD = d - pigGap; pigX = pathX(pigD); pigAlong(pigD);
      pig.root.rotation.y = Math.atan2(pathX(d) - pigX, -pigGap);
      pig.animate(dt, phase === 'walk' ? 1.2 : 4, 1, T);
      heavyT += dt; const every = phase === 'walk' ? 0.85 : 0.36;
      if (heavyT > every) { heavyT = 0; sfx.heavyStep(phase === 'walk' ? 0.08 : 0.16 + (1 - pigGap / 13) * 0.12); }
    }
    if (phase === 'chase' || phase === 'dead') { beatT += dt; if (beatT > (phase === 'dead' ? 0.5 : 0.62)) { beatT = 0; sfx.heartbeat(0.22); } }
    if (phase === 'chase') { shake = reduce ? 0.2 : 0.8; if (d >= STOP_D - 0.05) { setPhase('dead'); sayIt('night.dead', true); } }
    if (phase === 'dead') { shake = reduce ? 0.1 : 0.35; if (pt > 1.5) { setPhase('turn'); turnFrom = yawOff; sfx.grunt(0.14); } }
    if (phase === 'turn') {
      const k = Math.min(1, pt / 0.48), e = k * k * (3 - 2 * k);
      const back = Math.PI * (turnFrom > 0 ? 1 : -1);
      yawOff = turnFrom + (back - turnFrom) * e; pitch += (0.08 - pitch) * Math.min(1, dt * 8);
      if (k >= 1) { setPhase('face'); sfx.heavyStep(0.3); }
    }
    if (phase === 'turn' || phase === 'face') {
      // the pig leans right into the lens
      // distance so the 1.04-wide face fills the frame in any aspect (portrait phones need it further away)
      const fill = 0.66 / (Math.tan((cam.fov * Math.PI) / 360) * Math.min(cam.aspect, 1.25)) + 0.46;
      const lean = phase === 'face' ? fill - Math.min(0.08, pt * 0.3) : fill + 0.8 - Math.min(1, pt / 0.48) * 0.8;
      const by = -pathDir(d) + (phase === 'turn' ? Math.PI * (turnFrom > 0 ? 1 : -1) : yawOff); fwd.set(-Math.sin(by), 0, -Math.cos(by)); // fixed behind you while the camera swings round
      const cx = pathX(d), cz = -d;
      pig.root.position.set(cx + fwd.x * lean, EYE - 2.54 + 0.05, cz + fwd.z * lean);
      pig.root.rotation.y = Math.atan2(-fwd.x, -fwd.z); pig.root.visible = true; pig.setEyes(1.2); pig.animate(dt, 0, 1, T);
    }
    if (phase === 'face' && pt > 0.25) { setPhase('static'); sfx.staticBurst(); }
    if (phase === 'static' && pt > 0.35) flip();
    if (phase !== 'chase' && phase !== 'dead') shake *= Math.max(0, 1 - dt * 6);
    sfx.tick(T, tension);
  }

  function flip() {
    if (kawaiiShown) return; kawaiiShown = true; setPhase('done');
    showKawaii(); // opaque, same frame as the last static frame -> no white flash
    requestAnimationFrame(() => requestAnimationFrame(() => { stop(); host.remove(); renderer.dispose(); rt.dispose(); renderer.forceContextLoss(); }));
  }

  // ---- render -----------------------------------------------------------------------------------------------------
  function render() {
    const tt = performance.now() / 1000;
    const cx = pathX(d), cz = -d, by = -pathDir(d);
    const bobA = Math.min(1, speed / WALK) * (reduce ? 0.3 : 1);
    const sh = shake * 0.02;
    cam.position.set(cx + Math.cos(bob) * 0.03 * bobA + (Math.random() - 0.5) * sh, EYE + Math.abs(Math.sin(bob)) * 0.055 * bobA + (Math.random() - 0.5) * sh, cz);
    // handheld drift
    const drift = reduce ? 0 : 1;
    cam.rotation.set(pitch + Math.sin(tt * 0.9) * 0.008 * drift + Math.sin(bob * 2) * 0.006 * bobA, by + yawOff + Math.sin(tt * 0.63) * 0.012 * drift, Math.sin(tt * 0.77) * 0.006 * drift + Math.sin(bob) * 0.008 * bobA);
    sky.position.copy(cam.position);
    // torch: flicker + scripted blackouts
    const flick = reduce ? 0.5 : 0.5 + 0.25 * Math.sin(tt * 13.1) + 0.18 * Math.sin(tt * 27.7 + 1) + 0.12 * Math.sin(tt * 5.3);
    const lit = !torchOff.some(([a, b]) => T >= a && T < b);
    fwd.set(-Math.sin(by + yawOff), 0, -Math.cos(by + yawOff));
    const close = phase === 'turn' || phase === 'face' || phase === 'static';
    const tf = close ? 0.1 : 0.6, ts = close ? 0.15 : 0.35; // up close the torch lights the face from below
    torch.position.set(cam.position.x + fwd.x * tf - fwd.z * ts, EYE + (close ? -0.35 : 0.1), cam.position.z + fwd.z * tf + fwd.x * ts);
    torch.intensity = lit ? (close ? 4 : 11) + flick * (close ? 2 : 6) : 0.0;
    // fireflies drift (fade after the shape crosses)
    if (ffFade > 0) {
      for (let i = 0; i < FF; i++) { const [fd, fx, fy, ph] = ffBase[i];
        ffPos[i * 3] = pathX(fd) + fx + Math.sin(tt * 0.5 + ph) * 0.6; ffPos[i * 3 + 1] = fy + Math.sin(tt * 0.8 + ph * 2) * 0.3; ffPos[i * 3 + 2] = -fd + Math.cos(tt * 0.4 + ph) * 0.6;
        const b = Math.max(0, Math.sin(tt * 1.7 + ph * 3)) * ffFade;
        ffCol[i * 3] = b * 0.85; ffCol[i * 3 + 1] = b; ffCol[i * 3 + 2] = b * 0.45; }
      ffGeo.attributes.position.needsUpdate = true; ffGeo.attributes.color.needsUpdate = true;
    }
    hand.update(tt, bob, bobA * (phase === 'chase' ? 1.8 : 1), flick, lit, Math.sin(yawOff) * 0.2);
    // post
    const u = post.u; u.uTime.value = tt;
    const bootK = phase === 'card' ? 0 : phase === 'boot' ? Math.min(1, pt / 1.1) : 1;
    u.uNoise.value = phase === 'boot' ? Math.max(0, 1 - pt / 0.7) : phase === 'static' ? 1 : phase === 'face' ? 0.15 : (lit ? 0 : 0.12) + (phase === 'chase' ? 0.04 : 0);
    u.uTear.value = phase === 'static' ? 1 : phase === 'face' ? 0.5 : phase === 'turn' ? 0.35 : phase === 'chase' ? 0.12 : 0;
    u.uRed.value = phase === 'face' ? 0.35 : phase === 'chase' || phase === 'dead' ? 0.1 : 0;
    u.uBlack.value = phase === 'card' ? 0.55 : phase === 'boot' ? Math.max(0, 1 - pt / 0.9) * 0.6 : 0;
    u.uShake.value.set(phase === 'turn' ? (Math.random() - 0.5) * 0.01 : 0, 0);
    renderer.setRenderTarget(rt); renderer.setClearColor(FOG, 1); renderer.clear();
    renderer.render(scene, cam);
    if (phase !== 'face' && phase !== 'static') { renderer.clearDepth(); renderer.render(hand.scene, hand.cam); }
    renderer.setRenderTarget(null); u.tDiffuse.value = rt.texture; renderer.clear(); renderer.render(post.scene, post.cam);
    hud.draw(T, { rec: phase !== 'card' && phase !== 'boot', low: phase === 'chase' || phase === 'dead' || phase === 'turn', alpha: bootK });
  }

  // ---- loop -------------------------------------------------------------------------------------------------------
  let raf = 0, last = performance.now(), frames = 0, fpsT = last;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (window.__pause) { dt = 0; if (window.__steps) { window.__steps--; dt = 1 / 60; } }
    if (dt > 0) update(dt);
    if (phase !== 'done') render();
    if (fpsEl) { frames++; if (now - fpsT > 500) { fpsEl.textContent = `${Math.round(frames * 1000 / (now - fpsT))} fps · d ${d.toFixed(1)} · t ${T.toFixed(1)} · ${phase}`; frames = 0; fpsT = now; } }
  };
  const stop = () => cancelAnimationFrame(raf);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); keys.clear(); ptrs.clear(); } else if (phase !== 'done') { last = performance.now(); raf = requestAnimationFrame(frame); } });
  raf = requestAnimationFrame(frame);
  black.style.opacity = '0';

  // ---- start card (with a "best with sound" switch that does NOT start the walk) -------------------------------------
  const begin = () => { setPhase('boot'); sfx.start(); if (at === 'chase') startChase(); if (at === 'caught') { pig.root.visible = true; ev.behind = true; pigGap = 3; setPhase('dead'); } };
  if (params.has('skip') || at) { begin(); return; }
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
  }
  void card.then(begin);
}
