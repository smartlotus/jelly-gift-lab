// Shared pixel helpers for /sea/: rect/disc/ring primitives, colour mixing, deterministic hashes, and npcFish() — the
// film characters as fish, generated from simple shapes into string art (outlined like the meadow sprites), cached.
import { anim, outline, type Anim, type Palette } from '../../shared/pixel/sprite';

export const R = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
export const disc = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, c: string) => { g.fillStyle = c; for (let y = -r; y <= r; y++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1); } };
export const ring = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, c: string, t: number, n = 28) => { g.fillStyle = c; for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + t; if ((i + Math.floor(t * 8)) % 3 === 0) continue; g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 2, 2); } };
export const hash = (i: number) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const hx = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c: number[]) => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const MC = new Map<string, string>();
/** mix two #rrggbb colours (cached) */
export const mix = (a: string, b: string, k: number) => { const key = a + b + k.toFixed(3); let v = MC.get(key); if (!v) { const A = hx(a), B = hx(b); v = toHex(A.map((x, i) => x + (B[i] - x) * k)); MC.set(key, v); } return v; };
export const shade = (a: string, k: number) => k < 0 ? mix(a, '#000000', -k) : mix(a, '#ffffff', k);

/** a tiny crowd fish (7x5) facing left (dir -1) or right (1) */
export function fish(g: CanvasRenderingContext2D, x: number, y: number, body: string, dir = -1, eye = '#2E2A2B', ears?: string) {
  x = Math.round(x); y = Math.round(y);
  const px = (dx: number, dy: number, c: string) => R(g, dir > 0 ? x + dx : x + 6 - dx, y + dy, 1, 1, c);
  for (const [dx, dy, w] of [[1, 1, 4], [0, 2, 5], [1, 3, 4]] as const) for (let i = 0; i < w; i++) px(dx + i, dy, body);
  px(5, 1, body); px(6, 0, body); px(6, 2, body); px(6, 4, body); px(5, 3, body);
  px(1, 2, eye);
  if (ears) { px(1, 0, ears); px(3, 0, ears); }
}

// ---------- character fish ----------
export type Put = (x: number, y: number, c: string) => void;
export interface FishSpec { w: number; h: number; body: string; belly?: string; fin?: string; eye?: 'closed' | 'open' | 'none'; blush?: boolean; acc?: (put: Put, f: { w: number; h: number; cx: number; cy: number; hx: number }) => void; post?: (put: Put, f: { w: number; h: number; cx: number; cy: number; hx: number }) => void }
const CACHE = new Map<string, Anim>();
/** a character fish facing RIGHT: oval body, forked tail, a fin, sleepy eye + blush, plus accessories. 2 frames (tail). */
export function npcFish(key: string, s: FishSpec): Anim {
  let a = CACHE.get(key); if (a) return a;
  const pal: Palette = { k: '#2E2A2B', a: s.body, b: s.belly ?? s.body, f: s.fin ?? shadeHex(s.body), p: '#F7A3B6' };
  const extra: Record<string, string> = {}; let nextCh = 0x41; // 'A'.. for accessory colours
  const chOf = (c: string) => { if (c in pal && c.length === 1) return c; for (const [k, v] of Object.entries(extra)) if (v === c) return k; const k = String.fromCharCode(nextCh++); if (k === 'k' || k === 'a' || k === 'b' || k === 'f' || k === 'p') return chOf(c); extra[k] = c; return k; };
  const frames = [0, 1].map(fr => {
    const pad = 6, W = s.w + 8 + pad * 2, H = s.h + pad * 2 + 4, cx = pad + 6 + s.w / 2, cy = pad + 2 + s.h / 2, hx2 = cx + s.w / 2;
    const g = Array.from({ length: H }, () => Array<string>(W).fill('.'));
    const put: Put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c.length === 1 ? c : chOf(c); };
    const rx = s.w / 2, ry = s.h / 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry; if (u * u + v * v <= 1) put(x, y, v > 0.25 ? 'b' : 'a'); }
    const tx = cx - rx, tw = Math.max(3, Math.round(s.h * 0.45)), dy = fr ? 1 : -1; // forked tail
    for (let i = 0; i < 5; i++) for (let j = 0; j <= i * tw / 5; j++) { put(tx - i, cy - j + (i > 2 ? dy : 0), 'f'); put(tx - i, cy + j + (i > 2 ? dy : 0), 'f'); }
    for (let i = 0; i < 3; i++) put(cx - 1 + i, cy + 1 + i + (fr ? 0 : 1), 'f'); // side fin
    const ex = hx2 - Math.max(2, Math.round(s.w * 0.22)), ey = cy - Math.round(ry * 0.25);
    if ((s.eye ?? 'closed') === 'closed') { put(ex - 1, ey, 'k'); put(ex, ey + 1, 'k'); put(ex + 1, ey, 'k'); } else if (s.eye === 'open') { put(ex, ey, 'k'); put(ex, ey + 1, 'k'); }
    if (s.blush !== false) put(ex - 1, ey + 3, 'p');
    s.acc?.(put, { w: W, h: H, cx, cy, hx: hx2 });
    let rows = outline(g.map(r => r.join('')));
    if (s.post) { const g2 = rows.map(r => [...r]); const put2: Put = (x, y, c) => { x = Math.round(x) + 1; y = Math.round(y) + 1; if (y >= 0 && y < g2.length && x >= 0 && x < g2[0].length) g2[y][x] = c.length === 1 ? c : chOf(c); }; s.post(put2, { w: W, h: H, cx, cy, hx: hx2 }); rows = g2.map(r => r.join('')); }
    return rows;
  });
  a = anim(frames, { ...pal, ...extra }, 3); CACHE.set(key, a); return a;
}
function shadeHex(c: string) { return c.startsWith('#') && c.length === 7 ? shade(c, -0.18) : c; }
export const tri = (put: Put, a: number[], b: number[], c: number[], ch: string, x0 = 0, x1 = 80, y0 = 0, y1 = 60) => {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const s = (p: number[], q: number[]) => (x + .5 - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y + .5 - q[1]);
    const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a); if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) put(x, y, ch);
  }
};
export const rect = (put: Put, x: number, y: number, w: number, h: number, c: string) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
