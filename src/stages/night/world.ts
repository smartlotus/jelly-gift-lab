// Voxel night world (v03f: the branching map, src/stages/night/map.ts). Block data -> face-culled meshes with Minecraft-
// style per-vertex ambient occlusion, built per 16×16 chunk (frustum-culled, distance-hidden) and meshed a few chunks per
// frame behind the loading curtain. Themes follow the nearest path: forest, the old house, the graveyard + crypt, the
// tunnel through the hill, the gate clearing, the bus road, the dead end and the hidden pink path to the tree house.
import { BufferGeometry, Float32BufferAttribute, Mesh, MeshLambertMaterial, DoubleSide, Group, type Texture } from 'three';
import { T, uvRect, rng } from './textures';
import { EDGES, EDGE, NODES, at, X0, X1, Z0, Z1, type Edge, type Theme } from './map';

const Y0 = -3, Y1 = 18;
const NX = X1 - X0, NY = Y1 - Y0, NZ = Z1 - Z0;
export const B = { air: 0, grass: 1, dirt: 2, stone: 3, cobble: 4, path: 5, oak: 6, birch: 7, leaves: 8, dark: 9, planks: 10, mossy: 11, pink: 12, bars: 13,
  grave: 14, dplanks: 15, paper: 16, window: 17, ppath: 18, podzol: 19, road: 20 } as const;
const CUT = new Set<number>([B.leaves, B.dark, B.bars]);
const FACES: Record<number, [number, number, number]> = {
  [B.grass]: [T.grassTop, T.grassSide, T.dirt], [B.dirt]: [T.dirt, T.dirt, T.dirt], [B.stone]: [T.stone, T.stone, T.stone],
  [B.cobble]: [T.cobble, T.cobble, T.cobble], [B.path]: [T.path, T.dirt, T.dirt], [B.oak]: [T.oakTop, T.oakSide, T.oakTop],
  [B.birch]: [T.oakTop, T.birchSide, T.oakTop], [B.leaves]: [T.leaves, T.leaves, T.leaves], [B.dark]: [T.darkLeaves, T.darkLeaves, T.darkLeaves],
  [B.planks]: [T.planks, T.planks, T.planks], [B.mossy]: [T.mossy, T.mossy, T.mossy], [B.pink]: [T.pig, T.pig, T.pig], [B.bars]: [T.bars, T.bars, T.bars],
  [B.grave]: [T.stone, T.grave, T.stone], [B.dplanks]: [T.dplanks, T.dplanks, T.dplanks], [B.paper]: [T.dplanks, T.paper, T.dplanks],
  [B.window]: [T.dplanks, T.window, T.dplanks], [B.ppath]: [T.ppath, T.dirt, T.dirt], [B.podzol]: [T.podzol, T.dirt, T.dirt], [B.road]: [T.cobble, T.stone, T.stone],
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
const col = (x: number, z: number) => (x - X0) + NX * (z - Z0);
export const groundH = (x: number, z: number) => (x < X0 || x >= X1 || z < Z0 || z >= Z1) ? 0 : heights[col(Math.floor(x), Math.floor(z))];

// nearest-path field: distance, edge index, arc length along it
const dist = new Float32Array(NX * NZ).fill(99), near = new Int16Array(NX * NZ).fill(-1), nearS = new Float32Array(NX * NZ);
function field() {
  EDGES.forEach((e, ei) => {
    for (let i = 0; i < e.xs.length; i += 2) {
      const px = e.xs[i], pz = e.zs[i], s = (i / (e.xs.length - 1)) * e.len;
      for (let z = Math.floor(pz - 11); z <= pz + 11; z++) for (let x = Math.floor(px - 11); x <= px + 11; x++) {
        if (x < X0 || x >= X1 || z < Z0 || z >= Z1) continue;
        const d = Math.hypot(x + 0.5 - px, z + 0.5 - pz), c = col(x, z);
        if (d < dist[c]) { dist[c] = d; near[c] = ei; nearS[c] = s; }
      }
    }
  });
}
const themeAt = (x: number, z: number): Theme | null => { const n = near[col(x, z)]; return n >= 0 ? EDGES[n].theme : null; };
const edgeAt = (x: number, z: number): Edge | null => { const n = near[col(x, z)]; return n >= 0 ? EDGES[n] : null; };

type Plant = { x: number; y: number; z: number; tile: number; s: number };
const plants: Plant[] = [];
function noise(x: number, z: number) { return Math.sin(x * 0.31 + z * 0.17) * 0.6 + Math.sin(x * 0.13 - z * 0.29 + 2.0) * 0.8 + Math.sin(x * 0.57 + z * 0.41 + 4.0) * 0.35; }

// structure footprints (no trees, flattened)
export const HOUSE = { x0: -8, x1: 8, z0: -97, z1: -58 };
export const CRYPT = { x0: 43, x1: 50, z0: -89, z1: -79 };
const inBox = (x: number, z: number, b: { x0: number; x1: number; z0: number; z1: number }, pad = 0) => x >= b.x0 - pad && x < b.x1 + pad && z >= b.z0 - pad && z < b.z1 + pad;
const WALL_Z = -151; // the gate wall north of the clearing
const ravine = (e: Edge | null, s: number) => e?.id === 'w2g' && s > 27 && s < 33;
const tunnelS = (e: Edge | null, s: number) => e?.id === 'tun' && s > 5 && s < e.len - 6;

function generate() {
  field();
  const r = rng(200);
  for (let z = Z0; z < Z1; z++) for (let x = X0; x < X1; x++) {
    const c = col(x, z), dx = dist[c], th = themeAt(x, z), e = edgeAt(x, z), s = nearS[c];
    const enclose = th === 'end' ? 0.5 : th === 'tunnel' ? 0.25 : th === 'clear' ? 0.2 : 0;
    let h = 0;
    if (dx > 3.2) h = Math.floor(Math.max(0, Math.min(9, (dx - 3.2) * (0.3 + enclose) + noise(x, z) * 1.1 + 0.3)));
    if (inBox(x, z, HOUSE, 2) || inBox(x, z, CRYPT, 2)) h = 0;
    if (tunnelS(e, s) && dx < 9) h = Math.max(h, Math.round(8 - Math.max(0, dx - 4.5) * 1.3));
    if (th === 'grave' && dx < 11) h = Math.min(h, 1);
    if (th === 'road' && dx < 4) h = 0;
    const pit = ravine(e, s) && dx < 10;
    heights[c] = pit ? -3 : h;
    const onPath = dx < (th === 'road' ? 2.2 : 1.55);
    if (pit) { if (dx < 1.3) set(x, -1, z, B.planks); continue; }
    for (let y = Y0; y < h; y++) {
      const top = y === h - 1;
      let b: number = top ? (onPath && h === 0 ? B.path : B.grass) : y >= h - 3 ? B.dirt : B.stone;
      if (top && onPath && h === 0) b = th === 'pink' ? B.ppath : th === 'road' ? B.road : th === 'house' ? B.dplanks : th === 'grave' ? B.path : B.path;
      if (top && !onPath && th === 'grave' && dx < 12) b = B.podzol;
      if (tunnelS(e, s) && dx < 9 && y >= 3) b = r() < 0.2 ? B.mossy : B.stone;
      set(x, y, z, b);
    }
    // tunnel bore: 3 wide, 3 tall, stone floor
    if (tunnelS(e, s) && dx < 1.7) { for (let y = 0; y < 3; y++) set(x, y, z, B.air); set(x, -1, z, B.path); heights[c] = 0; }
    if (h > 2 && r() < 0.12 && !tunnelS(e, s)) set(x, h - 1, z, r() < .5 ? B.stone : B.mossy);
    if (!onPath && h <= 3 && h >= 0 && !inBox(x, z, HOUSE, 1) && !inBox(x, z, CRYPT, 1)) {
      const p = r();
      if (th === 'grave') { if (p < 0.05) plants.push({ x, y: h, z, tile: T.tallGrass, s: 0.6 }); }
      else if (p < 0.16) plants.push({ x, y: h, z, tile: T.tallGrass, s: 0.8 + r() * 0.3 });
      else if (p < (th === 'pink' ? 0.26 : 0.175)) plants.push({ x, y: h, z, tile: r() < .6 || th === 'pink' ? T.flower : T.bluebell, s: 0.7 });
    }
  }
  // trees (theme density)
  const dens: Record<Theme, number> = { forest: 0.3, house: 0.2, grave: 0.05, tunnel: 0.28, clear: 0.12, road: 0.14, pink: 0.24, end: 0.36 };
  for (let z = Z1 - 2; z > Z0 + 2; z -= 2) for (let x = X0 + 1; x < X1 - 1; x += 2) {
    const jx = x + Math.floor(r() * 2), jz = z - Math.floor(r() * 2), c = col(jx, jz), dx = dist[c], th = themeAt(jx, jz) ?? 'forest';
    if (dx < 3.2 || inBox(jx, jz, HOUSE, 3) || inBox(jx, jz, CRYPT, 3) || Math.abs(jz - WALL_Z) < 3 && Math.abs(jx) < 18) continue;
    if (tunnelS(edgeAt(jx, jz), nearS[c]) && dx < 9) continue;
    if (heights[c] < 0) continue;
    if (r() > (dx < 5 ? dens[th] * 0.7 : dens[th])) continue;
    tree(jx, heights[c], jz, r, th === 'grave');
  }
  house(r); crypt(r); graves(r); gateWall(r); deadEnd(r); busStop(); treeHouse(r);
  // the foreshadowing pink block on the first path (also sticker #1's spot)
  { const [px, pz] = at(EDGE.s, 33); const bx = Math.round(px + 5.5), bz = Math.floor(pz); set(bx, heights[col(bx, bz)], bz, B.pink); }
  plants.push({ x: Math.floor(at(EDGE.s, 11)[0] - 2.4), y: 0, z: Math.floor(at(EDGE.s, 11)[1]), tile: T.mushroom, s: 0.75 });
}

function tree(x: number, g: number, z: number, r: () => number, dead = false) {
  const kind = r(); const h = 4 + Math.floor(r() * 3);
  const log = kind < 0.25 ? B.birch : B.oak, leaf = kind > 0.7 ? B.dark : B.leaves;
  for (let y = g; y < g + h; y++) set(x, y, z, log);
  const top = g + h;
  if (dead) { // bare branches
    set(x + 1, top - 2, z, B.oak); set(x - 1, top - 1, z, B.oak); set(x, top - 1, z + 1, B.oak); if (r() < .4) set(x + 1, top, z, B.dark);
    return;
  }
  if (leaf === B.dark) {
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

const pathNear = (x: number, z: number, w = 1.3) => dist[col(x, z)] < w;
function house(r: () => number) {
  const { x0, x1, z0, z1 } = HOUSE;
  for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
    set(x, -1, z, B.dplanks);
    const edgeOuter = x === x0 || x === x1 - 1 || z === z0 || z === z1 - 1;
    const edgeInner = !edgeOuter && (x === x0 + 1 || x === x1 - 2 || z === z0 + 1 || z === z1 - 2);
    const corner = (x === x0 || x === x1 - 1) && (z === z0 || z === z1 - 1);
    for (let y = 0; y < 5; y++) {
      if (edgeOuter) set(x, y, z, corner ? B.oak : (y === 2 && (x === x0 || x === x1 - 1) && z % 5 === 0) ? B.window : B.planks);
      else if (edgeInner) set(x, y, z, (y === 2 && (x === x0 + 1 || x === x1 - 2) && z % 5 === 0) ? B.window : B.paper);
    }
    set(x, 5, z, B.dplanks); // ceiling
    // gabled roof along z
    const ax = Math.min(x - x0, x1 - 1 - x); for (let y = 6; y < 6 + Math.min(4, ax + 1); y++) if (y === 5 + Math.min(4, ax + 1)) set(x, y, z, B.dplanks);
  }
  // interior walls: hall | music room | back hall
  for (const wz of [-76, -89]) for (let x = x0 + 2; x < x1 - 2; x++) for (let y = 0; y < 5; y++) set(x, y, wz, B.paper);
  // doorways where the path crosses a wall (front, inner, back): 3 wide, 3 tall
  for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) if (pathNear(x, z, 1.25)) {
    const wall = get(x, 1, z); if (wall === B.planks || wall === B.paper || wall === B.window || wall === B.oak) for (let y = 0; y < 3; y++) set(x, y, z, B.air);
  }
  // a little furniture: bookshelves in the hall, a table in the music room, stairs going nowhere
  for (let z = -72; z < -66; z++) for (let y = 0; y < 3; y++) set(x1 - 3, y, z, r() < 0.5 ? B.oak : B.planks);
  for (let x = -6; x < -3; x++) set(x, 0, -84, B.planks);
  for (let i = 0; i < 4; i++) for (let k = 0; k <= i; k++) set(4, k, -66 + i, B.dplanks);
}
function crypt(r: () => number) {
  const { x0, x1, z0, z1 } = CRYPT;
  for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
    const edge = x === x0 || x === x1 - 1 || z === z0 || z === z1 - 1;
    for (let y = 0; y < 4; y++) if (edge) set(x, y, z, r() < 0.3 ? B.mossy : B.cobble);
    set(x, 4, z, B.stone); if (x > x0 && x < x1 - 1 && z > z0 && z < z1 - 1) set(x, 5, z, B.cobble);
    set(x, -1, z, B.cobble);
  }
  for (let z = -85; z <= -83; z++) for (let y = 0; y < 3; y++) set(x0, y, z, B.air); // doorway (west, a dynamic stone door sits here)
  for (const z of [-87, -81]) for (let y = 0; y < 5; y++) set(x0 - 1, y, z, B.cobble); // pillars
}
function graves(r: () => number) {
  for (const id of ['fe', 'e12', 'e23']) {
    const e = EDGE[id];
    for (let s = 4; s < e.len - 2; s += 2.2) {
      const [px, pz] = at(e, s), [qx, qz] = at(e, s + 0.5); const nx = -(qz - pz), nz = qx - px, nl = Math.hypot(nx, nz) || 1;
      for (const side of [-1, 1]) {
        if (r() < 0.35) continue;
        const off = 3.6 + r() * 4.5, gx = Math.floor(px + nx / nl * off * side), gz = Math.floor(pz + nz / nl * off * side);
        if (dist[col(gx, gz)] < 3 || inBox(gx, gz, CRYPT, 1)) continue;
        const g = Math.max(0, heights[col(gx, gz)]); set(gx, g, gz, B.grave); if (r() < 0.7) set(gx, g + 1, gz, B.grave);
        if (r() < 0.3) plants.push({ x: gx + (r() < .5 ? 1 : -1), y: g, z: gz, tile: T.flower, s: 0.55 });
      }
      // iron fence posts further out
      for (const side of [-1, 1]) {
        const fx = Math.floor(px + nx / nl * 9.5 * side), fz = Math.floor(pz + nz / nl * 9.5 * side);
        if (dist[col(fx, fz)] < 8.5) continue;
        const g = Math.max(0, heights[col(fx, fz)]); set(fx, g, fz, B.bars); set(fx, g + 1, fz, B.bars);
      }
    }
  }
}
function gateWall(r: () => number) {
  for (let z = WALL_Z - 1; z <= WALL_Z; z++) for (let x = -20; x <= 20; x++) {
    const open = pathNear(x, z, 1.9);
    const g = Math.max(0, heights[col(x, z)]);
    for (let y = 0; y < g + 5; y++) if (!(open && y < 3)) set(x, y, z, r() < .3 ? B.mossy : B.cobble);
  }
}
function deadEnd(r: () => number) {
  const [ex, ez] = [NODES.END.x, NODES.END.z];
  for (let z = Math.floor(ez) - 3; z <= Math.floor(ez) - 1; z++) for (let x = Math.floor(ex) - 14; x <= ex + 14; x++) {
    const g = Math.max(0, heights[col(x, z)]), dxp = Math.abs(x + 0.5 - ex);
    for (let y = 0; y < g + 5; y++) {
      const bars = dxp < 1.6 && y < 3 && z === Math.floor(ez) - 1;
      if (bars) set(x, y, z, B.bars); else if (!(dxp < 1.6 && y < 3)) set(x, y, z, r() < .3 ? B.mossy : B.cobble);
    }
  }
}
function busStop() {
  // the road runs on west past the stop, out of the map
  for (let z = -175; z <= -169; z++) for (let x = X0; x < -24; x++) { heights[col(x, z)] = 0; for (let y = 0; y < 8; y++) set(x, y, z, B.air); set(x, -1, z, Math.abs(z + 172) < 2.5 ? B.road : B.grass); }
  for (let x = -32; x <= -30; x++) set(x, 0, -175, B.planks); // bench
}
function treeHouse(r: () => number) {
  const tx = -5, tz = -191, g = 0;
  for (let y = g; y < g + 11; y++) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) set(tx + a, y, tz + b, B.oak);
  for (let y = g + 9; y <= g + 13; y++) { const rad = y > g + 11 ? 2 : 4; for (let a = -rad; a <= rad + 1; a++) for (let b = -rad; b <= rad + 1; b++) { if (Math.abs(a - 0.5) + Math.abs(b - 0.5) > rad + 1.5 || r() < 0.08) continue; if (get(tx + a, y, tz + b) === B.air) set(tx + a, y, tz + b, B.leaves); } }
  for (let a = -2; a <= 3; a++) for (let b = -2; b <= 3; b++) set(tx + a, g + 5, tz + b, B.planks); // platform
  for (let y = 0; y < 5; y++) set(tx - 1, y, tz + 1, (y & 1) ? B.planks : B.air); // ladder-ish rungs
  set(tx + 3, g + 6, tz - 2, B.pink); set(tx - 2, g + 6, tz + 3, B.pink);
}

// --- meshing (per chunk) ------------------------------------------------------------------------------------------
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

function meshChunk(opaque: Buf, cut: Buf, cx: number, cz: number, chunkPlants: Plant[]) {
  for (let z = cz; z < Math.min(Z1, cz + 16); z++) for (let y = Y0; y < Y1; y++) for (let x = cx; x < Math.min(X1, cx + 16); x++) {
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
        const fx = x + D.n[0], fy = y + D.n[1], fz = z + D.n[2];
        const sa = c[ta] ? 1 : -1, sb = c[tb] ? 1 : -1;
        const o1 = [0, 0, 0], o2 = [0, 0, 0]; o1[ta] = sa; o2[tb] = sb;
        const s1 = +solid(get(fx + o1[0], fy + o1[1], fz + o1[2])), s2 = +solid(get(fx + o2[0], fy + o2[1], fz + o2[2]));
        const cc = +solid(get(fx + o1[0] + o2[0], fy + o1[1] + o2[1], fz + o1[2] + o2[2]));
        const ao = s1 && s2 ? 0 : 3 - (s1 + s2 + cc); aos.push(ao);
        const k = D.shade * AO[ao] * (isCut ? 0.9 : 1); out.c.push(k, k, k);
      }
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
  for (const pl of chunkPlants) {
    const [u0, v0, u1, v1] = uvRect(pl.tile); const s = pl.s, cx2 = pl.x + 0.5, cz2 = pl.z + 0.5, h = s;
    for (const [dx, dz] of [[1, 1], [1, -1]]) {
      const base = cut.p.length / 3, hx = dx * 0.45 * s, hz = dz * 0.45 * s;
      cut.p.push(cx2 - hx, pl.y, cz2 - hz, cx2 + hx, pl.y, cz2 + hz, cx2 + hx, pl.y + h, cz2 + hz, cx2 - hx, pl.y + h, cz2 - hz);
      for (let k = 0; k < 4; k++) { cut.n.push(0, 1, 0); cut.c.push(0.85, 0.85, 0.85); }
      cut.uv.push(u0, v0, u1, v0, u1, v1, u0, v1); cut.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
}

export interface World { group: Group; chunks: { mesh: Group; x: number; z: number }[]; cull(x: number, z: number): void }
/** generate + mesh; yields every few chunks (onP 0..1) so the loading curtain keeps hopping */
export async function buildWorld(atlas: Texture, onP: (p: number) => void = () => {}): Promise<World> {
  generate(); onP(0.15);
  const g = new Group();
  const mOpaque = new MeshLambertMaterial({ map: atlas, vertexColors: true });
  const mCut = new MeshLambertMaterial({ map: atlas, vertexColors: true, alphaTest: 0.5, side: DoubleSide });
  const buckets = new Map<string, Plant[]>();
  for (const p of plants) { const k = `${Math.floor((p.x - X0) / 16)},${Math.floor((p.z - Z0) / 16)}`; (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(p); }
  const chunks: World['chunks'] = [];
  const list: [number, number][] = []; for (let cz = Z0; cz < Z1; cz += 16) for (let cx = X0; cx < X1; cx += 16) list.push([cx, cz]);
  let t0 = performance.now();
  for (let i = 0; i < list.length; i++) {
    const [cx, cz] = list[i]; const o = new Buf(), c = new Buf();
    meshChunk(o, c, cx, cz, buckets.get(`${(cx - X0) / 16},${(cz - Z0) / 16}`) ?? []);
    const cg = new Group(); if (o.i.length) cg.add(new Mesh(o.geo(), mOpaque)); if (c.i.length) cg.add(new Mesh(c.geo(), mCut));
    g.add(cg); chunks.push({ mesh: cg, x: cx + 8, z: cz + 8 });
    if (performance.now() - t0 > 24) { onP(0.15 + 0.85 * (i + 1) / list.length); await new Promise(r => setTimeout(r, 0)); t0 = performance.now(); }
  }
  onP(1);
  return { group: g, chunks, cull(x: number, z: number) { for (const ch of chunks) ch.mesh.visible = Math.abs(ch.x - x) < 44 && Math.abs(ch.z - z) < 44; } };
}
