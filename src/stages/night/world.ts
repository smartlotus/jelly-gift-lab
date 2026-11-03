// Voxel night forest: block data -> face-culled merged meshes (1 opaque + 1 cutout draw call) with Minecraft-style
// per-vertex ambient occlusion and directional face shading. The walk follows a fixed gravel path along -Z.
import { BufferGeometry, Float32BufferAttribute, Mesh, MeshLambertMaterial, DoubleSide, Group, BoxGeometry, type Texture } from 'three';
import { T, uvRect, rng, signTexture, tileTexture } from './textures';

export const END_D = 118;            // dead end (wall + gate) distance
export const SIGN_D = 24, PINK_D = 33, MUSH_D = 11;
/** x of the path centre at distance d (walk goes toward -Z, z = -d) */
export function pathX(d: number) { return 2.3 * Math.sin(d * 0.068) + 1.4 * Math.sin(d * 0.021 + 1.1) - 1.4 * Math.sin(1.1); }
export function pathDir(d: number) { const e = 0.5; return Math.atan2(pathX(d + e) - pathX(d - e), 2 * e); } // yaw offset (rad, +x)

const X0 = -24, X1 = 24, Y0 = -3, Y1 = 16, Z0 = -132, Z1 = 14;
const NX = X1 - X0, NY = Y1 - Y0, NZ = Z1 - Z0;
export const B = { air: 0, grass: 1, dirt: 2, stone: 3, cobble: 4, path: 5, oak: 6, birch: 7, leaves: 8, dark: 9, planks: 10, mossy: 11, pink: 12, bars: 13 } as const;
const CUT = new Set<number>([B.leaves, B.dark, B.bars]);
// [top, side, bottom] tiles per block id
const FACES: Record<number, [number, number, number]> = {
  [B.grass]: [T.grassTop, T.grassSide, T.dirt], [B.dirt]: [T.dirt, T.dirt, T.dirt], [B.stone]: [T.stone, T.stone, T.stone],
  [B.cobble]: [T.cobble, T.cobble, T.cobble], [B.path]: [T.path, T.dirt, T.dirt], [B.oak]: [T.oakTop, T.oakSide, T.oakTop],
  [B.birch]: [T.oakTop, T.birchSide, T.oakTop], [B.leaves]: [T.leaves, T.leaves, T.leaves], [B.dark]: [T.darkLeaves, T.darkLeaves, T.darkLeaves],
  [B.planks]: [T.planks, T.planks, T.planks], [B.mossy]: [T.mossy, T.mossy, T.mossy], [B.pink]: [T.pig, T.pig, T.pig], [B.bars]: [T.bars, T.bars, T.bars],
};

const vox = new Uint8Array(NX * NY * NZ);
const idx = (x: number, y: number, z: number) => (x - X0) + NX * ((y - Y0) + NY * (z - Z0));
export function get(x: number, y: number, z: number) {
  if (y < Y0) return B.stone;
  if (x < X0 || x >= X1 || y >= Y1 || z < Z0 || z >= Z1) return B.air;
  return vox[idx(x, y, z)];
}
function set(x: number, y: number, z: number, b: number) { if (x < X0 || x >= X1 || y < Y0 || y >= Y1 || z < Z0 || z >= Z1) return; vox[idx(x, y, z)] = b; }
const heights = new Int8Array(NX * NZ);
export const groundH = (x: number, z: number) => heights[(x - X0) + NX * (z - Z0)] ?? 0;

type Plant = { x: number; y: number; z: number; tile: number; s: number };
const plants: Plant[] = [];

function noise(x: number, z: number) { return Math.sin(x * 0.31 + z * 0.17) * 0.6 + Math.sin(x * 0.13 - z * 0.29 + 2.0) * 0.8 + Math.sin(x * 0.57 + z * 0.41 + 4.0) * 0.35; }

function generate() {
  const r = rng(200);
  for (let z = Z0; z < Z1; z++) for (let x = X0; x < X1; x++) {
    const d = -(z + 0.5), dx = Math.abs(x + 0.5 - pathX(d));
    const enclose = d > END_D - 30 ? (d - (END_D - 30)) * 0.06 : 0;
    let h = 0;
    if (dx > 3.2) h = Math.floor(Math.max(0, Math.min(7, (dx - 3.2) * (0.32 + enclose) + noise(x, z) * 1.1 + 0.3)));
    heights[(x - X0) + NX * (z - Z0)] = h;
    const onPath = dx < 1.55 && d > -6 && d < END_D + 1;
    for (let y = Y0; y < h; y++) {
      const top = y === h - 1;
      set(x, y, z, top ? (onPath && h === 0 ? B.path : B.grass) : y >= h - 3 ? B.dirt : B.stone);
    }
    // stony outcrops on slopes
    if (h > 2 && r() < 0.12) set(x, h - 1, z, r() < .5 ? B.stone : B.mossy);
    // plants
    if (!onPath && h <= 3) {
      const p = r();
      if (p < 0.16) plants.push({ x, y: h, z, tile: T.tallGrass, s: 0.8 + r() * 0.3 });
      else if (p < 0.175) plants.push({ x, y: h, z, tile: r() < .6 ? T.flower : T.bluebell, s: 0.7 });
    }
  }
  // trees
  for (let z = Z1 - 2; z > Z0 + 2; z -= 2) for (let x = X0 + 1; x < X1 - 1; x += 2) {
    const jx = x + Math.floor(r() * 2), jz = z - Math.floor(r() * 2);
    const d = -(jz + 0.5), dx = Math.abs(jx + 0.5 - pathX(d));
    if (dx < 2.8 || d > END_D - 1 && d < END_D + 3) continue;
    const dens = dx < 5 ? 0.22 : 0.3;
    if (r() > dens) continue;
    tree(jx, groundH(jx, jz), jz, r);
  }
  // foreshadow pink block, mushroom, sign spots
  const pd = PINK_D, px = Math.round(pathX(pd) + 5.5), pz = Math.floor(-pd);
  const ph = groundH(px, pz); set(px, ph, pz, B.pink);
  plants.push({ x: Math.floor(pathX(MUSH_D) - 2.4), y: 0, z: Math.floor(-MUSH_D), tile: T.mushroom, s: 0.75 });
  // dead end: mossy wall across the world + iron bars gate on the path
  for (let z = -END_D - 3; z <= -END_D - 1; z++) for (let x = X0; x < X1; x++) {
    const g = groundH(x, z), dxp = Math.abs(x + 0.5 - pathX(END_D + 2));
    for (let y = 0; y < Math.max(g, 0) + 5; y++) {
      const gate = dxp < 1.6 && y < 3 && z === -END_D - 1;
      if (gate) set(x, y, z, B.bars); else if (!(dxp < 1.6 && y < 3)) set(x, y, z, r() < .3 ? B.mossy : B.cobble);
    }
  }
}

function tree(x: number, g: number, z: number, r: () => number) {
  const kind = r(); const h = 4 + Math.floor(r() * 3);
  const log = kind < 0.25 ? B.birch : B.oak, leaf = kind > 0.7 ? B.dark : B.leaves;
  for (let y = g; y < g + h; y++) set(x, y, z, log);
  const top = g + h;
  if (leaf === B.dark) { // spruce-ish cone
    for (let l = 0; l < 5; l++) { const rad = l < 1 ? 0 : l < 3 ? 1 : 2; const y = top + 1 - l;
      for (let a = -rad; a <= rad; a++) for (let b = -rad; b <= rad; b++) { if (Math.abs(a) + Math.abs(b) > rad + 1) continue; if (get(x + a, y, z + b) === B.air) set(x + a, y, z + b, leaf); } }
    set(x, top + 1, z, leaf); set(x, top, z, leaf);
  } else {
    for (let y = top - 2; y <= top + 1; y++) { const rad = y >= top ? 1 : 2;
      for (let a = -rad; a <= rad; a++) for (let b = -rad; b <= rad; b++) {
        if (Math.abs(a) === rad && Math.abs(b) === rad && (y >= top || r() < 0.6)) continue;
        if (get(x + a, y, z + b) === B.air) set(x + a, y, z + b, leaf);
      } }
  }
}

// --- meshing ---------------------------------------------------------------------------------------------------
const DIRS: { n: [number, number, number]; c: [number, number, number][]; shade: number; face: 0 | 1 | 2 }[] = [
  { n: [0, 1, 0], c: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], shade: 1.0, face: 0 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.45, face: 2 },
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], shade: 0.7, face: 1 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]], shade: 0.7, face: 1 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.85, face: 1 },
  { n: [0, 0, -1], c: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]], shade: 0.85, face: 1 },
];
const AO = [0.45, 0.62, 0.8, 1.0];
const solid = (b: number) => b !== B.air && !CUT.has(b);

class Buf { p: number[] = []; uv: number[] = []; c: number[] = []; i: number[] = []; n: number[] = [];
  geo() { const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new Float32BufferAttribute(this.c, 3)); g.setIndex(this.i); g.computeBoundingSphere(); return g; } }

function mesh(opaque: Buf, cut: Buf) {
  for (let z = Z0; z < Z1; z++) for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const b = vox[idx(x, y, z)]; if (!b) continue;
    const isCut = CUT.has(b), out = isCut ? cut : opaque;
    for (const D of DIRS) {
      const nb = get(x + D.n[0], y + D.n[1], z + D.n[2]);
      if (solid(nb) || (isCut && nb === b)) continue;
      const tile = FACES[b][D.face]; const [u0, v0, u1, v1] = uvRect(tile);
      const base = out.p.length / 3;
      const axis = D.n[0] ? 0 : D.n[1] ? 1 : 2; const ta = axis === 0 ? 2 : 0, tb = axis === 1 ? 2 : 1;
      const aos: number[] = [];
      for (const c of D.c) {
        out.p.push(x + c[0], y + c[1], z + c[2]); out.n.push(...D.n);
        const hu = axis === 1 ? c[0] : (axis === 0 ? c[2] : c[0]); const hv = axis === 1 ? c[2] : c[1];
        out.uv.push(hu ? u1 : u0, hv ? v1 : v0);
        // AO: look at the 3 cells around this corner in the layer in front of the face
        const fx = x + D.n[0], fy = y + D.n[1], fz = z + D.n[2];
        const sa = c[ta] ? 1 : -1, sb = c[tb] ? 1 : -1;
        const o1 = [0, 0, 0], o2 = [0, 0, 0]; o1[ta] = sa; o2[tb] = sb;
        const s1 = +solid(get(fx + o1[0], fy + o1[1], fz + o1[2])), s2 = +solid(get(fx + o2[0], fy + o2[1], fz + o2[2]));
        const cc = +solid(get(fx + o1[0] + o2[0], fy + o1[1] + o2[1], fz + o1[2] + o2[2]));
        const ao = s1 && s2 ? 0 : 3 - (s1 + s2 + cc); aos.push(ao);
        const k = D.shade * AO[ao] * (isCut ? 0.9 : 1); out.c.push(k, k, k);
      }
      // winding so the face points along n; flip the quad diagonal for nicer AO interpolation
      const p = out.p, a = base * 3;
      const e1 = [p[a + 3] - p[a], p[a + 4] - p[a + 1], p[a + 5] - p[a + 2]], e2 = [p[a + 6] - p[a], p[a + 7] - p[a + 1], p[a + 8] - p[a + 2]];
      const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const fwd = cr[0] * D.n[0] + cr[1] * D.n[1] + cr[2] * D.n[2] > 0;
      const flip = aos[0] + aos[2] < aos[1] + aos[3];
      const q = flip ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];
      if (!fwd) { [q[1], q[2]] = [q[2], q[1]]; [q[4], q[5]] = [q[5], q[4]]; }
      for (const k of q) out.i.push(base + k);
    }
  }
  for (const pl of plants) {
    const [u0, v0, u1, v1] = uvRect(pl.tile); const s = pl.s, cx = pl.x + 0.5, cz = pl.z + 0.5, h = s;
    for (const [dx, dz] of [[1, 1], [1, -1]]) {
      const base = cut.p.length / 3, hx = dx * 0.45 * s, hz = dz * 0.45 * s;
      cut.p.push(cx - hx, pl.y, cz - hz, cx + hx, pl.y, cz + hz, cx + hx, pl.y + h, cz + hz, cx - hx, pl.y + h, cz - hz);
      for (let k = 0; k < 4; k++) { cut.n.push(0, 1, 0); cut.c.push(0.85, 0.85, 0.85); }
      cut.uv.push(u0, v0, u1, v0, u1, v1, u0, v1); cut.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
}

export function buildWorld(atlas: Texture, lang: 'en' | 'zh') {
  generate();
  const o = new Buf(), c = new Buf(); mesh(o, c);
  const g = new Group();
  const mOpaque = new MeshLambertMaterial({ map: atlas, vertexColors: true });
  const mCut = new MeshLambertMaterial({ map: atlas, vertexColors: true, alphaTest: 0.5, side: DoubleSide });
  g.add(new Mesh(o.geo(), mOpaque), new Mesh(c.geo(), mCut));
  // "don't look back" sign on a post, left of the path, angled toward the walker
  const sd = SIGN_D, sx = pathX(sd) - 2.1;
  const sign = new Group();
  const post = new Mesh(new BoxGeometry(0.14, 1.3, 0.14), new MeshLambertMaterial({ map: tileTexture(T.oakSide) })); post.position.y = 0.65;
  const board = new Mesh(new BoxGeometry(1.15, 0.6, 0.08), [0, 0, 0, 0, 1, 0].map(i => new MeshLambertMaterial({ map: i ? signTexture(lang === 'zh' ? '别回头' : "DON'T LOOK BACK") : tileTexture(T.planks) })));
  board.position.y = 1.25; sign.add(post, board);
  sign.position.set(sx, 0, -sd); sign.rotation.y = 0.55; sign.rotation.z = -0.06;
  g.add(sign);
  return { group: g, setSignLang(l: 'en' | 'zh') { const m = (board.material as MeshLambertMaterial[])[4]; m.map?.dispose(); m.map = signTexture(l === 'zh' ? '别回头' : "DON'T LOOK BACK"); m.needsUpdate = true; } };
}
