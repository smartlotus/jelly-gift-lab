// The nine film homages. Each scene is a stretch of sea L px wide (logical) with its own water, set dressing (back/front),
// the shark's costume (FORM, part of its sprite) and one short BEAT with the film's characters as fish (NPCs): it starts
// when the shark swims into it (progress p ≥ beat.at), lasts a few seconds, reads without words, and never blocks —
// keep swimming and it simply plays out behind. Everything is original pixel drawing in shapes and colours that
// *suggest* each film's iconic image: no logos, stills, posters or likenesses.
// Coordinates: screen space; x0 = screen x where the scene starts; (sx, sy) = shark frame top-left; bt = seconds since
// the beat started (-1 = not yet).
import { draw, frameAt, type Anim } from '../../shared/pixel/sprite';
import { SW, SH, AT, type Form } from './shark';
import { R, disc, ring, hash, mix, shade, fish, npcFish, rect, tri } from './art';
import type { Pal } from './env';

export interface Ctx { g: CanvasRenderingContext2D; t: number; w: number; h: number; x0: number; L: number; p: number; sx: number; sy: number; floor: number; bt: number }
export interface Pose { dy?: number; slow?: number; boost?: number }
export type Wipe = 'iris' | 'blinds' | 'portal' | 'train' | 'glitch' | 'slash' | 'shards' | 'heart' | 'dither';
export interface Scene { id: string; zh: string; en: string; year: number; top: string; bot: string; sand: string; env: Omit<Pal, 'top' | 'bot' | 'sand'>; wipe: Wipe; wipeCol: string; form: Form; beat: { at: number; dur: number }; back(c: Ctx): void; front?(c: Ctx): void; pose?(c: Ctx): Pose }
export const L = 420;
export { R, fish };

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (v: number) => { v = clamp(v); return v * v * (3 - 2 * v); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const spr = (g: CanvasRenderingContext2D, a: Anim, x: number, y: number, t: number, left = false) => draw(g, frameAt(a, t), x, y, left);
const SCX = SW / 2, SCY = SH / 2;
/** little sparkle cross */
const spark = (g: CanvasRenderingContext2D, x: number, y: number, c = '#fffbe8') => { R(g, x, y - 2, 1, 5, c); R(g, x - 2, y, 5, 1, c); };
const heart = (g: CanvasRenderingContext2D, x: number, y: number, c: string) => { R(g, x, y, 2, 1, c); R(g, x + 3, y, 2, 1, c); R(g, x - 1, y + 1, 7, 2, c); R(g, x, y + 3, 5, 1, c); R(g, x + 1, y + 4, 3, 1, c); R(g, x + 2, y + 5, 1, 1, c); };

// ---------- the cast (fish versions of the characters; accessories only, no faces of actors) ----------
const ears = (put: (x: number, y: number, c: string) => void, f: { cx: number; cy: number; hx: number }, c: string, inner = '#f4b6c2') => { const y = f.cy - 6; tri(put, [f.hx - 9, y + 2], [f.hx - 8, y - 3], [f.hx - 5, y + 2], c); tri(put, [f.hx - 5, y + 2], [f.hx - 3, y - 3], [f.hx - 1, y + 2], c); put(f.hx - 8, y, inner); put(f.hx - 3, y, inner); };
const CAST = {
  baron: () => npcFish('baron', { w: 16, h: 11, body: '#d8cdbd', belly: '#f0e9dc', fin: '#b8ab98', acc: (put, f) => { ears(put, f, '#d8cdbd'); rect(put, f.hx - 3, f.cy + 2, 2, 2, '#b8434e'); rect(put, f.hx - 7, f.cy - 1, 9, 1, '#5a4a3a'); } }),
  hat: () => npcFish('hat', { w: 1, h: 1, body: 'rgba(0,0,0,0)', eye: 'none', blush: false, acc: () => {} }),
  muta: () => npcFish('muta', { w: 22, h: 15, body: '#f3ead9', belly: '#fffaf0', fin: '#e2d6bf', acc: (put, f) => ears(put, f, '#f3ead9') }),
  king: () => npcFish('king', { w: 20, h: 14, body: '#e9e4dc', belly: '#ffffff', fin: '#c9c0b0', acc: (put, f) => { ears(put, f, '#e9e4dc'); for (let x = f.cx - 9; x < f.cx + 4; x++) for (let y = f.cy - 7; y < f.cy - 2; y++) if ((x - f.cx) ** 2 / 100 + (y - f.cy) ** 2 / 49 <= 1) put(x, y, '#6a4a9a'); rect(put, f.hx - 8, f.cy - 9, 6, 2, '#e7b84a'); put(f.hx - 8, f.cy - 10, '#e7b84a'); put(f.hx - 5, f.cy - 10, '#e7b84a'); put(f.hx - 3, f.cy - 10, '#e7b84a'); } }),
  white: () => npcFish('white', { w: 16, h: 10, body: '#efece4', belly: '#ffffff', fin: '#cfc9bc', acc: (put, f) => { rect(put, f.hx - 4, f.cy + 2, 1, 2, '#1c1a22'); rect(put, f.hx - 2, f.cy + 2, 1, 2, '#1c1a22'); put(f.hx - 3, f.cy + 2, '#1c1a22'); rect(put, f.cx - 4, f.cy - 5, 9, 1, '#3a2b25'); } }),
  red: () => npcFish('red', { w: 15, h: 10, body: '#c4212e', belly: '#e0505a', fin: '#8e1822', acc: (put, f) => { for (let i = 0; i < 9; i++) put(f.cx - 2 - i, f.cy - 5 + Math.floor(i / 3), '#2a1a1a'); rect(put, f.cx - 1, f.cy - 6, 6, 2, '#2a1a1a'); put(f.hx - 1, f.cy + 2, '#f4b6c2'); } }),
  cap: () => npcFish('cap', { w: 16, h: 11, body: '#3d5a9a', belly: '#e8e8f0', fin: '#2a3f70', post: (put, f) => { const x = f.cx - 1, y = f.cy + 3; for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const d = Math.hypot(i, j); if (d <= 4.4) put(x + i, y + j, d > 3.3 ? '#c4212e' : d > 2.2 ? '#f4f4f4' : d > 1.2 ? '#2a4fa0' : '#ffffff'); } } }),
  thor: () => npcFish('thor', { w: 16, h: 11, body: '#9aa6b6', belly: '#e6eaf0', fin: '#6d7a8a', acc: (put, f) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 4 + i * 0.6; j++) put(f.cx - 6 - i, f.cy - 4 + j, '#b8333a'); rect(put, f.cx - 2, f.cy - 7, 8, 2, '#e7d27a'); }, post: (put, f) => { rect(put, f.cx + 1, f.cy + 3, 6, 4, '#8a8f99'); rect(put, f.cx + 3, f.cy + 7, 2, 4, '#5a3f2a'); } }),
  iron: () => npcFish('iron', { w: 16, h: 11, body: '#b8333a', belly: '#e7b84a', fin: '#8e2228', eye: 'none', acc: (put, f) => { rect(put, f.hx - 6, f.cy - 3, 5, 4, '#e7b84a'); rect(put, f.hx - 5, f.cy - 2, 3, 1, '#bfefff'); disc4(put, f.cx - 1, f.cy + 1, '#bfefff'); } }),
  hulk: () => npcFish('hulk', { w: 22, h: 15, body: '#5a9a4a', belly: '#7ab86a', fin: '#3f7a35', acc: (put, f) => rect(put, f.cx - 8, f.cy + 4, 16, 2, '#6a4a9a') }),
  thanos: () => npcFish('thanos', { w: 28, h: 18, body: '#7a5a9a', belly: '#9a7ab8', fin: '#5a3f78', eye: 'open', blush: false, acc: (put, f) => { for (let i = 0; i < 4; i++) rect(put, f.hx - 4 - i * 2, f.cy + 3 + (i % 2), 1, 4, '#5a3f78'); rect(put, f.cx - 4, f.cy - 9, 12, 3, '#d8a640'); } }),
  girl: () => npcFish('girl', { w: 10, h: 7, body: '#f5b5c5', belly: '#ffe0e8', fin: '#e58aa0', acc: (put, f) => rect(put, f.cx - 3, f.cy - 4, 4, 2, '#c4212e') }),
  dad: () => npcFish('dad', { w: 16, h: 11, body: '#4a5866', belly: '#e8e8e8', fin: '#34404c', acc: (put, f) => { rect(put, f.hx - 3, f.cy + 1, 1, 5, '#2b3440'); } }),
  burly: () => npcFish('burly', { w: 20, h: 14, body: '#8a6a4a', belly: '#c9a882', fin: '#6a4f36', acc: (put, f) => { for (let i = 0; i < 5; i++) rect(put, f.cx - 2 + i, f.cy + 3 + i, 1, 1, '#ece6d6'); } }),
  zombie: () => npcFish('zombie', { w: 10, h: 7, body: '#7d8f74', belly: '#9aab90', fin: '#5d6f56', eye: 'open', blush: false, acc: (put, f) => put(f.hx - 2, f.cy - 1, '#f2f0ea') }),
  survA: () => npcFish('survA', { w: 14, h: 10, body: '#d9c7a0', belly: '#f0e4c8', fin: '#b8a47a', acc: (put, f) => rect(put, f.cx - 4, f.cy - 1, 8, 2, '#3e4729') }),
  survB: () => npcFish('survB', { w: 13, h: 9, body: '#7a8fa6', belly: '#c8d4e0', fin: '#5a6f86', acc: (put, f) => rect(put, f.hx - 4, f.cy + 1, 3, 3, '#c4212e') }),
  c88: () => npcFish('c88', { w: 12, h: 8, body: '#1a1a1a', belly: '#2a2a2a', fin: '#0b0b0b', eye: 'none', blush: false, acc: (put, f) => { rect(put, f.hx - 4, f.cy - 2, 4, 4, '#e8d2b8'); rect(put, f.hx - 4, f.cy - 2, 4, 1, '#0b0b0b'); put(f.hx - 3, f.cy - 1, '#0b0b0b'); rect(put, f.cx - 1, f.cy + 1, 1, 3, '#f2f0ea'); } }),
  oren: () => npcFish('oren', { w: 17, h: 11, body: '#f4f1ea', belly: '#e6e0d4', fin: '#d0c8b8', acc: (put, f) => { rect(put, f.cx - 3, f.cy - 1, 2, 7, '#c4212e'); rect(put, f.hx - 8, f.cy - 8, 6, 3, '#1a1a1a'); put(f.hx - 4, f.cy - 9, '#c4212e'); put(f.hx - 3, f.cy - 10, '#c4212e'); } }),
  suspect: () => npcFish('suspect', { w: 16, h: 11, body: '#8a9a8a', belly: '#c8d0c4', fin: '#6a7a6a', acc: (put, f) => rect(put, f.cx - 6, f.cy - 6, 10, 1, '#4a554a') }),
  self: (c: string) => npcFish('self' + c, { w: 12, h: 8, body: c, belly: shade(c, 0.25), fin: shade(c, -0.2) }),
  bride: () => npcFish('bride', { w: 16, h: 11, body: '#f7f3ee', belly: '#ffffff', fin: '#e6ddd2', acc: (put, f) => { for (let i = 0; i < 5; i++) put(f.hx - 7 + i, f.cy - 6, i % 2 ? '#f4b6c2' : '#ffffff'); }, post: (put, f) => { for (let i = 0; i < 12; i++) for (let j = 0; j < 2 + i * 0.5; j++) put(f.hx - 6 - i, f.cy - 6 + j + i * 0.3, 'rgba(255,255,255,.7)'); } }),
  groom: () => npcFish('groom', { w: 16, h: 11, body: '#1c1a22', belly: '#f7f5f0', fin: '#0f0e12', acc: (put, f) => { rect(put, f.hx - 4, f.cy + 1, 1, 2, '#1c1a22'); rect(put, f.hx - 2, f.cy + 1, 1, 2, '#1c1a22'); } }),
  clerk: () => npcFish('clerk', { w: 15, h: 10, body: '#5d6874', belly: '#c9ced4', fin: '#46505a', acc: (put, f) => rect(put, f.hx - 3, f.cy + 1, 1, 4, '#2b3440'), post: (put, f) => { rect(put, f.cx - 1, f.cy + 3, 7, 5, '#7a5a3a'); rect(put, f.cx - 1, f.cy + 5, 7, 1, '#e9e6dc'); } }),
  lonely: () => npcFish('lonely', { w: 10, h: 7, body: '#9aa4ae', belly: '#c4cbd2', fin: '#7a848e' }),
  found: () => npcFish('found', { w: 10, h: 7, body: '#e9c46a', belly: '#f6e2a8', fin: '#c9a44a' }),
};
function disc4(put: (x: number, y: number, c: string) => void, x: number, y: number, c: string) { put(x, y, c); put(x + 1, y, c); put(x, y + 1, c); put(x + 1, y + 1, c); }
const SELF = ['#e05a5a', '#f2a33a', '#e8d04a', '#5ab86a', '#4a9ad9', '#8a6ad9', '#d96ab8'];

// ---------- the scenes, in order (playful → action → tender) ----------
export const SCENES: Scene[] = [
  { // 1 · The Cat Returns — golden hour over the Cat Kingdom: towers, lanterns, a parade carrying the Cat King; the Baron
    //     waits on the way, raises his hat and bows; the shark (cat ears, top hat, cane) bows back
    id: 'cat', zh: '猫的报恩', en: 'The Cat Returns', year: 2002, top: '#3b3560', bot: '#c98a62', sand: '#e3b27a', env: { reef: 0.7, kelp: 0.5 }, wipe: 'iris', wipeCol: '#f3d9a0', form: 'baron', beat: { at: 0.36, dur: 4.5 },
    back(c) {
      const { g, h, floor, t } = c, bx = c.x0 * 0.45 + 90;
      disc(g, bx + 210 - c.x0 * 0.05, h * 0.17, 12, '#f8dca0'); disc(g, bx + 210 - c.x0 * 0.05, h * 0.17, 8, '#fff0c8');
      const tower = (x: number, tw: number, th: number, col: string) => { const top = floor - th; R(g, x, top, tw, th, col); for (let i = 0; i < tw / 2 + 2; i++) R(g, x + tw / 2 - i - 1, top - (tw / 2 + 2 - i), 2 * i + 2, 1, col); for (let k = 0; k < th / 14; k++) R(g, x + tw / 2 - 1, top + 6 + k * 14, 2, 3, (k + Math.floor(t)) % 4 ? '#f6d27a' : '#ffe9a8'); };
      for (const [dx, tw, th] of [[0, 14, 70], [20, 10, 46], [34, 20, 96], [60, 12, 52], [76, 16, 66], [100, 10, 40]]) tower(bx + dx, tw, th, '#6e4b5e');
      R(g, bx - 14, floor - 12, 130, 12, '#6e4b5e'); for (let i = 0; i < 13; i++) R(g, bx - 12 + i * 10, floor - 15, 5, 3, '#6e4b5e');
      for (let i = 0; i < 6; i++) { const lx = c.x0 + 30 + i * 70, ly = floor - 26; R(g, lx, ly, 1, 26, '#5a3f4a'); R(g, lx - 2, ly - 4, 5, 5, '#5a3f4a'); R(g, lx - 1, ly - 3, 3, 3, Math.sin(t * 3 + i) > -0.3 ? '#ffd27a' : '#f2b25a'); }
      // the parade: cat-fish carrying the Cat King along the sand, Muta trailing
      const px = c.x0 + ((t * 12) % (c.L + 160)) - 80;
      for (let i = 0; i < 8; i++) fish(g, px - i * 13, floor - 16 - (i % 2) * 2 + Math.round(Math.sin(t * 4 + i)), i % 3 ? '#f3a65a' : '#f7efe3', 1, '#2E2A2B', i % 3 ? '#f3a65a' : '#f7efe3');
      R(g, px - 40, floor - 20, 30, 2, '#b8434e'); spr(g, CAST.king(), px - 46, floor - 46, t); spr(g, CAST.muta(), px - 120, floor - 40 + Math.round(Math.sin(t * 2) * 2), t);
      // the Baron: comes to meet the shark's height, raises the hat, bows
      const bxw = c.x0 + c.L * 0.58, by = lerp(h * 0.4, c.sy + 12, ease((c.p - 0.15) / 0.2)), bt = c.bt;
      const bow = bt < 0 ? 0 : bt < 1 ? ease(bt) : bt < 3.2 ? 1 : 1 - ease((bt - 3.2) / 0.8);
      spr(g, CAST.baron(), bxw, by + bow * 3, t, true);
      const hx = bxw + 9, hy = by + 1 - bow * 8 + bow * 3; R(g, hx - 2, hy + 6, 10, 1, '#1c1a22'); R(g, hx, hy, 6, 6, '#1c1a22'); R(g, hx, hy + 4, 6, 1, '#b8434e');
      R(g, bxw + 4, by + 14, 1, 8, '#3a2b25'); R(g, bxw + 3, by + 13, 3, 1, '#d8b25a');
      if (bt > 1.2 && bt < 3.4) for (let k = 0; k < 4; k++) { const a = (bt - 1.2) * 1.6 + k * 1.6; spark(g, (bxw + c.sx + SW) / 2 + Math.cos(a) * 14, by + Math.sin(a) * 8, k % 2 ? '#ffe9a8' : '#fffbe8'); }
    },
    pose(c) { const bt = c.bt; return bt < 0 || bt > 4.5 ? {} : { slow: 0.3, dy: bt > 1.2 && bt < 3 ? Math.sin((bt - 1.2) / 1.8 * Math.PI) * 4 : 0 }; },
  },
  { // 2 · Once a Thief — a castle gallery at night: gilt frames, chandeliers, velvet ropes, red laser lines. Two partners (white
    //     tie, red dress) join the shark (black tie, wine glass); the three weave through the lasers together and lift a painting
    id: 'thief', zh: '纵横四海', en: 'Once a Thief', year: 1991, top: '#1d1426', bot: '#3a1d2a', sand: '#4a2e33', env: { reef: 0.25, kelp: 0.15, life: 0.5 }, wipe: 'blinds', wipeCol: '#2a1a24', form: 'thief', beat: { at: 0.18, dur: 9 },
    back(c) {
      const { g, h, floor, t, bt } = c, bx = c.x0 * 0.85;
      R(g, c.x0, h * 0.1, c.L, 3, '#4b3341'); R(g, c.x0, h * 0.1 + 3, c.L, 1, '#c9a24f');
      for (let i = 0; i < 6; i++) { const x = bx + 20 + i * 74, y = h * 0.2 + (i % 2) * 14, stolen = i === 3 && bt > 4.2; R(g, x, y, 36, 28, '#c9a24f'); R(g, x + 1, y + 1, 34, 1, '#f0d890'); R(g, x + 2, y + 2, 32, 24, stolen ? '#2a1a24' : ['#2f4a5c', '#5a3a2a', '#3a4a2a'][i % 3]); if (!stolen) { R(g, x + 2, y + 17, 32, 9, ['#5d7a4a', '#a86a3a', '#6a8a5a'][i % 3]); disc(g, x + 24, y + 9, 3, '#e8c87a'); } R(g, x + 16, y + 30, 4, 2, '#c9a24f'); }
      for (const cx of [c.x0 + c.L * 0.3, c.x0 + c.L * 0.75]) { const cy = h * 0.09; R(g, cx, 0, 1, cy, '#c9a24f'); for (let i = -3; i <= 3; i++) { R(g, cx + i * 5, cy + 4 - Math.abs(i), 1, 5, '#f4e2a8'); R(g, cx + i * 5, cy + 9 - Math.abs(i), 1, 1, (Math.floor(t * 3) + i) % 2 ? '#fff6d8' : '#c9a24f'); } R(g, cx - 16, cy + 4, 33, 1, '#c9a24f'); g.globalAlpha = 0.08; disc(g, cx, cy + 8, 26, '#fff0c0'); g.globalAlpha = 1; }
      for (let i = 0; i < 8; i++) { const x = c.x0 + 10 + i * 54; R(g, x, floor - 18, 2, 18, '#c9a24f'); disc(g, x + 1, floor - 19, 2, '#e8c87a'); for (let k = 0; k < 52; k += 2) R(g, x + 2 + k, floor - 14 + Math.round(Math.sin(k / 52 * Math.PI) * 5), 2, 2, '#8e1822'); }
      // lasers sweep; they kink around the shark's wine glass
      for (let k = 0; k < 7; k++) {
        const x1 = c.x0 + 50 + k * 52 + Math.sin(t * 0.8 + k) * 10, on = Math.sin(t * 1.4 + k) > -0.6; if (!on) continue;
        for (let y = h * 0.15; y < floor; y += 1) { const x = x1 + (y - h * 0.15) * 0.4; const dx = x - (c.sx + SCX), dy = y - (c.sy + SCY); const near = dx * dx + dy * dy < 700; R(g, near ? x + 9 : x, y, 1, 1, near ? '#ff9b9b' : '#e0303e'); }
      }
      R(g, c.x0, floor - 2, c.L, 2, '#6b3a3f');
    },
    front(c) {
      const { g, t, bt, sx, sy } = c; if (bt < 0) return;
      const k = ease(bt / 1.6), out = c.p > 0.93 ? ease((c.p - 0.93) / 0.07) : 0, waltz = c.p > 0.78 ? (c.p - 0.78) * 30 : 0;
      const wx = lerp(sx - 80, sx - 22, k) + Math.cos(waltz) * (waltz ? 10 : 0), wy = sy - 10 + Math.sin(bt * 2.6) * 6 + Math.sin(waltz) * (waltz ? 8 : 0);
      const rx = lerp(sx - 90, sx - 16, k) - Math.cos(waltz) * (waltz ? 10 : 0), ry = sy + SH - 6 + Math.sin(bt * 2.6 + 2) * 6 - Math.sin(waltz) * (waltz ? 8 : 0);
      g.globalAlpha = 1 - out; spr(g, CAST.white(), wx, wy, t); spr(g, CAST.red(), rx, ry, t);
      if (bt > 4.2) { R(g, rx + 4, ry + 12, 12, 9, '#c9a24f'); R(g, rx + 5, ry + 13, 10, 7, '#2f4a5c'); R(g, rx + 5, ry + 17, 10, 3, '#5d7a4a'); }
      g.globalAlpha = 1;
    },
    pose(c) { return c.bt >= 0 && c.bt < 9 ? { dy: Math.sin(c.bt * 2.6 + 1) * 4, slow: 0.7 } : {}; },
  },
  { // 3 · Avengers: Endgame — portals open in sparks; the heroes come through and line up behind the shark (armour,
    //     gauntlet); the purple titan and his army wait ahead — the shark snaps: a white flash, and they drift away as dust
    id: 'endgame', zh: '复仇者联盟4', en: 'Avengers: Endgame', year: 2019, top: '#141a3a', bot: '#3c2a4a', sand: '#5a4a5a', env: { reef: 0.6, kelp: 0.3 }, wipe: 'portal', wipeCol: '#ff9a3c', form: 'endgame', beat: { at: 0.28, dur: 9 },
    back(c) {
      const { g, h, floor, t, bt } = c;
      for (let i = 0; i < 8; i++) { const x = c.x0 + hash(i) * c.L, ht = 10 + hash(i + 4) * 24; R(g, x, floor - ht, 10 + hash(i + 8) * 12, ht, '#2a2238'); R(g, x + 3, floor - ht - 4, 3, 4, '#2a2238'); } // ruined compound
      const portals = [[0.18, 0.22], [0.3, 0.5], [0.12, 0.62], [0.42, 0.3], [0.24, 0.78]];
      portals.forEach(([px, py], i) => {
        const open = clamp((bt - i * 0.35) / 0.8), x = c.x0 + c.L * px, y = h * py, r = 4 + 14 * open; if (bt < 0 || open <= 0) return;
        const close = bt > 3.2 ? clamp(1 - (bt - 3.2) / 1.2) : 1; if (close <= 0) return;
        disc(g, x, y, Math.max(1, (r - 3) * close), '#2a1c44'); ring(g, x, y, r * close, '#ff9a3c', t * 3 + i); ring(g, x, y, (r - 1) * close, '#ffd27a', -t * 2 + i, 20);
      });
      // titan + army ahead (dust after the snap)
      const snap = bt >= 4, dust = snap ? bt - 4 : 0, vx = c.x0 + c.L * 0.8, vy = h * 0.42;
      if (!snap) { spr(g, CAST.thanos(), vx, vy, t, true); for (let i = 0; i < 14; i++) fish(g, vx + 10 + (i % 5) * 10, vy - 30 + Math.floor(i / 5) * 40 + (i % 2) * 6 + Math.sin(t * 2 + i) * 2, '#2a2236', -1, '#c94a4a'); }
      else if (dust < 4) for (let i = 0; i < 90; i++) { const a = hash(i * 3.3), d = dust * (8 + a * 14); g.globalAlpha = clamp(1 - dust / 4); R(g, vx + hash(i) * 40 + d, vy - 30 + hash(i * 7) * 80 - d * 0.4 * a, 1, 1, i % 3 ? '#8a6a9a' : '#c7a4d8'); g.globalAlpha = 1; }
    },
    front(c) {
      const { g, t, bt, sx, sy } = c; if (bt < 0) return;
      const team = [CAST.cap(), CAST.thor(), CAST.iron(), CAST.hulk()], slots = [[-30, -24], [-40, 6], [-26, 34], [-62, -8]];
      const portals = [[0.18, 0.22], [0.3, 0.5], [0.12, 0.62], [0.42, 0.3]];
      team.forEach((a, i) => { const k = ease((bt - 0.6 - i * 0.35) / 1.4); if (k <= 0) return; const px = c.x0 + c.L * portals[i][0], py = c.h * portals[i][1]; spr(g, a, lerp(px, sx + slots[i][0], k), lerp(py, sy + slots[i][1], k) + Math.sin(t * 2 + i) * 2, t); });
      if (bt > 3.6 && bt < 4.2) { const x = sx + AT.fin.x, y = sy + AT.fin.y; for (let k = 0; k < 3; k++) spark(g, x + (k - 1) * 6, y - 4 - k * 2); }
      const fl = bt >= 4 ? clamp(1 - (bt - 4) / 0.9) : 0; if (fl > 0) { g.globalAlpha = fl * 0.85; R(g, 0, 0, c.w, c.h, '#fffaf0'); g.globalAlpha = 1; }
    },
    pose(c) { const bt = c.bt; return bt < 0 || bt > 6 ? {} : { slow: 0.35, dy: bt > 3.6 && bt < 4.2 ? -3 : 0 }; },
  },
  { // 4 · Train to Busan — a fast train races along the seabed; on its roof a father and his little girl, and a big guy with
    //     taped fists; the zombie-fish wave surges — the shark (taped fin) puts itself between the wave and the girl
    id: 'busan', zh: '釜山行', en: 'Train to Busan', year: 2016, top: '#1c2a2e', bot: '#3d4a44', sand: '#55584c', env: { reef: 0.4, kelp: 0.5 }, wipe: 'train', wipeCol: '#e9ecea', form: 'busan', beat: { at: 0.3, dur: 6 },
    back(c) {
      const { g, floor, t, h } = c, ty = floor - 30, tx = c.x0 - 60 + c.p * 80;
      for (let i = 0; i < 12; i++) { const x = ((c.x0 * 0.6 + i * 60 - t * 40) % (c.L + 60) + c.L + 60) % (c.L + 60) + c.x0 - 30; R(g, x, h * 0.3, 2, floor - h * 0.3 - 30, '#2a3a3a'); R(g, x - 8, h * 0.3, 18, 2, '#2a3a3a'); } // catenary poles rushing past
      R(g, c.x0, h * 0.3 + 3, c.L, 1, '#2a3a3a');
      for (let i = 0; i < c.L / 6; i++) R(g, c.x0 + i * 6 - ((t * 90) % 6), floor - 4, 4, 1, '#7a7a6a'); R(g, c.x0, floor - 3, c.L, 1, '#8a8a7a');
      for (let k = 0; k < 6; k++) { const x = tx + k * 78; R(g, x, ty, 74, 24, '#e9ecea'); R(g, x, ty, 74, 2, '#ffffff'); R(g, x, ty + 16, 74, 2, '#3c6fb0'); for (let j = 0; j < 6; j++) { R(g, x + 5 + j * 11, ty + 5, 8, 7, '#2b3a44'); if (hash(k * 6 + j) > 0.6) R(g, x + 6 + j * 11, ty + 7, 3, 4, '#7d8f74'); } R(g, x + 6, ty + 24, 7, 4, '#2E2A2B'); R(g, x + 60, ty + 24, 7, 4, '#2E2A2B'); }
      // dad + big guy stay on the roof; the girl runs to the shark during the beat (front)
      const bt = c.bt; spr(g, CAST.dad(), tx + 120, ty - 14 + Math.round(Math.sin(t * 6) * 0.6), t); spr(g, CAST.burly(), tx + 60, ty - 17, t);
      if (bt < 0.6) spr(g, CAST.girl(), tx + 140, ty - 10, t);
      if (bt > 4) { R(g, tx + 136 + Math.round(Math.sin(t * 8) * 2), ty - 20, 1, 4, '#f2f0ea'); } // dad waves
    },
    front(c) {
      const { g, t, bt, sx, sy } = c;
      // the horde: always behind; in the beat it surges and breaks on the shark's tail
      const surge = bt < 0 ? 0 : bt < 2 ? ease(bt / 2) : bt < 4.5 ? 1 : 1 - ease((bt - 4.5) / 1.5);
      for (let i = 0; i < 40; i++) { const a = hash(i), base = sx - 40 - a * 110, x = Math.min(lerp(base, sx - 4 - a * 26, surge), sx + 4) + Math.sin(t * 5 + i) * (2 + surge * 3), y = sy - 20 + hash(i + 9) * (SH + 40); spr(g, CAST.zombie(), x, y, t + i); }
      if (bt >= 0.6) { const k = ease((bt - 0.6) / 1), tx = c.x0 - 60 + c.p * 80 + 140, ty = c.floor - 40; spr(g, CAST.girl(), lerp(tx, sx + SW - 2, k), lerp(ty, sy + SH - 12, k) + Math.sin(t * 3) * 2, t); }
      if (bt > 1.6 && bt < 4.6) for (let k = 0; k < 3; k++) spark(g, sx + 2, sy + 10 + k * 9 + Math.round(Math.sin(t * 9 + k) * 2), '#e6f6fa');
    },
    pose(c) { const bt = c.bt; return bt < 0 || bt > 6 ? {} : { slow: 0.4, dy: bt > 1.6 && bt < 4.6 ? Math.round(Math.sin(t2(bt) * 9)) : 0 }; },
  },
  { // 5 · Resident Evil (2026, the night of the outbreak) — a dead city at night, red warning light, a searchlight, police
    //     lights, umbrella-shaped red-and-white jellyfish; the courier shark finds two survivors and they make a run for it
    id: 'raccoon', zh: '生化危机：爆发夜', en: 'Resident Evil', year: 2026, top: '#0b0d16', bot: '#22161e', sand: '#2c2228', env: { reef: 0.35, kelp: 0.3, life: 0.4 }, wipe: 'glitch', wipeCol: '#c4212e', form: 'raccoon', beat: { at: 0.32, dur: 7 },
    back(c) {
      const { g, h, floor, t } = c, bx = c.x0 * 0.5;
      for (let i = 0; i < 18; i++) { const bw = 14 + hash(i) * 18, bh = 40 + hash(i + 3) * 110, x = bx + i * 28; R(g, x, floor - bh, bw, bh, i % 2 ? '#171822' : '#1c1d28'); for (let j = 0; j < 10; j++) if (hash(i * 7 + j) > 0.7) R(g, x + 2 + (j % 3) * 4, floor - bh + 4 + Math.floor(j / 3) * 9, 2, 3, hash(j + i) > 0.5 ? '#e9c46a' : '#a8c4d8'); }
      const sw = Math.sin(t * 0.6) * 0.5; g.globalAlpha = 0.07; for (let y = 0; y < floor; y += 2) R(g, c.x0 + c.L * 0.5 + y * sw - y * 0.1, y, 6 + y * 0.18, 2, '#e6f0ff'); g.globalAlpha = 1; // searchlight
      const pulse = 0.5 + 0.5 * Math.sin(t * 4); g.globalAlpha = 0.16 * pulse; R(g, c.x0, 0, c.L, h, '#d42a36'); g.globalAlpha = 1;
      for (let i = 0; i < 7; i++) {
        const x = c.x0 + 30 + i * 58, y = h * (0.16 + hash(i) * 0.4) + Math.sin(t * 1.5 + i) * 4;
        for (let s = 0; s < 8; s++) { const col = s % 2 ? '#f2eeee' : '#c4212e'; for (let r = 0; r < 7; r++) R(g, x - 7 + s * 2 - Math.floor((7 - r) * (s - 3.5) / 7), y - 7 + r, 2, 1, col); }
        R(g, x - 8, y, 17, 1, '#f2eeee'); for (let k = 0; k < 4; k++) for (let j = 0; j < 6; j++) R(g, x - 6 + k * 4 + Math.round(Math.sin(t * 3 + j + k)), y + 2 + j * 2, 1, 1, '#d9b8bc');
      }
      const cx = c.x0 + c.L * 0.38; R(g, cx, floor - 10, 30, 8, '#2a2e3a'); R(g, cx + 6, floor - 15, 16, 6, '#2a2e3a'); R(g, cx + 8, floor - 14, 5, 4, '#4a5a6a'); R(g, cx + 10, floor - 17, 8, 2, Math.floor(t * 4) % 2 ? '#d42a36' : '#2a5ad4'); disc(g, cx + 6, floor - 2, 3, '#121218'); disc(g, cx + 24, floor - 2, 3, '#121218'); // a police car
      if (c.bt < 0.2) { spr(g, CAST.survA(), cx - 6, floor - 26, t); spr(g, CAST.survB(), cx + 26, floor - 24, t, true); }
    },
    front(c) {
      const { g, t, bt, sx, sy } = c; if (bt < 0) return;
      const k = ease((bt - 0.2) / 1.2), cx = c.x0 + c.L * 0.38;
      const ax = lerp(cx - 6, sx - 22, k), ay = lerp(c.floor - 26, sy + SH - 6, k), bx2 = lerp(cx + 26, sx - 16, k), by = lerp(c.floor - 24, sy - 8, k);
      if (bt > 0.4) { g.globalAlpha = 0.25; for (let i = 0; i < 18; i++) R(g, ax + 14 + i, ay + 4 - i * 0.3, 1, 2 + i * 0.6, '#fff2b0'); g.globalAlpha = 1; } // flashlight
      spr(g, CAST.survA(), ax, ay + Math.sin(t * 5) * 1.5, t * 2); spr(g, CAST.survB(), bx2, by + Math.sin(t * 5 + 1) * 1.5, t * 2);
      const lag = bt < 1 ? 1 : 1 + (bt - 1) * 12; // the horde comes out of the dark and falls behind as they run
      if (bt > 0.6 && bt < 7) for (let i = 0; i < 26; i++) { const a = hash(i * 2.1); spr(g, CAST.zombie(), sx - 60 - a * 80 - lag, sy - 26 + hash(i + 5) * (SH + 50) + Math.sin(t * 4 + i) * 3, t + i); }
    },
    pose(c) { const bt = c.bt; return bt > 1 && bt < 6 ? { boost: 46 } : {}; },
  },
  { // 6 · Kill Bill — the blue room (paper lattice, black silhouettes): masked fish in black suits charge and are cut down
    //     (they drift off in halves, no blood); then the snowy garden: a standoff with the white-kimono boss, one stroke, a bow
    id: 'bill', zh: '杀死比尔', en: 'Kill Bill', year: 2003, top: '#1d4fb8', bot: '#163a8a', sand: '#0f2350', env: { reef: 0.15, kelp: 0.1, life: 0.3 }, wipe: 'slash', wipeCol: '#f2c230', form: 'bill', beat: { at: 0.66, dur: 6 },
    back(c) {
      const { g, h, floor, t } = c, gx = c.x0 + c.L * 0.55;
      for (let x = 0; x < c.L * 0.55; x += 22) R(g, c.x0 + x, h * 0.08, 1, floor - h * 0.08, '#2f63cc');
      for (let y = h * 0.08; y < floor; y += 18) R(g, c.x0, y, c.L * 0.55, 1, '#2f63cc');
      R(g, c.x0, h * 0.08, c.L * 0.55, 3, '#0b1220'); R(g, c.x0, floor - 8, c.L * 0.55, 8, '#0b1220');
      for (let i = 0; i < 4; i++) { const x = c.x0 + 30 + i * 52; R(g, x, floor - 30, 2, 22, '#0b1220'); R(g, x - 6, floor - 30, 14, 2, '#0b1220'); } // balcony rail
      // the snowy garden (second half): pale sky, a stone lantern, a pond, a bare tree, snow
      for (let b = 0; b < 8; b++) R(g, gx, (floor * b) / 8, c.L * 0.45 + 2, floor / 8 + 1, mix('#dfe7f2', '#9fb0c8', b / 7));
      R(g, gx, floor - 6, c.L * 0.45, 8, '#f4f7fb'); R(g, gx + 40, floor - 3, 60, 3, '#8fa6c4');
      const lx = gx + 130; R(g, lx, floor - 30, 6, 30, '#7a8494'); R(g, lx - 6, floor - 34, 18, 4, '#5a6474'); R(g, lx - 3, floor - 42, 12, 8, '#7a8494'); R(g, lx, floor - 40, 6, 4, '#ffe9a8'); R(g, lx - 8, floor - 46, 22, 4, '#5a6474');
      const tx = gx + 20; for (let s = 0; s < 70; s++) R(g, tx + Math.sin(s * 0.08) * 3, floor - s, 3, 1, '#3a3f4a'); for (let k = 0; k < 4; k++) for (let s = 0; s < 26; s++) R(g, tx + (k % 2 ? 1 : -1) * s * 0.9, floor - 40 - k * 8 - s * 0.4, 1, 1, '#3a3f4a');
      for (let i = 0; i < 60; i++) R(g, gx + ((hash(i) * c.L * 0.45 + Math.sin(t + i) * 4) % (c.L * 0.45)), (hash(i + 3) * floor + t * (6 + hash(i) * 6) * (c.bt > 0 ? 1.8 : 1)) % floor, 1, 1, '#ffffff');
      // O-Ren's counterpart waits in the snow, facing the shark
      const bt = c.bt, ox = gx + c.L * 0.3, oy = lerp(h * 0.45, c.sy + 14, ease((c.p - 0.6) / 0.08));
      if (bt < 3.2) spr(g, CAST.oren(), ox, oy, bt >= 0 ? 0 : t, true);
      else { const k = bt - 3.2; spr(g, CAST.oren(), ox + k * 26, oy + Math.sin(Math.min(1, k) * Math.PI) * 4 - k * 14, t, true); R(g, ox + 8 + Math.sin(k * 3) * 4, oy - 6 + k * 18, 2, 1, '#c4212e'); } // bows, leaves; the hair stick falls
    },
    front(c) {
      const { g, t, bt, sx, sy } = c;
      if (c.p < 0.56) for (let i = 0; i < 12; i++) { // the Crazy 88 charge from ahead; cut when they reach the shark
        const x0 = c.x0 + 80 + i * 26, y = sy + 6 + ((i * 11) % (SH - 4)) - 6, x = Math.min(x0, c.x0 + c.L * 0.55) - ((t * 34 + i * 17) % 80), cut = x < sx + SW && x > sx - 16;
        if (!cut) spr(g, CAST.c88(), x, y, t + i, true);
        else { const d = sx + SW - x; spr(g, CAST.c88(), x, y - d * 0.35, t, true); g.globalAlpha = clamp(1 - d / 50); spr(g, CAST.c88(), x + 2, y + 3 + d * 0.35, t, true); g.globalAlpha = 1; R(g, sx + SW - 6, sy + SCY - 2, 10, 1, '#fffbe8'); }
      }
      if (bt > 2.9 && bt < 3.5) { const k = (bt - 2.9) / 0.6; g.globalAlpha = 1 - k; R(g, sx, sy + SCY - 1, c.w, 2, '#ffffff'); R(g, 0, 0, c.w, c.h, 'rgba(255,255,255,.35)'); g.globalAlpha = 1; }
    },
    pose(c) { const bt = c.bt; return bt < 0 || bt > 4.5 ? {} : { slow: bt < 3 ? 0.12 : 0.6 }; },
  },
  { // 7 · Mad Detective — a corridor of mirrors that crack as he passes; the detective shark (trench coat, hat) meets a
    //     suspect and sees his seven inner selves circling him; it picks out the true one (the small dark one hiding)
    id: 'mad', zh: '神探', en: 'Mad Detective', year: 2007, top: '#0e2224', bot: '#1d3a36', sand: '#26413a', env: { reef: 0.3, kelp: 0.3, life: 0.5 }, wipe: 'shards', wipeCol: '#cfe3df', form: 'mad', beat: { at: 0.4, dur: 6 },
    back(c) {
      const { g, h, floor, t } = c;
      for (let i = 0; i < 7; i++) { const x = c.x0 + 14 + i * 60, y = h * 0.14, mh = floor - y - 10; R(g, x, y, 32, mh, '#8fa9a3'); R(g, x + 2, y + 2, 28, mh - 4, '#2c4a46'); R(g, x + 4, y + 4, 3, mh - 8, '#3f625c'); R(g, x + 9, y + 4, 1, mh - 8, '#35554f');
        if (c.sx + SCX > x + 16) { const cx = x + 16, cy = y + mh * 0.45; for (let k = 0; k < 6; k++) { const a = k * 1.1 + i; for (let r = 0; r < 14; r++) R(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, 1, '#cfe3df'); } } }
      R(g, c.x0, floor - 2, c.L, 2, '#cfe3df');
      const bt = c.bt, sxw = c.x0 + c.L * 0.62, syw = lerp(h * 0.4, c.sy + 12, ease((c.p - 0.25) / 0.15));
      spr(g, CAST.suspect(), sxw, syw + (bt > 4 ? 3 : 0), t, true);
      if (bt > 0) {
        const fade = ease(bt / 1.2), pick = bt > 3, gone = bt > 3 ? clamp((bt - 3) / 0.8) : 0;
        for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + t * 0.6, x = sxw + 8 + Math.cos(a) * 30, y = syw + 4 + Math.sin(a) * 20; g.globalAlpha = fade * 0.75 * (1 - gone); spr(g, CAST.self(SELF[k]), x, y, t + k, true); if (pick && gone > 0) { g.globalAlpha = (1 - gone); disc(g, x + 6, y + 4, Math.round(gone * 6), '#e6f6fa'); } }
        g.globalAlpha = 1;
        const tx = sxw - 14, ty = syw + 18; // the true self, hiding under his chin
        if (bt < 4.6) { spr(g, npcFish('true', { w: 8, h: 6, body: '#3a2f3f', belly: '#5a4a5f', fin: '#2a1f2f' }), tx, ty, t); if (bt > 1.5) { const sel = bt < 3 ? Math.floor(bt * 5) % 8 : 7, a = sel / 7 * 6.283 + t * 0.6; const lx = sel === 7 ? tx + 5 : sxw + 14 + Math.cos(a) * 30, ly = sel === 7 ? ty + 4 : syw + 8 + Math.sin(a) * 20; ring(g, lx, ly, sel === 7 ? 10 + Math.sin(t * 6) : 9, '#fff6d8', t * 2, 22); } }
      }
    },
    pose(c) { return c.bt >= 0 && c.bt < 5 ? { slow: 0.25 } : {}; },
  },
  { // 8 · The Drama (2026) — the wedding where everything goes sideways: string lights, a flower arch, a champagne tower,
    //     guests; the cake topples into bubbles, the bride and groom spin, the bouquet flies — and the shark catches it
    id: 'drama', zh: '爱情抓马', en: 'The Drama', year: 2026, top: '#5a3d58', bot: '#e8b8b4', sand: '#f2d3c4', env: { reef: 0.5, kelp: 0.3 }, wipe: 'heart', wipeCol: '#fbe3e6', form: 'drama', beat: { at: 0.42, dur: 7 },
    back(c) {
      const { g, h, floor, t, bt } = c;
      for (const [yy, ph] of [[0.12, 0], [0.22, 1.5]]) for (let x = 0; x < c.L; x += 4) { const y = h * yy + Math.sin(x / c.L * 3.14 * 3 + ph) * 8; R(g, c.x0 + x, y, 1, 1, '#7a5a6a'); if (x % 12 === 0) R(g, c.x0 + x, y + 2, 2, 2, (x / 12 + Math.floor(t * 2)) % 3 ? '#ffe7a8' : '#fff7e0'); }
      const ax = c.x0 + c.L * 0.55 - 22; for (let a = 0; a <= 36; a++) { const ang = Math.PI * a / 36, x = ax + 26 - Math.cos(ang) * 26, y = floor - 56 - Math.sin(ang) * 26; R(g, x, y, 4, 4, a % 3 ? '#f4b6c2' : a % 2 ? '#fffaf4' : '#a8d0a0'); } R(g, ax, floor - 56, 3, 56, '#f4b6c2'); R(g, ax + 50, floor - 56, 3, 56, '#f4b6c2');
      for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) { const x = c.x0 + 20 + i * 18, y = floor - 10 - r * 9; R(g, x, y + 4, 10, 2, '#fffaf4'); R(g, x + 1, y + 6, 1, 4, '#d9b8a8'); R(g, x + 8, y + 6, 1, 4, '#d9b8a8'); } // chairs
      const scatter = bt > 0.4 ? ease((bt - 0.4) / 1.5) : 0;
      for (let i = 0; i < 14; i++) { const gx2 = c.x0 + 22 + (i % 7) * 18, gy = floor - 16 - Math.floor(i / 7) * 9; const a = hash(i) * 6.283; fish(g, gx2 + Math.cos(a) * scatter * 40 + Math.sin(t * 8 + i) * scatter * 2, gy + Math.sin(a) * scatter * 30 - scatter * 10, ['#f4a6a0', '#9fd6e0', '#f2d27a', '#c8a8e0'][i % 4], 1); }
      const tx = c.x0 + c.L * 0.3; for (let r = 0; r < 6; r++) for (let k = 0; k <= r; k++) { const x = tx - r * 4 + k * 8, y = floor - 48 + r * 8; R(g, x, y, 5, 4, '#f6e7b8'); R(g, x + 2, y + 4, 1, 3, '#fffaf0'); }
      const cx = c.x0 + c.L * 0.78, fall = bt < 0 ? 0 : ease(bt / 1.2);
      if (fall < 1) for (let r = 0; r < 4; r++) { const w = 36 - r * 8, y = floor - 10 - (r + 1) * 11; g.globalAlpha = 1 - fall; R(g, cx - w / 2 + fall * r * 12, y + fall * r * 8, w, 11, r % 2 ? '#fffaf4' : '#f8dbe0'); R(g, cx - w / 2 + fall * r * 12, y + fall * r * 8, w, 1, '#f4b6c2'); g.globalAlpha = 1; }
      if (fall > 0) for (let i = 0; i < 30; i++) { const a = hash(i); disc(g, cx + (a - 0.5) * 50, floor - 20 - fall * 70 * hash(i + 5) - ((t * 20 * (0.5 + a)) % 50), 1, '#fffaf4'); }
      // bride + groom under the arch (spin in the chaos)
      const sp = bt > 0.3 && bt < 2 ? Math.sin((bt - 0.3) * 9) : 0, bx = ax + 8, by = floor - 44;
      spr(g, CAST.groom(), bx + 14 - sp * 6, by + 2, t, sp > 0); spr(g, CAST.bride(), bx - 6 + sp * 6, by, t, sp <= 0 ? false : true);
    },
    front(c) {
      const { g, t, bt, sx, sy } = c; if (bt < 1.8) return;
      const bx = c.x0 + c.L * 0.55 - 14, by = c.floor - 44, mx = sx + AT.mouth.x, my = sy + AT.mouth.y, k = clamp((bt - 1.8) / 1.3);
      const x = k < 1 ? lerp(bx, mx, k) : mx, y = k < 1 ? lerp(by, my, k) - Math.sin(k * Math.PI) * 40 : my;
      R(g, x, y + 2, 1, 4, '#5a9a4a'); R(g, x + 2, y + 2, 1, 4, '#5a9a4a'); disc(g, x + 1, y, 3, '#f4b6c2'); R(g, x - 1, y - 1, 2, 2, '#fffaf4'); R(g, x + 2, y + 1, 2, 2, '#e58aa0'); R(g, x, y - 3, 2, 1, '#fffaf4');
      if (bt > 3.1 && bt < 6) for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + (bt - 3.1), r = 12 + (bt - 3.1) * 10; g.globalAlpha = clamp(1 - (bt - 3.1) / 2.9); heart(g, sx + SCX + Math.cos(a) * r, sy + SCY + Math.sin(a) * r * 0.7, i % 2 ? '#f4b6c2' : '#e58aa0'); g.globalAlpha = 1; }
    },
    pose(c) { const bt = c.bt; return bt < 0 || bt > 5 ? {} : { slow: 0.35, dy: bt > 2.9 && bt < 3.4 ? -4 : 0 }; },
  },
  { // 9 · Still Life — the quiet one: grey-blue water, marine snow, old photographs drifting; a clerk with his album; one
    //     small grey fish alone. The shark (plain, a narrow tie) stops by it; it takes colour and follows; others join
    id: 'still', zh: '寂静人生', en: 'Still Life', year: 2013, top: '#1a2430', bot: '#4a5866', sand: '#5d6874', env: { reef: 0.4, kelp: 0.4, life: 0.4 }, wipe: 'dither', wipeCol: '#9aa6b2', form: 'still', beat: { at: 0.34, dur: 6 },
    back(c) {
      const { g, h, floor, t, bt } = c;
      for (let i = 0; i < 90; i++) R(g, c.x0 + ((hash(i) * c.L + Math.sin(t * 0.3 + i) * 5) % c.L), (hash(i + 40) * h + t * (3 + hash(i) * 4)) % floor, 1, 1, '#c9d2da');
      for (let i = 0; i < 7; i++) { const x = c.x0 + 30 + i * 56, y = h * (0.16 + hash(i * 3) * 0.5) + Math.sin(t * 0.6 + i) * 3, warm = bt > 3 + i * 0.3; R(g, x, y, 16, 13, '#e9e6dc'); R(g, x + 2, y + 2, 12, 8, warm ? '#c9a46a' : '#8b949c'); disc(g, x + 8, y + 5, 2, warm ? '#f6e2a8' : '#b5bcc2'); }
      for (let i = 0; i < 9; i++) { const x = c.x0 + c.L * 0.68 + i * 7; R(g, x, floor - 14 - (i % 3) * 3, 5, 14 + (i % 3) * 3, '#7a848e'); R(g, x + 1, floor - 13 - (i % 3) * 3, 3, 1, '#9aa4ae'); } // a small row of headstones
      const lx = c.x0 + c.L * 0.5, ly = lerp(floor - 20, c.sy + 18, ease((c.p - 0.25) / 0.09)), k = bt < 1.4 ? 0 : clamp((bt - 1.4) / 1.4);
      if (bt < 3) { spr(g, CAST.lonely(), lx, ly + (bt > 0 && bt < 1.4 ? Math.round(Math.sin(bt * 6)) : 0), t * 0.5, true); if (k > 0) { g.globalAlpha = k; spr(g, CAST.found(), lx, ly, t * 0.5, true); g.globalAlpha = 1; } }
      const cx = c.x0 + c.L * 0.6, cy = h * 0.38 + Math.sin(t * 0.5) * 3; spr(g, CAST.clerk(), cx + (bt > 3 ? (bt - 3) * -10 : 0), cy, t * 0.5, true);
    },
    pose(c) { const bt = c.bt; return bt < 0 || bt > 3.2 ? {} : { slow: 0.2 }; },
  },
];
function t2(v: number) { return v; }
export { SW, SH };
