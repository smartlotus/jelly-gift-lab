// Procedural 16×16 block textures (fixed seed -> identical every load). Minecraft-STYLE homage, no Mojang assets.
// One atlas canvas (8 cols × 4 rows of 16 px), NearestFilter, no mipmaps.
import { CanvasTexture, NearestFilter, SRGBColorSpace, type Texture } from 'three';

export const T = {
  grassTop: 0, grassSide: 1, dirt: 2, stone: 3, cobble: 4, path: 5, oakSide: 6, oakTop: 7,
  birchSide: 8, leaves: 9, tallGrass: 10, flower: 11, mushroom: 12, pig: 13, planks: 14, bars: 15,
  darkLeaves: 16, mossy: 17, pigFace: 18, snout: 19, fur: 20, paw: 21, torch: 22, flame: 23, sign: 24, bluebell: 25,
} as const;
export const COLS = 8, ROWS = 4, TS = 16;

export function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
type Px = (x: number, y: number, r: () => number) => string | null;
const pick = (r: () => number, arr: string[]) => arr[Math.floor(r() * arr.length) % arr.length];

const GRASS = ['#3f6b4a', '#47774f', '#365f43', '#4f8256', '#3a6446'];
const DIRT = ['#6e4d36', '#7a573c', '#614330', '#85613f', '#5a3e2c'];
const STONE = ['#6f7378', '#7a7e83', '#666a6f', '#82868a', '#5e6266'];
const LEAF = ['#2f5a3a', '#376642', '#284f33', '#3e7049', '#22462d'];
const PIG = ['#f6b9c6', '#f9c6cf', '#f2aebd', '#f9c6cf', '#fbd1d9'];

const tiles: Record<number, Px> = {
  [T.grassTop]: (_x, _y, r) => pick(r, GRASS),
  [T.grassSide]: (x, y, r) => { const edge = 3 + ((x * 7 + 3) % 3 === 0 ? 1 : 0) + (x % 5 === 2 ? 1 : 0); return y < edge ? pick(r, GRASS) : pick(r, DIRT); },
  [T.dirt]: (_x, _y, r) => pick(r, DIRT),
  [T.stone]: (_x, _y, r) => (r() < 0.08 ? '#55595d' : pick(r, STONE)),
  [T.cobble]: (x, y, r) => { const cell = ((x >> 2) + (y >> 2) * 3 + ((y >> 2) & 1) * 2) % 4; const border = x % 4 === 0 || y % 4 === 0; return border ? (r() < .5 ? '#4b4e52' : '#55585c') : ['#80848a', '#74787d', '#8b8f94', '#6c7075'][cell]; },
  [T.path]: (_x, _y, r) => { const v = r(); return v < .18 ? '#8a8378' : v < .4 ? '#6f685e' : v < .7 ? '#7c7468' : v < .85 ? '#5f5850' : '#968e82'; },
  [T.oakSide]: (x, _y, r) => { const s = (x * 5 + 1) % 4 === 0 ? '#3e2c1c' : x % 3 === 0 ? '#5a4128' : '#4c3722'; return r() < .1 ? '#33241a' : s; },
  [T.oakTop]: (x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); return d > 6.5 ? '#4c3722' : (Math.floor(d) % 2 ? '#a07c52' : '#8c6a44'); },
  [T.birchSide]: (x, y, r) => { const mark = ((y * 3 + (x > 7 ? 5 : 0)) % 7 === 0 && x % 8 > 1 && x % 8 < 6) || r() < .03; return mark ? '#2f2f2c' : pick(r, ['#d9d6cc', '#cfccc1', '#e2dfd5']); },
  [T.leaves]: (_x, _y, r) => (r() < .22 ? null : pick(r, LEAF)),
  [T.darkLeaves]: (_x, _y, r) => (r() < .2 ? null : pick(r, ['#1f3d2c', '#244634', '#1a3426', '#2b5039'])),
  [T.tallGrass]: (x, y, r) => { const blade = [2, 4, 7, 9, 11, 13][Math.floor(r() * 6)]; const h = [9, 12, 7, 13, 10, 8, 11, 6, 12, 10, 9, 13, 7, 11, 8, 10][x]; return (x % 2 === 1 || blade === x) && 15 - y < h ? pick(r, ['#4f8a58', '#5b9a63', '#447c4d']) : null; },
  [T.flower]: (x, y) => { if (x >= 7 && x <= 8 && y >= 8) return '#3e7a46'; if ((x === 5 || x === 10) && y === 11) return '#3e7a46'; const d = Math.hypot(x - 7.5, y - 5.5); return d < 1.2 ? '#ffd45c' : d < 3.2 ? (d < 2.4 ? '#ee8fa6' : '#f9c6cf') : null; },
  [T.bluebell]: (x, y) => { if (x >= 7 && x <= 8 && y >= 7) return '#3e7a46'; const d = Math.hypot(x - 7.5, y - 4.5); return d < 2.8 ? (d < 1.5 ? '#c6dcf5' : '#9cc8ee') : null; },
  [T.mushroom]: (x, y, r) => { if (y >= 9 && x >= 6 && x <= 9) return y > 13 && r() < .3 ? '#d8cfbf' : '#efe6d6'; const cap = y >= 3 && y <= 8 && Math.abs(x - 7.5) <= (y === 3 ? 3.5 : 6.5 - (y === 4 ? 1 : 0)); if (!cap) return null; const dot = (x === 5 && y === 5) || (x === 10 && y === 4) || (x === 8 && y === 7) || (x === 3 && y === 7); return dot ? '#fff4e4' : y === 8 ? '#b8323f' : '#e0414f'; },
  [T.pig]: (_x, _y, r) => pick(r, PIG),
  [T.planks]: (x, y, r) => { if (y % 4 === 3) return '#5c4128'; if ((x + (y >> 2) * 5) % 8 === 0) return '#5c4128'; return r() < .15 ? '#8a6640' : pick(r, ['#9a7448', '#a37c4e', '#916c42']); },
  [T.bars]: (x, y) => (x % 4 === 1 || x % 4 === 2 ? (x % 4 === 1 ? '#5c6166' : '#3e4246') : (y === 1 || y === 14) ? '#4a4e52' : null),
  [T.mossy]: (x, y, r) => { const base = tiles[T.cobble](x, y, r)!; return r() < .32 ? pick(r, ['#4f7a4a', '#5f8b55', '#43683f']) : base; },
  [T.pigFace]: (x, y, r) => {
    // eyes are separate glowing meshes; face texture = skin + blush + brow shadow
    if (y >= 9 && y <= 10 && (x <= 3 || x >= 12) && x >= 1 && x <= 14) return '#f08aa4';
    return pick(r, PIG);
  },
  [T.snout]: (x, y, r) => { if ((x === 4 || x === 5 || x === 10 || x === 11) && y >= 6 && y <= 9) return '#8c3b52'; if (x === 0 || x === 15 || y === 0 || y === 15) return '#e07f97'; return r() < .2 ? '#f29db1' : '#ee8fa6'; },
  [T.fur]: (_x, _y, r) => pick(r, ['#fff4e4', '#f7ead8', '#fff8ee', '#efe1cd']),
  [T.paw]: (x, y, r) => { if ((x === 4 || x === 8 || x === 12) && y > 9) return '#cdb9a2'; if (y > 12 && x > 1 && x < 15 && x % 4 !== 0) return r() < .5 ? '#f4a7b9' : '#f9c6cf'; return pick(r, ['#fff4e4', '#f7ead8', '#fff8ee']); },
  [T.torch]: (x, _y, r) => (x === 0 || x === 15 ? '#3e2c1c' : r() < .2 ? '#5a4128' : '#7a5a37'),
  [T.flame]: (x, y) => { const d = Math.hypot(x - 7.5, (y - 9) * .8); return d < 3 ? '#fff6d0' : d < 5.5 ? '#ffd45c' : d < 8 ? '#ff9a3c' : '#e0612a'; },
  [T.sign]: tilesPlanks,
};
function tilesPlanks(x: number, y: number, r: () => number) { return tiles[T.planks](x, y, r); }

let atlas: Texture | null = null;
export function getAtlas(): Texture {
  if (atlas) return atlas;
  const c = document.createElement('canvas'); c.width = COLS * TS; c.height = ROWS * TS;
  const g = c.getContext('2d')!;
  for (const k in tiles) {
    const i = +k, ox = (i % COLS) * TS, oy = Math.floor(i / COLS) * TS, r = rng(1000 + i * 77);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const col = tiles[i](x, y, r); if (col) { g.fillStyle = col; g.fillRect(ox + x, oy + y, 1, 1); } }
  }
  atlas = tex(c); return atlas;
}
export function tex(c: HTMLCanvasElement): Texture {
  const t = new CanvasTexture(c); t.magFilter = NearestFilter; t.minFilter = NearestFilter; t.generateMipmaps = false; t.colorSpace = SRGBColorSpace; return t;
}
/** uv rect of tile i (inset half a texel to avoid bleeding) */
export function uvRect(i: number): [number, number, number, number] {
  const e = 0.02 / TS;
  const u0 = (i % COLS) / COLS + e, u1 = ((i % COLS) + 1) / COLS - e;
  const v1 = 1 - Math.floor(i / COLS) / ROWS - e, v0 = 1 - (Math.floor(i / COLS) + 1) / ROWS + e;
  return [u0, v0, u1, v1];
}

/** a single tile as its own texture (for box materials on the pig / paw) */
export function tileTexture(i: number): Texture {
  const c = document.createElement('canvas'); c.width = c.height = TS;
  const g = c.getContext('2d')!; const r = rng(1000 + i * 77);
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const col = tiles[i](x, y, r); if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }
  return tex(c);
}

/** wooden sign face with text (pixel-ish: drawn small, upscaled nearest) */
export function signTexture(text: string): Texture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 32;
  const g = c.getContext('2d')!; const r = rng(42);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) { g.fillStyle = tiles[T.planks](x % 16, y % 16, r)!; g.fillRect(x, y, 1, 1); }
  g.strokeStyle = '#3e2c1c'; g.lineWidth = 2; g.strokeRect(1, 1, 62, 30);
  g.fillStyle = '#1d140d'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `600 ${/[\u4e00-\u9fff]/.test(text) ? 13 : 11}px 'Noto Serif SC Sub', 'Songti SC', serif`;
  // crisp pixel lettering: draw on a scratch canvas, then threshold alpha
  const sc = document.createElement('canvas'); sc.width = 64; sc.height = 32; const s = sc.getContext('2d')!;
  s.font = g.font; s.textAlign = 'center'; s.textBaseline = 'middle'; s.fillStyle = '#000'; s.fillText(text, 32, 17, 58);
  const id = s.getImageData(0, 0, 64, 32).data; g.fillStyle = '#1d140d';
  for (let i = 0; i < 64 * 32; i++) if (id[i * 4 + 3] > 110) g.fillRect(i % 64, Math.floor(i / 64), 1, 1);
  return tex(c);
}
