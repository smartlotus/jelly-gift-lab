// The nine film homages. Each scene is a stretch of sea L px wide (logical); it paints its own water, props (behind and in
// front of the shark) and dresses the shark. Everything is original pixel drawing in shapes and colours that *suggest*
// the film's iconic image — no logos, stills, posters or likenesses. Coordinates: screen space, x0 = screen x where the
// scene starts, p = shark progress through the scene (0..1), (sx, sy) = shark frame top-left.
import { SW, SH, AT } from './shark';

export interface Ctx { g: CanvasRenderingContext2D; t: number; w: number; h: number; x0: number; L: number; p: number; sx: number; sy: number; floor: number; seed: number }
export type Wipe = 'iris' | 'blinds' | 'portal' | 'train' | 'glitch' | 'slash' | 'shards' | 'heart' | 'dither';
export interface Scene { id: string; zh: string; en: string; year: number; top: string; bot: string; sand: string; wipe: Wipe; wipeCol: string; back(c: Ctx): void; front?(c: Ctx): void; dress(c: Ctx): void }
export const L = 340;

// ---------- tiny pixel helpers ----------
export const R = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const disc = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, c: string) => { g.fillStyle = c; for (let y = -r; y <= r; y++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1); } };
const ring = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, c: string, t: number, n = 28) => { g.fillStyle = c; for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + t; if ((i + Math.floor(t * 8)) % 3 === 0) continue; g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 2, 2); } };
const hash = (i: number) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
/** a small fish (7x5) facing left (dir -1) or right (1) */
export function fish(g: CanvasRenderingContext2D, x: number, y: number, body: string, dir = -1, eye = '#2E2A2B', ears?: string) {
  x = Math.round(x); y = Math.round(y);
  const px = (dx: number, dy: number, c: string) => R(g, dir > 0 ? x + dx : x + 6 - dx, y + dy, 1, 1, c);
  for (const [dx, dy, w] of [[1, 1, 4], [0, 2, 5], [1, 3, 4]] as const) for (let i = 0; i < w; i++) px(dx + i, dy, body);
  px(5, 1, body); px(6, 0, body); px(6, 2, body); px(6, 4, body); px(5, 3, body); // tail
  px(1, 2, eye);
  if (ears) { px(1, 0, ears); px(3, 0, ears); }
}
const parallax = (c: Ctx, k: number) => c.x0 * k;

// ---------- the scenes, in order (playful → action → tender) ----------
export const SCENES: Scene[] = [
  { // 1 · The Cat Returns — golden-hour sea; the Cat Kingdom's towers far off; a parade of cat-eared fish; the shark is the Baron
    id: 'cat', zh: '猫的报恩', en: 'The Cat Returns', year: 2002, top: '#3b3560', bot: '#c98a62', sand: '#e3b27a', wipe: 'iris', wipeCol: '#f3d9a0',
    back(c) {
      const { g, h, floor } = c, bx = parallax(c, 0.45) + 80;
      for (const [dx, tw, th] of [[0, 14, 46], [18, 10, 30], [30, 18, 62], [52, 10, 34], [64, 14, 44]]) { // castle silhouette
        const x = bx + dx, top = floor - th; R(g, x, top, tw, th, '#6e4b5e'); for (let i = 0; i < tw / 2; i++) R(g, x + tw / 2 - i - 1, top - (tw / 2 - i), 2 * i + 2 - (i % 1), 1, '#6e4b5e');
        R(g, x + tw / 2 - 1, top + 6, 2, 3, '#f6d27a');
      }
      R(g, bx - 10, floor - 8, 100, 8, '#6e4b5e');
      disc(g, bx + 150 - c.x0 * 0.05, h * 0.18, 9, '#f8dca0'); // low sun through the water
      for (let i = 0; i < 9; i++) { const fx = c.x0 + 40 + i * 30 + ((c.t * 14) % 30), fy = floor - 22 - Math.sin(c.t * 2 + i) * 2 - (i % 2) * 6; fish(g, fx, fy, i % 3 ? '#f3a65a' : '#f7efe3', 1, '#2E2A2B', i % 3 ? '#f3a65a' : '#f7efe3'); }
      // tiny crown carried by the parade
      const cx = c.x0 + 40 + 4 * 30 + ((c.t * 14) % 30); R(g, cx, c.floor - 31, 7, 2, '#ffd45c'); R(g, cx, c.floor - 33, 1, 2, '#ffd45c'); R(g, cx + 3, c.floor - 34, 1, 3, '#ffd45c'); R(g, cx + 6, c.floor - 33, 1, 2, '#ffd45c');
    },
    dress({ g, sx, sy, t }) { // top hat, bow tie, cane
      const x = sx + AT.headTop.x - 2, y = sy + AT.headTop.y - 7; R(g, x - 1, y + 6, 8, 1, '#2E2A2B'); R(g, x + 1, y, 4, 6, '#2E2A2B'); R(g, x + 1, y + 4, 4, 1, '#b8434e');
      R(g, sx + 22, sy + 11, 2, 3, '#b8434e'); R(g, sx + 24, sy + 12, 1, 1, '#7e2a33'); R(g, sx + 25, sy + 11, 2, 3, '#b8434e');
      const sw = Math.round(Math.sin(t * 3)); R(g, sx + 17 + sw, sy + 15, 1, 7, '#3a2b25'); R(g, sx + 16 + sw, sy + 21, 3, 1, '#d8b25a');
    },
  },
  { // 2 · Once a Thief — a castle gallery at night: gilt frames, a chandelier, red laser lines; the shark in black tie slips
    //     through with a glass of red wine that bends the beams (the wine-glass-through-the-lasers moment), waltzing
    id: 'thief', zh: '纵横四海', en: 'Once a Thief', year: 1991, top: '#1d1426', bot: '#3a1d2a', sand: '#4a2e33', wipe: 'blinds', wipeCol: '#2a1a24',
    back(c) {
      const { g, h, floor } = c, bx = parallax(c, 0.7);
      R(g, bx, h * 0.12, c.L * 1.3, 2, '#4b3341');
      for (let i = 0; i < 4; i++) { const x = bx + 30 + i * 90, y = h * 0.22; R(g, x, y, 34, 26, '#c9a24f'); R(g, x + 2, y + 2, 30, 22, '#2f4a5c'); R(g, x + 2, y + 16, 30, 8, '#5d7a4a'); disc(g, x + 22, y + 9, 3, '#e8c87a'); }
      const cx = c.x0 + c.L * 0.5, cy = h * 0.1; R(g, cx, 0, 1, cy, '#c9a24f'); for (let i = -2; i <= 2; i++) { R(g, cx + i * 6, cy + 4 - Math.abs(i), 1, 4, '#f4e2a8'); R(g, cx + i * 6, cy + 8 - Math.abs(i), 1, 1, (Math.floor(c.t * 3) + i) % 2 ? '#fff6d8' : '#c9a24f'); } R(g, cx - 13, cy + 4, 27, 1, '#c9a24f');
      // lasers: diagonal red lines; near the shark they kink around the glass
      for (let k = 0; k < 6; k++) {
        const x1 = c.x0 + 60 + k * 44, on = Math.sin(c.t * 1.4 + k) > -0.6; if (!on) continue;
        for (let y = h * 0.15; y < floor; y += 1) { const x = x1 + (y - h * 0.15) * 0.45; const dx = x - (c.sx + 16), dy = y - (c.sy + 10); const near = dx * dx + dy * dy < 200; R(g, near ? x + 6 : x, y, 1, 1, near ? '#ff8b8b' : '#e0303e'); }
      }
      R(g, c.x0, floor - 2, c.L, 2, '#6b3a3f');
    },
    dress({ g, sx, sy, t }) {
      R(g, sx + 8, sy + 7, 14, 6, '#1c1a22'); R(g, sx + 18, sy + 9, 3, 3, '#f2f0ea'); R(g, sx + 19, sy + 9, 1, 1, '#1c1a22'); // tux + shirt
      const gy = sy + 13 + Math.round(Math.sin(t * 2) * 1); R(g, sx + 18, gy, 4, 3, '#a8182a'); R(g, sx + 18, gy - 1, 4, 1, '#e8eef4'); R(g, sx + 19, gy + 3, 2, 2, '#e8eef4'); R(g, sx + 18, gy + 5, 4, 1, '#e8eef4'); // wine glass
    },
  },
  { // 3 · Avengers: Endgame — portals open one after another in sparks; silhouettes pour through; the shark wears a gilded
    //     gauntlet, and at the middle of the scene it snaps: a white flash, then everything drifts into dust
    id: 'endgame', zh: '复仇者联盟4', en: 'Avengers: Endgame', year: 2019, top: '#141a3a', bot: '#3c2a4a', sand: '#5a4a5a', wipe: 'portal', wipeCol: '#ff9a3c',
    back(c) {
      const { g, h, floor } = c, snap = c.p > 0.55;
      for (let i = 0; i < 5; i++) {
        const open = Math.max(0, Math.min(1, (c.p - i * 0.08) * 4)), x = c.x0 + 40 + i * 62, y = h * (0.28 + (i % 2) * 0.18), r = 4 + 12 * open;
        if (open <= 0) continue;
        if (!snap) { disc(g, x, y, Math.max(1, r - 3), '#2a1c44'); ring(g, x, y, r, '#ff9a3c', c.t * 3 + i); ring(g, x, y, r - 1, '#ffd27a', -c.t * 2 + i, 20); for (let j = 0; j < 3; j++) fish(g, x - 6 - j * 9 + ((c.t * 18) % 9), y - 2 + (j - 1) * 5, '#1a1424', -1, '#1a1424'); }
        else for (let j = 0; j < 10; j++) { const a = hash(i * 31 + j), dt = (c.p - 0.55) * 60; R(g, x + (a - 0.5) * 20 + dt * (0.5 + a), y + (hash(j) - 0.5) * 12 - dt * a * 0.6, 1, 1, j % 2 ? '#8a6a9a' : '#c7a4d8'); }
      }
      R(g, c.x0, floor - 1, c.L, 1, '#6a5a7a');
    },
    front(c) { const k = c.p > 0.55 ? Math.max(0, 1 - (c.p - 0.55) * 10) : 0; if (k > 0) { c.g.globalAlpha = k * 0.85; R(c.g, 0, 0, c.w, c.h, '#fffaf0'); c.g.globalAlpha = 1; } },
    dress({ g, sx, sy, p }) {
      const x = sx + AT.fin.x - 1, y = sy + AT.fin.y; R(g, x, y, 5, 4, '#d8a640'); R(g, x + 1, y + 1, 1, 1, '#4d7bd9'); R(g, x + 3, y + 1, 1, 1, '#d9434e'); R(g, x + 2, y + 2, 1, 1, '#47b36b'); R(g, x + 1, y + 3, 1, 1, '#a35ad9'); R(g, x + 3, y + 3, 1, 1, '#f1c232');
      if (p > 0.52 && p < 0.58) { R(g, x - 2, y - 2, 1, 1, '#fffaf0'); R(g, x + 6, y - 1, 1, 1, '#fffaf0'); R(g, x + 2, y - 3, 1, 1, '#fffaf0'); }
    },
  },
  { // 4 · Train to Busan — a fast train races along the seabed; the shark rides its roof (fin taped, like his arm) while a
    //     grey-green horde of zombie fish pours after it
    id: 'busan', zh: '釜山行', en: 'Train to Busan', year: 2016, top: '#1c2a2e', bot: '#3d4a44', sand: '#55584c', wipe: 'train', wipeCol: '#e9ecea',
    back(c) {
      const { g, floor } = c, ty = floor - 26, tx = c.x0 - 40 + c.p * 60;
      for (let i = 0; i < c.L / 6; i++) R(g, c.x0 + i * 6 - ((c.t * 90) % 6), floor - 3, 4, 1, '#7a7a6a'); // rails rushing
      for (let k = 0; k < 5; k++) { const x = tx + k * 74; R(g, x, ty, 70, 20, '#e9ecea'); R(g, x, ty + 13, 70, 2, '#3c6fb0'); for (let j = 0; j < 6; j++) R(g, x + 5 + j * 11, ty + 4, 7, 6, '#2b3a44'); R(g, x + 4, ty + 20, 6, 3, '#2E2A2B'); R(g, x + 60, ty + 20, 6, 3, '#2E2A2B'); }
      // the horde, from the left, gaining and falling back
      for (let i = 0; i < 34; i++) { const a = hash(i), x = c.sx - 30 - a * 90 + Math.sin(c.t * 3 + i) * 4, y = c.floor - 30 - hash(i + 9) * 70; fish(g, x, y, a > 0.5 ? '#7d8f74' : '#6b7a66', 1, '#f2f0ea'); }
    },
    dress({ g, sx, sy }) { R(g, sx + 14, sy + 15, 3, 1, '#f2f0ea'); R(g, sx + 15, sy + 16, 3, 1, '#f2f0ea'); R(g, sx + 16, sy + 17, 2, 1, '#d9d4c8'); },
  },
  { // 5 · Resident Evil (2026, the night of the outbreak) — a city skyline at night, red warning light, umbrella-shaped
    //     red-and-white jellyfish; the shark is the medical courier, cap on, the package strapped to its back
    id: 'raccoon', zh: '生化危机：爆发夜', en: 'Resident Evil', year: 2026, top: '#0b0d16', bot: '#22161e', sand: '#2c2228', wipe: 'glitch', wipeCol: '#c4212e',
    back(c) {
      const { g, h, floor, t } = c, bx = parallax(c, 0.5);
      for (let i = 0; i < 14; i++) { const bw = 12 + hash(i) * 16, bh = 30 + hash(i + 3) * 70, x = bx + i * 26; R(g, x, floor - bh, bw, bh, '#171822'); for (let j = 0; j < 6; j++) if (hash(i * 7 + j) > 0.6) R(g, x + 2 + (j % 3) * 4, floor - bh + 4 + Math.floor(j / 3) * 8, 2, 2, '#e9c46a'); }
      const pulse = 0.5 + 0.5 * Math.sin(t * 4); g.globalAlpha = 0.18 * pulse; R(g, 0, 0, c.w, h, '#d42a36'); g.globalAlpha = 1;
      for (let i = 0; i < 6; i++) { // umbrella jellyfish: 8 alternating segments, trailing threads
        const x = c.x0 + 30 + i * 52, y = h * (0.25 + hash(i) * 0.35) + Math.sin(t * 1.5 + i) * 4;
        for (let s = 0; s < 8; s++) { const col = s % 2 ? '#f2eeee' : '#c4212e'; for (let r = 0; r < 7; r++) R(g, x - 7 + s * 2 - Math.floor((7 - r) * (s - 3.5) / 7), y - 7 + r, 2, 1, col); }
        R(g, x - 8, y, 17, 1, '#f2eeee'); for (let k = 0; k < 4; k++) for (let j = 0; j < 6; j++) R(g, x - 6 + k * 4 + Math.round(Math.sin(t * 3 + j + k)), y + 2 + j * 2, 1, 1, '#d9b8bc');
      }
    },
    dress({ g, sx, sy }) { const x = sx + AT.headTop.x - 2, y = sy + AT.headTop.y - 3; R(g, x, y, 6, 3, '#c4212e'); R(g, x + 5, y + 2, 3, 1, '#c4212e'); R(g, sx + 9, sy + 3, 7, 5, '#d8cfc0'); R(g, sx + 9, sy + 5, 7, 1, '#8a7a6a'); R(g, sx + 12, sy + 3, 1, 5, '#c4212e'); },
  },
  { // 6 · Kill Bill — the blue room: paper-screen lattice, everything else in black silhouette; the shark in yellow with a
    //     black stripe and a katana; silhouette fish charge in and are split in two as they reach it
    id: 'bill', zh: '杀死比尔', en: 'Kill Bill', year: 2003, top: '#1d4fb8', bot: '#163a8a', sand: '#0f2350', wipe: 'slash', wipeCol: '#f2c230',
    back(c) {
      const { g, h, floor } = c, bx = parallax(c, 0.6);
      for (let x = 0; x < c.L * 1.4; x += 22) R(g, bx + x, h * 0.1, 1, floor - h * 0.1, '#2f63cc');
      for (let y = h * 0.1; y < floor; y += 18) R(g, bx, y, c.L * 1.4, 1, '#2f63cc');
      R(g, c.x0, floor - 6, c.L, 6, '#0b1220');
    },
    front(c) {
      const { g } = c;
      for (let i = 0; i < 10; i++) { // charge from the right; cut when they reach the shark
        const x0 = c.x0 + 60 + i * 30, y = c.sy + 4 + ((i * 7) % 14) - 4, x = x0 - ((c.t * 30 + i * 17) % 60), cut = x < c.sx + 34 && x > c.sx - 10;
        if (!cut) fish(g, x, y, '#0b1220', -1, '#0b1220');
        else { const d = c.sx + 34 - x; fish(g, x, y - d * 0.3, '#0b1220', -1, '#0b1220'); g.globalAlpha = Math.max(0, 1 - d / 40); fish(g, x + 2, y + 2 + d * 0.3, '#0b1220', -1, '#0b1220'); g.globalAlpha = 1; R(g, c.sx + 30, c.sy + 8, 6, 1, '#fffbe8'); }
      }
    },
    dress({ g, sx, sy }) { const b = AT.body; R(g, sx + b.x + 1, sy + b.y + 1, b.w - 2, 4, '#f2c230'); R(g, sx + b.x + 1, sy + b.y + 3, b.w - 2, 1, '#1a1a1a'); R(g, sx + 12, sy + 1, 14, 1, '#d9dde2'); R(g, sx + 10, sy + 1, 3, 1, '#1a1a1a'); },
  },
  { // 7 · Mad Detective — a corridor of mirrors; behind the shark swim the seven selves he sees, each a different colour;
    //     the mirrors crack as it passes
    id: 'mad', zh: '神探', en: 'Mad Detective', year: 2007, top: '#0e2224', bot: '#1d3a36', sand: '#26413a', wipe: 'shards', wipeCol: '#cfe3df',
    back(c) {
      const { g, h, floor } = c;
      for (let i = 0; i < 6; i++) { const x = c.x0 + 20 + i * 56, y = h * 0.16, mh = floor - y - 10; R(g, x, y, 30, mh, '#8fa9a3'); R(g, x + 2, y + 2, 26, mh - 4, '#2c4a46'); R(g, x + 4, y + 4, 3, mh - 8, '#3f625c');
        if (c.sx > x + 10) { const cx = x + 15, cy = y + mh * 0.45; for (let k = 0; k < 5; k++) { const a = k * 1.3 + i; for (let r = 0; r < 12; r++) R(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, 1, '#cfe3df'); } } }
    },
    dress() {},
  },
  { // 8 · The Drama (2026) — a wedding the night before everything goes sideways: string lights, a flower arch, a
    //     champagne tower and a tall cake that topples into bubbles as the shark arrives (bow tie, a little veil)
    id: 'drama', zh: '爱情抓马', en: 'The Drama', year: 2026, top: '#5a3d58', bot: '#e8b8b4', sand: '#f2d3c4', wipe: 'heart', wipeCol: '#fbe3e6',
    back(c) {
      const { g, h, floor, t } = c;
      for (let x = 0; x < c.L; x += 4) { const y = h * 0.14 + Math.sin(x / c.L * 3.14 * 2) * 8; R(g, c.x0 + x, y, 1, 1, '#7a5a6a'); if (x % 12 === 0) R(g, c.x0 + x, y + 2, 2, 2, (x / 12 + Math.floor(t * 2)) % 3 ? '#ffe7a8' : '#fff7e0'); }
      const ax = c.x0 + 70; for (let a = 0; a <= 32; a++) { const ang = Math.PI * a / 32, x = ax + 22 - Math.cos(ang) * 22, y = floor - 48 - Math.sin(ang) * 22; R(g, x, y, 3, 3, a % 3 ? '#f4b6c2' : '#fffaf4'); } R(g, ax, floor - 48, 3, 48, '#f4b6c2'); R(g, ax + 43, floor - 48, 3, 48, '#f4b6c2');
      const tx = c.x0 + 170; for (let r = 0; r < 5; r++) for (let k = 0; k <= r; k++) { const x = tx - r * 4 + k * 8, y = floor - 40 + r * 8; R(g, x, y, 5, 4, '#f6e7b8'); R(g, x + 2, y + 4, 1, 3, '#fffaf0'); }
      const cx = c.x0 + 260, fall = Math.max(0, Math.min(1, (c.sx + 30 - cx) / 30));
      if (fall < 1) for (let r = 0; r < 4; r++) { const w = 34 - r * 8, y = floor - 10 - (r + 1) * 10; g.globalAlpha = 1 - fall; R(g, cx - w / 2 + fall * r * 10, y + fall * r * 6, w, 10, r % 2 ? '#fffaf4' : '#f8dbe0'); g.globalAlpha = 1; }
      if (fall > 0) for (let i = 0; i < 24; i++) { const a = hash(i); disc(g, cx + (a - 0.5) * 40, floor - 20 - fall * 60 * hash(i + 5) - ((t * 20 * (0.5 + a)) % 40), 1, '#fffaf4'); }
    },
    dress({ g, sx, sy, t }) { R(g, sx + 22, sy + 11, 2, 3, '#2E2A2B'); R(g, sx + 25, sy + 11, 2, 3, '#2E2A2B'); R(g, sx + 24, sy + 12, 1, 1, '#2E2A2B'); g.globalAlpha = 0.75; const x = sx + AT.headTop.x - 1, y = sy + AT.headTop.y - 2; for (let i = 0; i < 8; i++) R(g, x - i - Math.round(Math.sin(t * 2 + i * 0.5)), y + i, 2 + Math.floor(i / 2), 1, '#fffaf4'); g.globalAlpha = 1; R(g, x + 1, y - 1, 2, 2, '#f4b6c2'); },
  },
  { // 9 · Still Life — the quiet one: grey-blue water, marine snow, old photographs drifting; the shark, in a plain dark
    //     tie, slows down and swims alone… and one by one small fish come and follow it
    id: 'still', zh: '寂静人生', en: 'Still Life', year: 2013, top: '#1a2430', bot: '#4a5866', sand: '#5d6874', wipe: 'dither', wipeCol: '#9aa6b2',
    back(c) {
      const { g, h, floor, t } = c;
      for (let i = 0; i < 60; i++) R(g, ((hash(i) * c.w * 1.3 + c.x0 * 0.3) % c.w + c.w) % c.w, (hash(i + 40) * h + t * (3 + hash(i) * 4)) % floor, 1, 1, '#c9d2da');
      for (let i = 0; i < 5; i++) { const x = c.x0 + 40 + i * 64, y = h * (0.25 + hash(i * 3) * 0.4) + Math.sin(t * 0.6 + i) * 3; R(g, x, y, 14, 12, '#e9e6dc'); R(g, x + 2, y + 2, 10, 7, '#8b949c'); disc(g, x + 7, y + 5, 2, '#b5bcc2'); }
    },
    dress({ g, sx, sy }) { R(g, sx + 22, sy + 11, 2, 2, '#2b3440'); R(g, sx + 22, sy + 13, 1, 4, '#2b3440'); R(g, sx + 23, sy + 13, 1, 3, '#3d4856'); },
  },
];
export { SW, SH };
