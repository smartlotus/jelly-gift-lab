// v03f · everything in the branching night that moves, opens, glows or can be picked up: fork signs, doors (music room,
// crypt, tunnel grate, the clearing gate), notes / candle / hidden "??" stickers, the five cute "scares" (portrait,
// cupboard, bedsheet ghost, owl eyes, bats), the last bus, and the tree house of the hidden ending. Plain three.js boxes,
// sprites and tiny canvas textures (pixel art drawn from char rows), nothing loaded from the network.
import { AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  PlaneGeometry, Points, PointsMaterial, Sprite, SpriteMaterial, Vector3, type Object3D, type Scene } from 'three';
import { T, tileTexture, signTexture, tex } from './textures';
import { EDGE, NODES, at, yawAt, type Edge } from './map';
import { groundH, HOUSE, CRYPT } from './world';
import { makePig, qqTexture, glow } from './pig';
import { makeGate } from './gate';

type Lang = 'en' | 'zh';
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
function pixTex(rows: string[], pal: Record<string, string>, scale = 1) {
  const c = document.createElement('canvas'); c.width = rows[0].length * scale; c.height = rows.length * scale; const g = c.getContext('2d')!;
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x * scale, y * scale, scale, scale); } }));
  return tex(c);
}
/** point `off` metres to the side (+ = right when walking a->b) of edge e at s */
export function beside(e: Edge, s: number, off: number): [number, number] {
  const [px, pz] = at(e, s), [qx, qz] = at(e, s + 0.5); const tx = qx - px, tz = qz - pz, l = Math.hypot(tx, tz) || 1;
  return [px - tz / l * off, pz + tx / l * off];
}

// pixel art
const PORTRAIT_A = [ // a gloomy old portrait: dark figure, two pale eyes
  'ffffffffffffffff', 'fbbbbbbbbbbbbbbf', 'fbbbbbbbbbbbbbbf', 'fbbbbbkkkkbbbbbf', 'fbbbbkkkkkkbbbbf', 'fbbbbkwkkwkbbbbf', 'fbbbbkkkkkkbbbbf', 'fbbbbbkkkkbbbbbf',
  'fbbbbbbkkbbbbbbf', 'fbbbkkkkkkkkbbbf', 'fbbkkkkkkkkkkbbf', 'fbbkkkkkkkkkkbbf', 'fbkkkkkkkkkkkkbf', 'fbkkkkkkkkkkkkbf', 'fbbbbbbbbbbbbbbf', 'ffffffffffffffff'];
const PORTRAIT_B = [ // ...it was the pig all along
  'ffffffffffffffff', 'fyyyyyyyyyyyyyyf', 'fyyqqyyyyyqqyyyf', 'fyyyqyppppyqyyyf', 'fyyppppppppppyyf', 'fyppepppppepppyf', 'fyppppppppppppyf', 'fypbbpssssspbbyf',
  'fyppppsnsnspppyf', 'fyppppssssspppyf', 'fyyppppppppppyyf', 'fyyyppppppppyyyf', 'fyyyyhhhhhhyyyyf', 'fyyyhhhhhhhhyyyf', 'fyyyyyyyyyyyyyyf', 'ffffffffffffffff'];
const PAL_A = { f: '#6b4a22', b: '#1b1d24', k: '#0b0b0f', w: '#c8d0b0' };
const PAL_B = { f: '#b9934a', y: '#fbe3ea', p: '#f9c6cf', e: '#2e2a2b', b: '#f4a7b9', s: '#ee8fa6', n: '#8c3b52', q: '#e0a92a', h: '#9cc8ee' };
const BAT = ['b......b', 'bb....bb', 'bbbbbbbb', '.bbwwbb.', '..bbbb..'];
const HEART = ['.pp.pp.', 'ppppppp', 'ppppppp', '.ppppp.', '..ppp..', '...p...'];
const NOTE = ['wwwwwwwwwwwwwww.', 'wllllllllllllww.', 'wwwwwwwwwwwwwwww', 'wllllllllllllww.', 'wwwwwwwwwwwwwww.', 'wllllllllllww...', 'wwwwwwwwwwww....'];

export type PickKind = 'note' | 'candle' | 'sticker';
export interface Pickup { id: string; kind: PickKind; obj: Object3D; hit: Object3D; pos: Vector3; shown: boolean; taken: boolean }

function dotTex() { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d')!; const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new CanvasTexture(c); }
export function makeProps(scene: Scene, lang: Lang) {
  const root = new Group(); scene.add(root);
  const ups: ((dt: number, t: number) => void)[] = [];
  const box = (w: number, h: number, d: number, m: MeshLambertMaterial | MeshBasicMaterial | (MeshLambertMaterial | MeshBasicMaterial)[]) => new Mesh(new BoxGeometry(w, h, d), m);
  const planks = new MeshLambertMaterial({ map: tileTexture(T.planks) }), dplanks = new MeshLambertMaterial({ map: tileTexture(T.dplanks) });
  const logM = new MeshLambertMaterial({ map: tileTexture(T.oakSide) }), stoneM = new MeshLambertMaterial({ map: tileTexture(T.cobble) });

  // ---- signs (text follows the language) -------------------------------------------------------------------------
  const signs: { mat: MeshLambertMaterial; zh: string; en: string }[] = [];
  function sign(x: number, z: number, yaw: number, zh: string, en: string, h = 1.25) {
    const g = new Group(); const post = box(0.14, h + 0.05, 0.14, logM); post.position.y = (h + 0.05) / 2; g.add(post);
    const face = new MeshLambertMaterial({ map: signTexture(lang === 'zh' ? zh : en) }); signs.push({ mat: face, zh, en });
    const board = box(1.15, 0.6, 0.08, [planks, planks, planks, planks, face, planks]); board.position.y = h; g.add(board);
    g.position.set(x, groundH(x, z), z); g.rotation.y = yaw; root.add(g); return g;
  }
  { const [x, z] = beside(EDGE.s, 24, -2.1); sign(x, z, yawAt(EDGE.s, 24, 1) + 0.55, '别回头', "DON'T LOOK BACK"); }
  // at the fork: one sign per way, a few metres along it
  for (const [id, zh, en] of [['fw', '← 森林', '← FOREST'], ['fh', '老房子 ↑', 'OLD HOUSE ↑'], ['fe', '墓地 →', 'GRAVEYARD →']] as const) {
    const e = EDGE[id]; const [x, z] = beside(e, 4.5, id === 'fe' ? 1.9 : -1.9); sign(x, z, yawAt(e, 4.5, 1) + Math.PI, zh, en);
  }
  { const [x, z] = beside(EDGE.bus, EDGE.bus.len - 1, -2.2); sign(x, z, yawAt(EDGE.bus, EDGE.bus.len - 1, 1) + Math.PI + 0.3, '末班车 23:59', 'LAST BUS 23:59', 1.9); }
  { const [x, z] = beside(EDGE.gg, 1, -2.6); sign(x, z, yawAt(EDGE.gg, 1, 1) + Math.PI, '我们的第一天？', 'OUR DAY ONE?'); }

  // ---- doors -----------------------------------------------------------------------------------------------------
  function slab(x: number, z: number, yaw: number, w: number, h: number, m: MeshLambertMaterial, mode: 'swing' | 'sink' | 'lift') {
    const pivot = new Group(); pivot.position.set(x, 0, z); pivot.rotation.y = yaw; root.add(pivot);
    const leaf = new Group(); pivot.add(leaf);
    const b = box(w, h, 0.16, m); b.position.set(mode === 'swing' ? w / 2 : 0, h / 2, 0); leaf.add(b);
    if (mode === 'swing') leaf.position.x = -w / 2;
    let k = 0, target = 0;
    ups.push(dt => { if (k === target) return; k = Math.min(1, k + dt / 1.2); const e = 1 - Math.pow(1 - k, 3);
      if (mode === 'swing') leaf.rotation.y = -e * 1.6; else if (mode === 'sink') leaf.position.y = -e * (h + 0.1); else leaf.position.y = e * (h - 0.4); });
    return { open() { target = 1; }, get isOpen() { return target === 1; }, obj: pivot };
  }
  const musicDoor = (() => { const e = EDGE.h23; let s = 0; for (; s < e.len; s += 0.25) if (at(e, s)[1] <= -89.0) break; const [x] = at(e, s); return slab(x, -88.5, 0, 2.6, 2.9, dplanks, 'swing'); })();
  const cryptDoor = slab(CRYPT.x0 + 0.5, -83.5, Math.PI / 2, 2.9, 2.9, stoneM, 'sink');
  const barsM = new MeshLambertMaterial({ map: tileTexture(T.bars), transparent: true, alphaTest: 0.5 });
  const grate = (() => { const e = EDGE.tun, s = 20; const [x, z] = at(e, s); return slab(x, z, yawAt(e, s, 1), 3.1, 3, barsM, 'lift'); })();
  const gate = makeGate(lang); { const e = EDGE.gg, s = 4.6; const [x, z] = at(e, s); gate.root.position.set(x, 0, z); gate.root.rotation.y = yawAt(e, s, 1); root.add(gate.root); ups.push(dt => gate.update(dt)); }

  // ---- pickups -----------------------------------------------------------------------------------------------------
  const pickups = new Map<string, Pickup>();
  const qqT = qqTexture(), noteT = pixTex(NOTE, { w: '#efe6d2', l: '#9a8a70' }, 2);
  function pickup(id: string, kind: PickKind, x: number, y: number, z: number, shown: boolean) {
    const g = new Group(); g.position.set(x, y, z); root.add(g);
    let hit: Object3D;
    if (kind === 'sticker') { const s = new Sprite(new SpriteMaterial({ map: qqT, transparent: true, fog: false })); s.scale.set(0.62, 0.34, 1); g.add(s); g.add(glow('249,160,190', 1.6, 0.55)); hit = s; }
    else if (kind === 'note') { const s = new Sprite(new SpriteMaterial({ map: noteT, transparent: true })); s.scale.set(0.5, 0.24, 1); g.add(s); g.add(glow('255,236,190', 1.1, 0.4)); hit = s; }
    else { const c = box(0.12, 0.26, 0.12, new MeshLambertMaterial({ color: '#efe6d2' })); g.add(c); const f = glow('255,190,100', 0.7, 0.9); f.position.y = 0.22; g.add(f); hit = c; }
    const p: Pickup = { id, kind, obj: g, hit, pos: new Vector3(x, y, z), shown, taken: false }; g.visible = shown; pickups.set(id, p);
    const ph = Math.random() * 6; ups.push((_dt, t) => { if (!g.visible) return; g.position.y = y + Math.sin(t * 1.7 + ph) * 0.08; g.rotation.y = t * 0.6; });
    return p;
  }
  { const [x, z] = at(EDGE.s, 33); const bx = Math.round(x + 5.5) + 0.5, bz = Math.floor(z) + 0.5; pickup('st1', 'sticker', bx, groundH(bx, bz) + 1.55, bz, true); }
  { const e = EDGE.loop; const [x, z] = beside(e, e.len * 0.5, 3.2); pickup('st2', 'sticker', x, groundH(x, z) + 1.3, z, true); }
  pickup('st3', 'sticker', 4.5, 4.45, -62.5, true);
  { const [x, z] = beside(EDGE.e12, 18, -6.2); pickup('st4', 'sticker', x, groundH(x, z) + 1.0, z, true); }
  { const [x, z] = beside(EDGE.tun, 25, 1.25); pickup('st5', 'sticker', x, 2.35, z, true); }
  { const n = NODES.W2; pickup('noteA', 'note', n.x - 2.2, 1.0, n.z - 1.6, true); }
  pickup('noteB', 'note', -5, 1.25, -84, false);
  pickup('noteC', 'note', CRYPT.x0 - 0.9, 1.0, -84.6, false);
  pickup('candle', 'candle', CRYPT.x0 - 0.9, 0.2, -82.6, false);

  // ---- scares (cute) -----------------------------------------------------------------------------------------------
  // 1 the portrait in the hall
  const pA = pixTex(PORTRAIT_A, PAL_A, 4), pB = pixTex(PORTRAIT_B, PAL_B, 4);
  const pMat = new MeshBasicMaterial({ map: pA }); const portrait = new Mesh(new PlaneGeometry(1.1, 1.1), pMat);
  portrait.position.set(HOUSE.x0 + 2.02, 1.9, -67.5); portrait.rotation.y = Math.PI / 2; root.add(portrait);
  const pEyes = glow('255,60,80', 0.5, 0); pEyes.position.set(HOUSE.x0 + 2.1, 2.05, -67.5); root.add(pEyes);
  let portraitT = -1;
  ups.push(dt => { if (portraitT < 0) return; portraitT += dt; (pEyes.material as SpriteMaterial).opacity = portraitT < 0.9 ? Math.min(1, portraitT * 2) : 0;
    if (portraitT > 0.9 && pMat.map !== pB) { pMat.map = pB; pMat.needsUpdate = true; }
    portrait.rotation.z = portraitT > 0.9 && portraitT < 1.5 ? Math.sin((portraitT - 0.9) * 30) * 0.08 * (1.5 - portraitT) : 0; });

  // 2 the cupboard in the music room: a pig pops out with a party horn
  const cup = new Group(); cup.position.set(5.6, 0, -80.5); cup.rotation.y = -Math.PI / 2; root.add(cup);
  const cupBody = box(1.6, 2.4, 0.8, dplanks); cupBody.position.set(0, 1.2, -0.1); cup.add(cupBody);
  const doors = [-1, 1].map(sd => { const p = new Group(); p.position.set(sd * 0.8, 0, 0.32); const d = box(0.8, 2.3, 0.08, planks); d.position.set(-sd * 0.4, 1.2, 0); p.add(d); cup.add(p); return { p, sd }; });
  const popPig = makePig(); popPig.setEyes(0); popPig.root.scale.setScalar(0.42); popPig.root.position.set(0, -0.2, 0.1); popPig.root.visible = false; cup.add(popPig.root);
  const confetti = (() => { const n = 60, p = new Float32Array(n * 3), v: number[][] = [], c = new Float32Array(n * 3);
    const cols = ['#F9C6CF', '#FFD45C', '#9CC8EE', '#8FCB9B', '#E4DCF5'].map(h => new Color(h));
    for (let i = 0; i < n; i++) { const k = cols[i % cols.length]; c.set([k.r, k.g, k.b], i * 3); v.push([0, 0, 0]); }
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(p, 3)); g.setAttribute('color', new Float32BufferAttribute(c, 3));
    const pts = new Points(g, new PointsMaterial({ size: 0.07, vertexColors: true })); pts.visible = false; cup.add(pts);
    return { pts, p, v, burst() { pts.visible = true; for (let i = 0; i < n; i++) { p.set([0, 1.9, 0.5], i * 3); v[i] = [(Math.random() - .5) * 3, 1 + Math.random() * 2.5, 1 + Math.random() * 2]; } } }; })();
  let cupT = -1;
  ups.push((dt, t) => { if (cupT < 0) return; cupT += dt;
    const open = Math.min(1, cupT / 0.25); doors.forEach(({ p, sd }) => { p.rotation.y = sd * open * 1.9 * (cupT > 3 ? Math.max(0, 1 - (cupT - 3) / 0.4) : 1); });
    popPig.root.visible = cupT < 3.3; popPig.root.position.z = 0.1 + Math.min(1, cupT / 0.3) * 0.5 - Math.max(0, cupT - 2.6) * 1.2; popPig.animate(dt, 0, 0, t);
    if (confetti.pts.visible) { const { p, v } = confetti; for (let i = 0; i < v.length; i++) { v[i][1] -= 4 * dt; p[i * 3] += v[i][0] * dt; p[i * 3 + 1] = Math.max(0.02, p[i * 3 + 1] + v[i][1] * dt); p[i * 3 + 2] += v[i][2] * dt; if (p[i * 3 + 1] <= 0.02) { v[i][0] *= 0.8; v[i][2] *= 0.8; } }
      confetti.pts.geometry.attributes.position.needsUpdate = true; if (cupT > 8) confetti.pts.visible = false; } });

  // 3 the bedsheet ghost in the graveyard (it has pink trotters)
  const sheetM = new MeshLambertMaterial({ color: '#e8e4dc', emissive: '#2a2a30' });
  const ghost = new Group(); root.add(ghost); ghost.visible = false;
  { const body = box(0.9, 1.3, 0.7, sheetM); body.position.y = 0.95; ghost.add(body); const head = box(0.7, 0.5, 0.6, sheetM); head.position.y = 1.8; ghost.add(head);
    const eyeM = new MeshBasicMaterial({ color: '#141414' }); for (const s of [-1, 1]) { const e = box(0.12, 0.16, 0.02, eyeM); e.position.set(s * 0.15, 1.85, 0.31); ghost.add(e); }
    const tro = new MeshLambertMaterial({ color: '#f4a7b9' }); for (const s of [-1, 1]) { const f = box(0.2, 0.2, 0.24, tro); f.position.set(s * 0.22, 0.1, 0.1); ghost.add(f); }
    const q = new Sprite(new SpriteMaterial({ map: qqT, transparent: true })); q.scale.set(0.5, 0.27, 1); q.position.set(0.35, 2.35, 0); ghost.add(q); }
  const [gx, gz] = beside(EDGE.e12, 15.5, -3.4); let ghostT = -1;
  ups.push((dt, t) => { if (ghostT < 0) return; ghostT += dt; ghost.visible = ghostT < 5.2;
    const rise = Math.min(1, ghostT / 0.8); ghost.position.set(gx + Math.max(0, ghostT - 2.2) * 3.2, -1.6 + rise * 1.6 + Math.sin(t * 6) * 0.05, gz - Math.max(0, ghostT - 2.2) * 1.2);
    ghost.rotation.z = ghostT > 1.8 && ghostT < 2.3 ? Math.sin((ghostT - 1.8) * 30) * 0.25 : ghostT >= 2.3 ? -0.2 : 0; ghost.rotation.y = ghostT > 2.2 ? -1.2 : Math.atan2(-(gx - at(EDGE.e12, 12)[0]), -(gz - at(EDGE.e12, 12)[1])) + Math.PI; });

  // 4 owl eyes in the hollow tree -> a little heart of fireflies
  const owl = [glow('255,214,90', 0.45, 0), glow('255,214,90', 0.45, 0)];
  const [ox, oz] = [NODES.W2.x + 2.6, NODES.W2.z - 4.5]; owl.forEach((s, i) => { s.position.set(ox + (i ? 0.32 : -0.32), 2.6, oz); root.add(s); });
  const heartPts = (() => { const n = 26, sp: Sprite[] = []; const m = glow('255,227,138', 0.3, 0).material as SpriteMaterial; const g = new Group();
    for (let i = 0; i < n; i++) { const q = new Sprite(m); q.scale.setScalar(0.26); g.add(q); sp.push(q); } root.add(g); return { sp, m, n }; })();
  let owlT = -1;
  ups.push((dt) => { if (owlT < 0) return; owlT += dt;
    const blink = owlT < 1.8 ? (Math.floor(owlT * 2.2) % 3 === 2 ? 0 : 1) : 0; owl.forEach(s => { (s.material as SpriteMaterial).opacity = blink; });
    const k = Math.max(0, Math.min(1, (owlT - 1.8) / 1.6)), e = k * k * (3 - 2 * k);
    heartPts.m.opacity = owlT > 1.8 ? Math.min(1, (owlT - 1.8) * 2) * (owlT > 7 ? Math.max(0, 1 - (owlT - 7) / 1.5) : 1) : 0;
    for (let i = 0; i < heartPts.n; i++) { const a = (i / heartPts.n) * Math.PI * 2; const hx = 16 * Math.pow(Math.sin(a), 3) / 16, hy = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16;
      const sx = ox + (i & 1 ? 0.32 : -0.32), sy = 2.6; heartPts.sp[i].position.set(lerp(sx, ox + hx * 0.9, e), lerp(sy, 2.9 + hy * 0.9 + owlT * 0.05, e), oz); } });

  // 5 bats in the tunnel -> pink hearts
  const batT = pixTex(BAT, { b: '#121216', w: '#d23a4e' }, 2), heartT = pixTex(HEART, { p: '#f7a9bb' }, 2);
  const bats = Array.from({ length: 9 }, (_, i) => { const s = new Sprite(new SpriteMaterial({ map: batT, transparent: true })); s.scale.set(0.5, 0.32, 1); s.visible = false; root.add(s); return { s, ph: i * 0.7, o: [(Math.random() - .5) * 1.8, Math.random() * 0.9] }; });
  let batsT = -1; const batFrom = at(EDGE.tun, 17), batTo = at(EDGE.tun, 7.5);
  ups.push((dt, t) => { if (batsT < 0) return; batsT += dt;
    bats.forEach((b, i) => { const k = Math.min(1, Math.max(0, (batsT - i * 0.06) / 1.3)); b.s.visible = batsT < 5.5;
      const pink = batsT > 1.4; if (pink && b.s.material.map !== heartT) { b.s.material.map = heartT; b.s.material.needsUpdate = true; b.s.scale.set(0.34, 0.3, 1); }
      const x = lerp(batFrom[0], batTo[0], k) + b.o[0] + (pink ? Math.sin(t * 3 + b.ph) * 0.3 : 0), z = lerp(batFrom[1], batTo[1], k);
      b.s.position.set(x, 1.3 + b.o[1] + Math.sin(t * 9 + b.ph) * 0.12 + (pink ? (batsT - 1.4) * 0.5 : 0), z);
      b.s.material.opacity = batsT > 4.5 ? Math.max(0, 1 - (batsT - 4.5)) : 1; }); });

  // ---- the last bus (ending) -----------------------------------------------------------------------------------------
  const bus = new Group(); root.add(bus); bus.visible = false;
  { const bodyM = new MeshLambertMaterial({ color: '#f9c6cf', emissive: '#3a1820' }), winM = new MeshBasicMaterial({ color: '#ffe9b8' }), wheelM = new MeshLambertMaterial({ color: '#2e2a2b' });
    const b = box(7.5, 2.6, 2.5, bodyM); b.position.y = 1.65; bus.add(b);
    for (let i = 0; i < 5; i++) { const w = box(1.0, 0.8, 0.02, winM); w.position.set(-2.6 + i * 1.3, 2.2, 1.26); bus.add(w); }
    const wind = box(0.02, 1.0, 2.0, winM); wind.position.set(3.76, 2.1, 0); bus.add(wind);
    for (const x of [-2.4, 2.4]) for (const z of [-1.2, 1.2]) { const w = box(0.8, 0.8, 0.3, wheelM); w.position.set(x, 0.4, z); bus.add(w); }
    const lights = [glow('255,240,200', 2.4, 0.95), glow('255,240,200', 2.4, 0.95)]; lights.forEach((l, i) => { l.position.set(3.85, 0.95, i ? 0.8 : -0.8); bus.add(l); });
    const driver = makePig(); driver.setEyes(0); driver.root.scale.setScalar(0.5); driver.root.position.set(2.9, 0.55, 0); driver.root.rotation.y = Math.PI / 2; driver.root.visible = true; bus.add(driver.root);
    const sgn = box(0.04, 0.5, 1.6, new MeshBasicMaterial({ map: signTexture(lang === 'zh' ? '200 路' : 'ROUTE 200') })); sgn.position.set(3.78, 2.85, 0); bus.add(sgn);
    ups.push((dt, t) => { if (bus.visible) driver.animate(dt, 0, 0, t); }); }
  let busT = -1; const busStop = NODES.BUS;
  ups.push(dt => { if (busT < 0) return; busT += dt; bus.visible = true; const k = Math.min(1, busT / 5), e = 1 - Math.pow(1 - k, 3);
    bus.position.set(lerp(-75, busStop.x - 11, e), 0, -172); bus.rotation.y = 0; });

  // ---- the tree house (hidden best ending) ---------------------------------------------------------------------------
  const lanterns: Sprite[] = [];
  for (let s = 3; s < EDGE.tree.len; s += 3.2) for (const side of [-1, 1]) { const [x, z] = beside(EDGE.tree, s, side * 1.9); const l = glow('249,160,190', 1.2, 0); l.position.set(x, 1.1, z); root.add(l); lanterns.push(l); }
  const bush = new Group(); { const leafM = new MeshLambertMaterial({ map: tileTexture(T.leaves), transparent: true, alphaTest: 0.5 }); const [x, z] = at(EDGE.tree, 3.2);
    for (let i = 0; i < 9; i++) { const b = box(1, 1, 1, leafM); b.position.set(x - 1 + (i % 3), 0.5 + Math.floor(i / 3) * 0.8 - (i > 5 ? 0.3 : 0), z + (i % 2) * 0.4); bush.add(b); } root.add(bush); }
  const treePig = makePig(); treePig.setEyes(0); treePig.root.position.set(-4.2, 6, -188.5); treePig.root.scale.setScalar(0.62); treePig.root.rotation.y = 0.15; root.add(treePig.root);
  // the firefly heart: little glow sprites (Points were too small to read on a phone)
  const treeHeart = (() => { const n = 44, seeds: number[][] = [], sp: Sprite[] = []; const base = glow('255,227,138', 0.5, 0); const m = base.material as SpriteMaterial;
    const g = new Group(); for (let i = 0; i < n; i++) { seeds.push([Math.random() * 20 - 10, Math.random() * 6, Math.random() * 12 - 6, Math.random() * 6]); const q = new Sprite(m); q.scale.setScalar(0.5); g.add(q); sp.push(q); }
    g.visible = false; root.add(g); return { seeds, m, g, sp, n }; })();
  let unlockK = 0, unlocked = false, treeT = -1;
  ups.push((dt, t) => {
    if (unlocked && unlockK < 1) { unlockK = Math.min(1, unlockK + dt / 1.6); bush.scale.setScalar(Math.max(0.001, 1 - unlockK)); if (unlockK >= 1) bush.visible = false; }
    lanterns.forEach((l, i) => { (l.material as SpriteMaterial).opacity = unlockK * (0.55 + 0.25 * Math.sin(t * 2 + i)); });
    treePig.root.visible = unlocked; if (unlocked) treePig.animate(dt, 0, 0, t);
    if (treeT >= 0) { treeT += dt; const k = Math.min(1, treeT / 4), e = k * k * (3 - 2 * k); treeHeart.g.visible = true; treeHeart.m.opacity = Math.min(1, treeT);
      for (let i = 0; i < treeHeart.n; i++) { const a = (i / treeHeart.n) * Math.PI * 2, s = treeHeart.seeds[i];
        const hx = 16 * Math.pow(Math.sin(a), 3) / 16 * 1.9, hy = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16 * 1.9;
        treeHeart.sp[i].position.set(lerp(-4 + s[0], -3.6 + hx, e) + Math.sin(t + s[3]) * 0.05 * (1 - e), lerp(1 + s[1], 7.6 + hy, e), lerp(-180 + s[2], -184.2, e)); treeHeart.sp[i].scale.setScalar(0.42 + 0.12 * Math.sin(t * 3 + s[3])); } }
  });

  return {
    root, pickups, musicDoor, cryptDoor, grate, gate,
    show(id: string) { const p = pickups.get(id); if (p && !p.taken) { p.shown = true; p.obj.visible = true; } },
    take(id: string) { const p = pickups.get(id); if (p) { p.taken = true; p.obj.visible = false; } },
    scare: { portrait() { portraitT = 0; }, cupboard() { cupT = 0; confetti.burst(); }, ghost() { ghostT = 0; }, owl() { owlT = 0; }, bats() { batsT = 0; } },
    busArrive() { busT = 0; },
    get busHere() { return busT > 5; },
    unlockTree(instant = false) { unlocked = true; if (instant) { unlockK = 1; bush.visible = false; } },
    treeScene() { treeT = 0; },
    get dbgHeart() { return { t: treeT, op: treeHeart.m.opacity, p: treeHeart.sp[0].position.toArray() }; },
    setLang(l: Lang) { lang = l; for (const s of signs) { s.mat.map?.dispose(); s.mat.map = signTexture(l === 'zh' ? s.zh : s.en); s.mat.needsUpdate = true; } gate.setLang(l); },
    update(dt: number, t: number) { for (const u of ups) u(dt, t); },
    /** lamp spots for the one extra point light: [x, y, z, colour, intensity] */
    lamps: [
      [-2, 3.6, -82, '#ffc27a', 5], [0, 3.6, -66, '#ffb35c', 3.5], [CRYPT.x0 - 1.4, 1.2, -83.6, '#ffb35c', 4], [-28, 4.2, -174, '#ffe9b8', 9], [-4.5, 7.6, -189, '#ff9ec0', 8],
    ] as [number, number, number, string, number][],
  };
}
export type Props = ReturnType<typeof makeProps>;
